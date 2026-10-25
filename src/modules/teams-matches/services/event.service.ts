import { prisma } from "@/lib/db";
import {
  CreateScheduledEventInput,
  UpdateScheduledEventInput,
  UpdateEventLifecycleStatusInput,
} from "../contracts/event.contract";
import {
  evaluateFacilityConflict,
  TimeInterval,
} from "../domain/facility-conflicts";
import { EventLifecycleStatus, EventType } from "@prisma/client";

export interface ScheduledEventSummary {
  id: string;
  teamSquadId: string;
  squadName: string;
  squadCategory: string;
  facilityId: string | null;
  facilityName: string | null;
  eventType: EventType;
  matchType: string | null;
  trainingType: string | null;
  title: string;
  date: Date;
  meetAt: Date | null;
  startAt: Date;
  endAt: Date;
  isHome: boolean;
  opponentName: string | null;
  venueName: string | null;
  venueAddress: string | null;
  rsvpDeadlineAt: Date;
  targetLineupSize: number;
  lifecycleStatus: EventLifecycleStatus;
  scorecardUrl: string | null;
  hasCollisionOverride: boolean;
  rsvpStats: {
    total: number;
    available: number;
    unavailable: number;
    maybe: number;
    noResponse: number;
  };
}

/**
 * Creates a scheduled event (fixture or training session).
 * Enforces facility collision checks and seeds NO_RESPONSE RSVPs for squad roster.
 */
export async function createScheduledEvent(
  input: CreateScheduledEventInput,
  callerProfileId: string,
  callerRole: "ADMIN" | "COACH" | "AD_HOC_COACH" | "PLAYER" | "PARENT"
) {
  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);
  const date = new Date(input.date);
  const rsvpDeadlineAt = new Date(input.rsvpDeadlineAt);
  const meetAt = input.meetAt ? new Date(input.meetAt) : null;

  // 1. Facility Conflict Evaluation
  let isOverride = false;
  let overrideReason: string | null = null;
  let warningMessage: string | undefined = undefined;

  if (input.facilityId) {
    const existingEvents = await prisma.scheduledEvent.findMany({
      where: {
        facilityId: input.facilityId,
        lifecycleStatus: { not: "CANCELLED" },
        startAt: {
          gte: new Date(startAt.getTime() - 24 * 60 * 60 * 1000),
          lte: new Date(endAt.getTime() + 24 * 60 * 60 * 1000),
        },
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

    const conflictResult = evaluateFacilityConflict({
      candidate: {
        facilityId: input.facilityId,
        startAt,
        endAt,
      },
      existingEvents: formattedEvents,
      userRole: callerRole,
      collisionOverrideReason: input.collisionOverrideReason,
    });

    if (!conflictResult.isAllowed) {
      throw new Error(conflictResult.reason);
    }

    if (conflictResult.isOverride) {
      isOverride = true;
      overrideReason = input.collisionOverrideReason?.trim() || null;
      warningMessage = conflictResult.warning;
    }
  }

  // 2. Fetch Active Roster Members of the Squad for RSVP Initialization
  const squad = await prisma.teamSquad.findUnique({
    where: { id: input.teamSquadId },
    include: {
      roster: {
        where: { isActive: true },
        select: { memberProfileId: true },
      },
    },
  });

  if (!squad) {
    throw new Error("Specified squad does not exist.");
  }

  // 3. Create Event in Database
  const createdEvent = await prisma.$transaction(async (tx) => {
    const event = await tx.scheduledEvent.create({
      data: {
        teamSquadId: input.teamSquadId,
        facilityId: input.facilityId ?? null,
        eventType: input.eventType,
        matchType: input.matchType ?? null,
        trainingType: input.trainingType ?? null,
        title: input.title,
        date,
        meetAt,
        startAt,
        endAt,
        isHome: input.isHome ?? true,
        opponentName: input.opponentName ?? null,
        venueName: input.venueName ?? null,
        venueAddress: input.venueAddress ?? null,
        rsvpDeadlineAt,
        targetLineupSize: input.targetLineupSize ?? 11,
        scorecardUrl: input.scorecardUrl || null,
        linkedEquipmentLoanId: input.linkedEquipmentLoanId ?? null,
        createdById: callerProfileId,
        ...(isOverride && {
          collisionOverrideById: callerProfileId,
          collisionOverrideReason: overrideReason,
          collisionOverrideAt: new Date(),
        }),
      },
    });

    // 4. Seed NO_RESPONSE RSVPs for all active roster members
    if (squad.roster.length > 0) {
      await tx.eventRsvp.createMany({
        data: squad.roster.map((r) => ({
          scheduledEventId: event.id,
          memberProfileId: r.memberProfileId,
          submittedById: callerProfileId,
          status: "NO_RESPONSE" as const,
        })),
        skipDuplicates: true,
      });
    }

    return event;
  });

  return {
    success: true,
    event: createdEvent,
    warning: warningMessage,
  };
}

/**
 * Updates an existing scheduled event.
 */
export async function updateScheduledEvent(
  input: UpdateScheduledEventInput,
  callerProfileId: string,
  callerRole: "ADMIN" | "COACH" | "AD_HOC_COACH" | "PLAYER" | "PARENT"
) {
  const currentEvent = await prisma.scheduledEvent.findUnique({
    where: { id: input.id },
  });

  if (!currentEvent) {
    throw new Error("Scheduled event not found.");
  }

  const facilityId =
    input.facilityId !== undefined ? input.facilityId : currentEvent.facilityId;
  const startAt = input.startAt ? new Date(input.startAt) : currentEvent.startAt;
  const endAt = input.endAt ? new Date(input.endAt) : currentEvent.endAt;

  // Conflict check if time or facility changes
  let isOverride = false;
  let overrideReason: string | null = null;

  if (facilityId) {
    const existingEvents = await prisma.scheduledEvent.findMany({
      where: {
        facilityId,
        lifecycleStatus: { not: "CANCELLED" },
        startAt: {
          gte: new Date(startAt.getTime() - 24 * 60 * 60 * 1000),
          lte: new Date(endAt.getTime() + 24 * 60 * 60 * 1000),
        },
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

    const conflictResult = evaluateFacilityConflict({
      candidate: {
        id: currentEvent.id,
        facilityId,
        startAt,
        endAt,
      },
      existingEvents: formattedEvents,
      userRole: callerRole,
      collisionOverrideReason: input.collisionOverrideReason,
    });

    if (!conflictResult.isAllowed) {
      throw new Error(conflictResult.reason);
    }

    if (conflictResult.isOverride) {
      isOverride = true;
      overrideReason = input.collisionOverrideReason?.trim() || null;
    }
  }

  const updated = await prisma.scheduledEvent.update({
    where: { id: input.id },
    data: {
      ...(input.facilityId !== undefined && { facilityId: input.facilityId }),
      ...(input.eventType !== undefined && { eventType: input.eventType }),
      ...(input.matchType !== undefined && { matchType: input.matchType }),
      ...(input.trainingType !== undefined && { trainingType: input.trainingType }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.date !== undefined && { date: new Date(input.date) }),
      ...(input.meetAt !== undefined && {
        meetAt: input.meetAt ? new Date(input.meetAt) : null,
      }),
      ...(input.startAt !== undefined && { startAt }),
      ...(input.endAt !== undefined && { endAt }),
      ...(input.isHome !== undefined && { isHome: input.isHome }),
      ...(input.opponentName !== undefined && { opponentName: input.opponentName }),
      ...(input.venueName !== undefined && { venueName: input.venueName }),
      ...(input.venueAddress !== undefined && { venueAddress: input.venueAddress }),
      ...(input.rsvpDeadlineAt !== undefined && {
        rsvpDeadlineAt: new Date(input.rsvpDeadlineAt),
      }),
      ...(input.targetLineupSize !== undefined && {
        targetLineupSize: input.targetLineupSize,
      }),
      ...(input.scorecardUrl !== undefined && {
        scorecardUrl: input.scorecardUrl || null,
      }),
      ...(input.linkedEquipmentLoanId !== undefined && {
        linkedEquipmentLoanId: input.linkedEquipmentLoanId,
      }),
      ...(isOverride && {
        collisionOverrideById: callerProfileId,
        collisionOverrideReason: overrideReason,
        collisionOverrideAt: new Date(),
      }),
    },
  });

  return updated;
}

/**
 * Updates event lifecycle status (SCHEDULED, PLAYED, RAINED_OUT, CANCELLED).
 */
export async function updateEventLifecycleStatus(
  input: UpdateEventLifecycleStatusInput
) {
  return await prisma.scheduledEvent.update({
    where: { id: input.id },
    data: {
      lifecycleStatus: input.lifecycleStatus,
    },
  });
}

/**
 * Retrieves a single scheduled event with full relationships.
 */
export async function getScheduledEventById(id: string) {
  const event = await prisma.scheduledEvent.findUnique({
    where: { id },
    include: {
      teamSquad: {
        include: {
          coachAssignments: {
            include: {
              coachProfile: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      },
      facility: true,
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      collisionOverrideBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      linkedEquipmentLoan: {
        include: {
          equipmentItem: true,
        },
      },
      rsvps: {
        include: {
          memberProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
              battingPosition: true,
              bowlingStyle: true,
            },
          },
          submittedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: [
          { memberProfile: { lastName: "asc" } },
          { memberProfile: { firstName: "asc" } },
        ],
      },
      matchSelection: {
        include: {
          selectedPlayers: {
            include: {
              memberProfile: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
            orderBy: [{ selectionRole: "asc" }, { battingOrderPosition: "asc" }],
          },
        },
      },
    },
  });

  return event;
}

/**
 * Lists scheduled events with filters and RSVP aggregated counts.
 */
export async function listScheduledEvents(params: {
  teamSquadId?: string;
  facilityId?: string;
  fromDate?: Date;
  toDate?: Date;
  eventType?: EventType;
  lifecycleStatus?: EventLifecycleStatus;
}): Promise<ScheduledEventSummary[]> {
  const where: any = {};

  if (params.teamSquadId) where.teamSquadId = params.teamSquadId;
  if (params.facilityId) where.facilityId = params.facilityId;
  if (params.eventType) where.eventType = params.eventType;
  if (params.lifecycleStatus) where.lifecycleStatus = params.lifecycleStatus;

  if (params.fromDate || params.toDate) {
    where.startAt = {};
    if (params.fromDate) where.startAt.gte = params.fromDate;
    if (params.toDate) where.startAt.lte = params.toDate;
  }

  const events = await prisma.scheduledEvent.findMany({
    where,
    orderBy: { startAt: "asc" },
    include: {
      teamSquad: {
        select: { id: true, name: true, category: true },
      },
      facility: {
        select: { id: true, name: true },
      },
      rsvps: {
        select: { status: true },
      },
    },
  });

  return events.map((event) => {
    const rsvpStats = {
      total: event.rsvps.length,
      available: event.rsvps.filter((r) => r.status === "AVAILABLE").length,
      unavailable: event.rsvps.filter((r) => r.status === "UNAVAILABLE").length,
      maybe: event.rsvps.filter((r) => r.status === "MAYBE").length,
      noResponse: event.rsvps.filter((r) => r.status === "NO_RESPONSE").length,
    };

    return {
      id: event.id,
      teamSquadId: event.teamSquadId,
      squadName: event.teamSquad.name,
      squadCategory: event.teamSquad.category,
      facilityId: event.facilityId,
      facilityName: event.facility?.name ?? null,
      eventType: event.eventType,
      matchType: event.matchType,
      trainingType: event.trainingType,
      title: event.title,
      date: event.date,
      meetAt: event.meetAt,
      startAt: event.startAt,
      endAt: event.endAt,
      isHome: event.isHome,
      opponentName: event.opponentName,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      rsvpDeadlineAt: event.rsvpDeadlineAt,
      targetLineupSize: event.targetLineupSize,
      lifecycleStatus: event.lifecycleStatus,
      scorecardUrl: event.scorecardUrl,
      hasCollisionOverride: Boolean(event.collisionOverrideById),
      rsvpStats,
    };
  });
}
