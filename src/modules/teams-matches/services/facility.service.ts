import { prisma } from "@/lib/db";
import {
  CreateFacilityInput,
  UpdateFacilityInput,
  CheckFacilityConflictInput,
} from "../contracts/event.contract";
import {
  evaluateFacilityConflict,
  ConflictEvaluationResult,
  TimeInterval,
} from "../domain/facility-conflicts";

/**
 * Lists all club facilities with optional active filter and upcoming event count.
 */
export async function listFacilities(activeOnly: boolean = false) {
  const where = activeOnly ? { isActive: true } : {};
  const now = new Date();

  const facilities = await prisma.clubFacility.findMany({
    where,
    orderBy: [{ facilityType: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          scheduledEvents: {
            where: {
              startAt: { gte: now },
              lifecycleStatus: { not: "CANCELLED" },
            },
          },
        },
      },
    },
  });

  return facilities;
}

/**
 * Gets a single facility by ID along with its upcoming bookings.
 */
export async function getFacilityById(id: string) {
  const facility = await prisma.clubFacility.findUnique({
    where: { id },
    include: {
      scheduledEvents: {
        where: {
          startAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Include recent 24h
        },
        orderBy: { startAt: "asc" },
        include: {
          teamSquad: {
            select: { id: true, name: true, category: true },
          },
        },
      },
    },
  });

  return facility;
}

/**
 * Creates a new club facility (Admins only).
 */
export async function createFacility(input: CreateFacilityInput) {
  return await prisma.clubFacility.create({
    data: {
      name: input.name,
      facilityType: input.facilityType,
      location: input.location ?? null,
      capacity: input.capacity ?? null,
      isActive: input.isActive ?? true,
    },
  });
}

/**
 * Updates a club facility.
 */
export async function updateFacility(input: UpdateFacilityInput) {
  const { id, ...data } = input;
  return await prisma.clubFacility.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.facilityType !== undefined && { facilityType: data.facilityType }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.capacity !== undefined && { capacity: data.capacity }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

/**
 * Retrieves all bookings for a facility between two dates.
 */
export async function getFacilityBookings(
  facilityId: string,
  fromDate?: Date,
  toDate?: Date
) {
  const where: any = {
    facilityId,
    lifecycleStatus: { not: "CANCELLED" },
  };

  if (fromDate || toDate) {
    where.startAt = {};
    if (fromDate) where.startAt.gte = fromDate;
    if (toDate) where.startAt.lte = toDate;
  }

  return await prisma.scheduledEvent.findMany({
    where,
    orderBy: { startAt: "asc" },
    include: {
      teamSquad: {
        select: { id: true, name: true, category: true },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

/**
 * Preflight conflict check for UI or service validation.
 */
export async function checkFacilityConflictPreflight(
  input: CheckFacilityConflictInput,
  userRole: "ADMIN" | "COACH" | "AD_HOC_COACH" | "PLAYER" | "PARENT",
  overrideReason?: string | null
): Promise<ConflictEvaluationResult> {
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);

  // Fetch all non-cancelled events on this facility that could overlap
  // Query a window around the requested interval: from 24h before start to 24h after end
  const queryWindowStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const queryWindowEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000);

  const existingEvents = await prisma.scheduledEvent.findMany({
    where: {
      facilityId: input.facilityId,
      lifecycleStatus: { not: "CANCELLED" },
      startAt: { gte: queryWindowStart, lte: queryWindowEnd },
    },
    select: {
      id: true,
      facilityId: true,
      title: true,
      startAt: true,
      endAt: true,
      lifecycleStatus: true,
      facility: { select: { name: true } },
    },
  });

  const formattedEvents: TimeInterval[] = existingEvents.map((e) => ({
    id: e.id,
    facilityId: e.facilityId!,
    facilityName: e.facility?.name,
    title: e.title,
    startAt: e.startAt,
    endAt: e.endAt,
    lifecycleStatus: e.lifecycleStatus,
  }));

  return evaluateFacilityConflict({
    candidate: {
      id: input.excludeEventId ?? undefined,
      facilityId: input.facilityId,
      startAt: start,
      endAt: end,
    },
    existingEvents: formattedEvents,
    userRole,
    collisionOverrideReason: overrideReason,
  });
}
