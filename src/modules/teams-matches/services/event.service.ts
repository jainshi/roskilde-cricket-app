import { prisma } from "@/lib/db";
import {
  CreateScheduledEventInput,
  UpdateScheduledEventInput,
  UpdateEventLifecycleStatusInput,
  CreateRecurringTrainingScheduleInput,
  InviteEventParticipantsInput,
} from "../contracts/event.contract";
import {
  evaluateFacilityConflict,
  TimeInterval,
} from "../domain/facility-conflicts";
import { calculateAgeOnCutoff } from "../domain/age-eligibility";
import { notificationService } from "@/modules/auth-rbac/notifications/notification.service";
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
  userRsvp?: {
    status: string;
    transportNote: string | null;
  } | null;
  canReply?: boolean;
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

  // 2. Fetch Active Roster Members of the Squad with skill attributes for RSVP Initialization
  const squad = await prisma.teamSquad.findUnique({
    where: { id: input.teamSquadId },
    include: {
      roster: {
        where: { isActive: true },
        include: {
          memberProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              battingPosition: true,
              bowlingStyle: true,
              secondaryRoles: true,
            },
          },
        },
      },
    },
  });

  if (!squad) {
    throw new Error("Specified squad does not exist.");
  }

  // Determine eligible participant IDs based on filter / invited list
  let targetMemberIds: string[] = [];

  if (input.invitedMemberIds && input.invitedMemberIds.length > 0) {
    // Explicit custom participant selection (can include squad members and invited guests)
    targetMemberIds = Array.from(new Set(input.invitedMemberIds));
  } else if (input.participantFilter === "BATSMEN") {
    // Eligible batsmen preset (e.g. for special batting sessions)
    const batsmen = squad.roster.filter((r) => {
      const p = r.memberProfile;
      return (
        (p.battingPosition && p.battingPosition !== "TAILENDER") ||
        p.secondaryRoles.includes("ALL_ROUNDER")
      );
    });
    targetMemberIds = (batsmen.length > 0 ? batsmen : squad.roster).map(
      (r) => r.memberProfileId
    );
  } else if (input.participantFilter === "BOWLERS") {
    // Eligible bowlers preset (pace/spin bowlers or all-rounders)
    const bowlers = squad.roster.filter((r) => {
      const p = r.memberProfile;
      return (
        (p.bowlingStyle && p.bowlingStyle !== "DOES_NOT_BOWL") ||
        p.secondaryRoles.includes("ALL_ROUNDER")
      );
    });
    targetMemberIds = (bowlers.length > 0 ? bowlers : squad.roster).map(
      (r) => r.memberProfileId
    );
  } else if (input.participantFilter === "WICKETKEEPERS") {
    // Wicketkeepers preset
    const keepers = squad.roster.filter((r) =>
      r.memberProfile.secondaryRoles.includes("WICKETKEEPER")
    );
    targetMemberIds = (keepers.length > 0 ? keepers : squad.roster).map(
      (r) => r.memberProfileId
    );
  } else {
    // Default ALL_SQUAD (e.g. all U13 players for U13 squad session)
    targetMemberIds = squad.roster.map((r) => r.memberProfileId);
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

    // 4. Seed NO_RESPONSE RSVPs for all eligible participants
    if (targetMemberIds.length > 0) {
      await tx.eventRsvp.createMany({
        data: targetMemberIds.map((mId) => ({
          scheduledEventId: event.id,
          memberProfileId: mId,
          submittedById: callerProfileId,
          status: "NO_RESPONSE" as const,
        })),
        skipDuplicates: true,
      });
    }

    return event;
  });

  // 5. Send Email Notifications to invited participants and linked parents
  let notifiedCount = 0;
  if (input.notifyParticipants !== false && targetMemberIds.length > 0) {
    const facility = input.facilityId
      ? await prisma.clubFacility.findUnique({
          where: { id: input.facilityId },
          select: { name: true },
        })
      : null;

    notifiedCount = await sendEventInvitations(
      {
        id: createdEvent.id,
        title: createdEvent.title,
        eventType: createdEvent.eventType,
        matchType: createdEvent.matchType,
        trainingType: createdEvent.trainingType,
        startAt: createdEvent.startAt,
        endAt: createdEvent.endAt,
        meetAt: createdEvent.meetAt,
        venueName: createdEvent.venueName,
        venueAddress: createdEvent.venueAddress,
        facilityName: facility?.name ?? null,
        rsvpDeadlineAt: createdEvent.rsvpDeadlineAt,
        squadName: squad.name,
      },
      targetMemberIds
    );
  }

  return {
    success: true,
    event: createdEvent,
    warning: warningMessage,
    participantCount: targetMemberIds.length,
    notifiedCount,
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
          roster: {
            where: { isActive: true },
            select: {
              memberProfileId: true,
              rosterRole: true,
              jerseyNumber: true,
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
  replyOnlyForMemberProfileId?: string;
  currentMemberProfileId?: string;
}): Promise<ScheduledEventSummary[]> {
  const where: any = {};

  if (params.teamSquadId) where.teamSquadId = params.teamSquadId;
  if (params.facilityId) where.facilityId = params.facilityId;
  if (params.eventType) where.eventType = params.eventType;
  if (params.lifecycleStatus) where.lifecycleStatus = params.lifecycleStatus;

  if (params.replyOnlyForMemberProfileId) {
    where.OR = [
      {
        rsvps: {
          some: {
            memberProfileId: params.replyOnlyForMemberProfileId,
          },
        },
      },
      {
        teamSquad: {
          roster: {
            some: {
              memberProfileId: params.replyOnlyForMemberProfileId,
              isActive: true,
            },
          },
        },
      },
    ];
  }

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
        select: {
          id: true,
          name: true,
          category: true,
          roster: {
            select: {
              memberProfileId: true,
              isActive: true,
            },
          },
        },
      },
      facility: {
        select: { id: true, name: true },
      },
      rsvps: {
        select: {
          memberProfileId: true,
          status: true,
          transportNote: true,
        },
      },
    },
  });

  const memberIdToCheck =
    params.replyOnlyForMemberProfileId || params.currentMemberProfileId;

  return events.map((event) => {
    const rsvpStats = {
      total: event.rsvps.length,
      available: event.rsvps.filter((r) => r.status === "AVAILABLE").length,
      unavailable: event.rsvps.filter((r) => r.status === "UNAVAILABLE").length,
      maybe: event.rsvps.filter((r) => r.status === "MAYBE").length,
      noResponse: event.rsvps.filter((r) => r.status === "NO_RESPONSE").length,
    };

    const userRsvpRecord = memberIdToCheck
      ? event.rsvps.find((r) => r.memberProfileId === memberIdToCheck)
      : undefined;

    const isMemberRostered = memberIdToCheck
      ? event.teamSquad.roster.some(
          (r) => r.memberProfileId === memberIdToCheck && r.isActive
        )
      : false;

    const canReply = Boolean(userRsvpRecord || isMemberRostered);

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
      userRsvp: userRsvpRecord
        ? {
            status: userRsvpRecord.status,
            transportNote: userRsvpRecord.transportNote,
          }
        : null,
      canReply,
    };
  });
}

/**
 * Creates a recurring weekly training schedule across one or more squads
 * (e.g. Indoor training every Sunday 08:00-10:00 for U13 & U15, or Saturday 10:00-12:00 for seniors).
 */
export async function createRecurringTrainingSchedule(
  input: CreateRecurringTrainingScheduleInput,
  callerProfileId: string,
  callerRole: "ADMIN" | "COACH" | "AD_HOC_COACH" | "PLAYER" | "PARENT"
) {
  // 1. Fetch targeted squads and active rosters
  const squads = await prisma.teamSquad.findMany({
    where: { id: { in: input.teamSquadIds }, isActive: true },
    include: {
      roster: {
        where: { isActive: true },
        select: { memberProfileId: true },
      },
    },
  });

  if (squads.length === 0) {
    throw new Error("No active squads found for the specified IDs.");
  }

  // 2. Compute matching dates between startDate and endDate
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  const daysSet = new Set(input.daysOfWeek);

  const matchedDates: Date[] = [];
  const current = new Date(startDate);
  current.setHours(12, 0, 0, 0);
  const endComp = new Date(endDate);
  endComp.setHours(23, 59, 59, 999);

  while (current <= endComp) {
    if (daysSet.has(current.getDay())) {
      matchedDates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  if (matchedDates.length === 0) {
    throw new Error(
      "No calendar dates match the selected days of week in this date range."
    );
  }

  // 3. If facility is reserved, fetch existing non-cancelled events
  let existingBookings: TimeInterval[] = [];
  if (input.facilityId) {
    const rawEvents = await prisma.scheduledEvent.findMany({
      where: {
        facilityId: input.facilityId,
        lifecycleStatus: { not: "CANCELLED" },
        startAt: {
          gte: new Date(startDate.getTime() - 24 * 60 * 60 * 1000),
          lte: new Date(endDate.getTime() + 48 * 60 * 60 * 1000),
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

    existingBookings = rawEvents.map((e) => ({
      id: e.id,
      facilityId: e.facilityId!,
      facilityName: e.facility?.name,
      title: e.title,
      startAt: e.startAt,
      endAt: e.endAt,
      lifecycleStatus: e.lifecycleStatus,
    }));
  }

  // 4. Generate events for each date
  let createdCount = 0;
  let skippedCount = 0;
  const [startH, startM] = input.startTime.split(":").map(Number);
  const [endH, endM] = input.endTime.split(":").map(Number);
  const [meetH, meetM] = input.meetTime
    ? input.meetTime.split(":").map(Number)
    : [null, null];

  for (const dateObj of matchedDates) {
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth();
    const d = dateObj.getDate();

    const startAt = new Date(y, m, d, startH, startM, 0, 0);
    const endAt = new Date(y, m, d, endH, endM, 0, 0);
    const meetAt =
      meetH !== null && meetM !== null ? new Date(y, m, d, meetH, meetM, 0, 0) : null;
    const rsvpDeadlineAt = new Date(
      startAt.getTime() - input.rsvpHoursBefore * 60 * 60 * 1000
    );
    const dateOnly = new Date(y, m, d, 0, 0, 0, 0);

    // Collision check against pre-existing facility bookings
    let hasConflict = false;

    if (input.facilityId) {
      const conflictResult = evaluateFacilityConflict({
        candidate: { facilityId: input.facilityId, startAt, endAt },
        existingEvents: existingBookings,
        userRole: callerRole,
        collisionOverrideReason: input.collisionOverrideReason,
      });

      if (conflictResult.hasConflict) {
        if (!conflictResult.isAllowed) {
          if (input.skipConflictingDates) {
            skippedCount++;
            continue;
          } else {
            throw new Error(
              `Conflict on ${dateOnly.toLocaleDateString()}: ${conflictResult.reason}`
            );
          }
        } else if (conflictResult.isOverride) {
          hasConflict = true;
        }
      }
    }

    const squadNames = squads.map((s) => s.name).join(" & ");
    const defaultLabel =
      input.trainingType === "INDOOR_WINTER"
        ? "Indoor Winter Training"
        : input.trainingType === "NET_PRACTICE"
        ? "Net Practice"
        : input.trainingType === "FIELDING_FITNESS"
        ? "Fielding & Fitness"
        : "Open Nets";

    for (const squad of squads) {
      const sessionTitle = input.titlePrefix
        ? squads.length > 1
          ? `${input.titlePrefix.trim()} (${squadNames})`
          : input.titlePrefix.trim()
        : `${squad.name} ${defaultLabel}`;

      await prisma.$transaction(async (tx) => {
        const ev = await tx.scheduledEvent.create({
          data: {
            teamSquadId: squad.id,
            facilityId: input.facilityId ?? null,
            eventType: "TRAINING",
            trainingType: input.trainingType,
            title: sessionTitle,
            date: dateOnly,
            meetAt,
            startAt,
            endAt,
            isHome: true,
            rsvpDeadlineAt,
            targetLineupSize: squad.defaultLineupSize,
            createdById: callerProfileId,
            ...(hasConflict && {
              collisionOverrideById: callerProfileId,
              collisionOverrideReason: input.collisionOverrideReason,
              collisionOverrideAt: new Date(),
            }),
          },
        });

        if (squad.roster.length > 0) {
          await tx.eventRsvp.createMany({
            data: squad.roster.map((r) => ({
              scheduledEventId: ev.id,
              memberProfileId: r.memberProfileId,
              submittedById: callerProfileId,
              status: "NO_RESPONSE" as const,
            })),
            skipDuplicates: true,
          });
        }
      });

      createdCount++;
    }
  }

  return {
    success: true,
    createdCount,
    skippedCount,
    totalDatesEvaluated: matchedDates.length,
  };
}

/**
 * Sends event invitation emails with 1-tap RSVP links to the specified participants
 * (routing to parents if participant is minor).
 */
export async function sendEventInvitations(
  event: {
    id: string;
    title: string;
    eventType: EventType;
    matchType?: string | null;
    trainingType?: string | null;
    startAt: Date;
    endAt: Date;
    meetAt?: Date | null;
    venueName?: string | null;
    venueAddress?: string | null;
    facilityName?: string | null;
    rsvpDeadlineAt: Date;
    squadName: string;
  },
  memberProfileIds: string[]
): Promise<number> {
  if (memberProfileIds.length === 0) return 0;

  const participants = await prisma.memberProfile.findMany({
    where: { id: { in: memberProfileIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      email: true,
      parentLinksAsPlayer: {
        include: {
          parent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  const eventDateFormatted = new Date(event.startAt).toLocaleDateString("en-DK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const startTime = new Date(event.startAt).toLocaleTimeString("en-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = new Date(event.endAt).toLocaleTimeString("en-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const deadlineFormatted = new Date(event.rsvpDeadlineAt).toLocaleDateString("en-DK", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const venueDesc =
    event.facilityName ||
    event.venueName ||
    event.venueAddress ||
    "Poppelgårdsvej Cricket Ground";

  let notifiedCount = 0;
  const currentYear = new Date().getFullYear();

  for (const p of participants) {
    let isMinor = false;
    if (p.dateOfBirth) {
      try {
        const age = calculateAgeOnCutoff(p.dateOfBirth, currentYear);
        if (age < 18) isMinor = true;
      } catch {
        // Fallback
      }
    }
    if (p.parentLinksAsPlayer && p.parentLinksAsPlayer.length > 0) {
      isMinor = true;
    }

    if (isMinor && p.parentLinksAsPlayer && p.parentLinksAsPlayer.length > 0) {
      for (const link of p.parentLinksAsPlayer) {
        if (link.parent?.email) {
          await notificationService.sendEmail({
            to: link.parent.email,
            subject: `RSVP Needed: ${event.title} for ${p.firstName}`,
            html: `
              <h2>Roskilde Cricket Club - Event Invitation</h2>
              <p>Dear ${link.parent.firstName},</p>
              <p>A new ${event.eventType === "MATCH" ? "match fixture" : "training session"} has been scheduled for <strong>${p.firstName} ${p.lastName}</strong> with the <strong>${event.squadName}</strong>:</p>
              <div style="background:#0f172a;color:#f8fafc;padding:16px;border-radius:12px;margin:16px 0;border:1px solid #334155;">
                <p style="margin:4px 0;"><strong>Event:</strong> ${event.title}</p>
                <p style="margin:4px 0;"><strong>Squad:</strong> ${event.squadName}</p>
                <p style="margin:4px 0;"><strong>Date:</strong> ${eventDateFormatted} (${startTime} – ${endTime})</p>
                <p style="margin:4px 0;"><strong>Venue:</strong> ${venueDesc}</p>
                <p style="margin:4px 0;color:#f59e0b;"><strong>RSVP Cutoff:</strong> ${deadlineFormatted}</p>
              </div>
              <p>Please log in to the RCC portal and submit your child's availability:</p>
              <p><a href="/events/${event.id}" style="display:inline-block;background:#0284c7;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Submit 1-Tap RSVP</a></p>
            `,
          });
          notifiedCount++;
        }
      }
    } else if (p.email) {
      await notificationService.sendEmail({
        to: p.email,
        subject: `RSVP Invitation: ${event.title}`,
        html: `
          <h2>Roskilde Cricket Club - Event Invitation</h2>
          <p>Hi ${p.firstName},</p>
          <p>You have been invited to participate in <strong>${event.title}</strong> with the <strong>${event.squadName}</strong>:</p>
          <div style="background:#0f172a;color:#f8fafc;padding:16px;border-radius:12px;margin:16px 0;border:1px solid #334155;">
            <p style="margin:4px 0;"><strong>Event:</strong> ${event.title}</p>
            <p style="margin:4px 0;"><strong>Squad:</strong> ${event.squadName}</p>
            <p style="margin:4px 0;"><strong>Date:</strong> ${eventDateFormatted} (${startTime} – ${endTime})</p>
            <p style="margin:4px 0;"><strong>Venue:</strong> ${venueDesc}</p>
            <p style="margin:4px 0;color:#f59e0b;"><strong>RSVP Cutoff:</strong> ${deadlineFormatted}</p>
          </div>
          <p>Please confirm your availability (Available / Maybe / Unavailable):</p>
          <p><a href="/events/${event.id}" style="display:inline-block;background:#0284c7;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Submit 1-Tap RSVP</a></p>
        `,
      });
      notifiedCount++;
    }
  }

  return notifiedCount;
}

/**
 * Invites additional participants to an existing event and creates NO_RESPONSE RSVPs.
 */
export async function inviteEventParticipants(
  input: InviteEventParticipantsInput,
  callerProfileId: string
) {
  const event = await prisma.scheduledEvent.findUnique({
    where: { id: input.scheduledEventId },
    include: {
      teamSquad: { select: { name: true } },
      facility: { select: { name: true } },
    },
  });

  if (!event) throw new Error("Event not found");

  const memberIds = Array.from(new Set(input.memberProfileIds));

  // Create NO_RESPONSE RSVPs for any participants not yet added
  await prisma.eventRsvp.createMany({
    data: memberIds.map((mId) => ({
      scheduledEventId: event.id,
      memberProfileId: mId,
      submittedById: callerProfileId,
      status: "NO_RESPONSE" as const,
    })),
    skipDuplicates: true,
  });

  let notifiedCount = 0;
  if (input.notifyParticipants !== false) {
    notifiedCount = await sendEventInvitations(
      {
        id: event.id,
        title: event.title,
        eventType: event.eventType,
        matchType: event.matchType,
        trainingType: event.trainingType,
        startAt: event.startAt,
        endAt: event.endAt,
        meetAt: event.meetAt,
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        facilityName: event.facility?.name ?? null,
        rsvpDeadlineAt: event.rsvpDeadlineAt,
        squadName: event.teamSquad.name,
      },
      memberIds
    );
  }

  return {
    success: true,
    invitedCount: memberIds.length,
    notifiedCount,
  };
}

