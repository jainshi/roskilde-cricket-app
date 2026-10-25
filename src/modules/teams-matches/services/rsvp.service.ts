import { prisma } from "@/lib/db";
import { SubmitEventRsvpInput, UpdateTransportNoteInput } from "../contracts/rsvp.contract";
import {
  evaluateRsvpSubmission,
  isRsvpCutoffPassed,
  RsvpStatusValue,
} from "../domain/rsvp-evaluator";
import { validateDelegationAccess } from "@/modules/auth-rbac/domain/delegation-rules";

export interface PlayerRsvpStatus {
  hasRsvp: boolean;
  status: RsvpStatusValue;
  transportNote: string | null;
  submittedAt: Date | null;
  submittedById: string | null;
  isDelegated: boolean;
  isLocked: boolean;
  canEdit: boolean;
  cutoffDeadline: Date;
}

/**
 * Submits or updates a 1-tap player availability RSVP.
 * Enforces parental delegation rules and cutoff deadline locks.
 */
export async function submitEventRsvp(
  input: SubmitEventRsvpInput,
  callerProfileId: string,
  callerRoles: string[]
) {
  // 1. Fetch Event
  const event = await prisma.scheduledEvent.findUnique({
    where: { id: input.scheduledEventId },
    select: {
      id: true,
      title: true,
      rsvpDeadlineAt: true,
      lifecycleStatus: true,
      teamSquadId: true,
    },
  });

  if (!event) {
    throw new Error("Event not found.");
  }

  // 2. Fetch Caller's Linked Children for Parental Delegation Check
  const parentLinks = await prisma.parentChildLink.findMany({
    where: { parentId: callerProfileId },
    select: { playerId: true },
  });
  const linkedChildIds = parentLinks.map((l) => l.playerId);

  // 3. Parental Delegation Verification (FR-040, FR-041, FR-051)
  const delegation = validateDelegationAccess(
    {
      profileId: callerProfileId,
      roles: callerRoles,
      linkedChildIds,
    },
    input.memberProfileId
  );

  if (!delegation.authorized) {
    throw new Error(
      delegation.reason || "You do not have authorization to submit an RSVP for this player."
    );
  }

  // 4. Resolve Caller's Effective Role
  const isStaff =
    callerRoles.includes("ADMIN") ||
    callerRoles.includes("COACH") ||
    callerRoles.includes("AD_HOC_COACH");

  const effectiveCallerRole = callerRoles.includes("ADMIN")
    ? "ADMIN"
    : isStaff
    ? "COACH"
    : delegation.isDelegated
    ? "PARENT"
    : "PLAYER";

  // 5. Evaluate Cutoff Lock & Submission Rules via Domain Logic
  const evaluation = evaluateRsvpSubmission({
    event: {
      scheduledEventId: event.id,
      rsvpDeadlineAt: event.rsvpDeadlineAt,
      isCancelled: event.lifecycleStatus === "CANCELLED",
    },
    playerProfileId: input.memberProfileId,
    callerProfileId,
    callerRole: effectiveCallerRole,
    linkedParentProfileIds: linkedChildIds.includes(input.memberProfileId)
      ? [callerProfileId]
      : [],
    newStatus: input.status as RsvpStatusValue,
    currentTime: new Date(),
  });

  if (!evaluation.isAllowed) {
    throw new Error(evaluation.reason);
  }

  // 6. Upsert the RSVP record
  const rsvp = await prisma.eventRsvp.upsert({
    where: {
      scheduledEventId_memberProfileId: {
        scheduledEventId: input.scheduledEventId,
        memberProfileId: input.memberProfileId,
      },
    },
    create: {
      scheduledEventId: input.scheduledEventId,
      memberProfileId: input.memberProfileId,
      submittedById: callerProfileId,
      status: input.status,
      transportNote: input.transportNote ?? null,
      submittedAt: new Date(),
    },
    update: {
      submittedById: callerProfileId,
      status: input.status,
      ...(input.transportNote !== undefined && {
        transportNote: input.transportNote ?? null,
      }),
      submittedAt: new Date(),
    },
  });

  return {
    success: true,
    rsvp,
    isDelegated: evaluation.isDelegated,
    isOverride: evaluation.isLocked && isStaff,
    message: evaluation.reason,
  };
}

/**
 * Updates only the transport/carpooling note for a player
 */
export async function updateTransportNote(
  input: UpdateTransportNoteInput,
  callerProfileId: string,
  callerRoles: string[]
) {
  const event = await prisma.scheduledEvent.findUnique({
    where: { id: input.scheduledEventId },
    select: { rsvpDeadlineAt: true, lifecycleStatus: true },
  });
  if (!event) throw new Error("Event not found.");

  const parentLinks = await prisma.parentChildLink.findMany({
    where: { parentId: callerProfileId },
    select: { playerId: true },
  });
  const linkedChildIds = parentLinks.map((l) => l.playerId);

  const delegation = validateDelegationAccess(
    { profileId: callerProfileId, roles: callerRoles, linkedChildIds },
    input.memberProfileId
  );
  if (!delegation.authorized) throw new Error("Unauthorized.");

  return await prisma.eventRsvp.upsert({
    where: {
      scheduledEventId_memberProfileId: {
        scheduledEventId: input.scheduledEventId,
        memberProfileId: input.memberProfileId,
      },
    },
    create: {
      scheduledEventId: input.scheduledEventId,
      memberProfileId: input.memberProfileId,
      submittedById: callerProfileId,
      status: "NO_RESPONSE",
      transportNote: input.transportNote ?? null,
    },
    update: {
      transportNote: input.transportNote ?? null,
    },
  });
}

/**
 * Retrieves a player's RSVP status for an event, factoring in cutoff lock and delegation.
 */
export async function getPlayerEventRsvp(
  scheduledEventId: string,
  targetProfileId: string,
  callerProfileId: string,
  callerRoles: string[]
): Promise<PlayerRsvpStatus> {
  const [event, rsvp, parentLinks] = await Promise.all([
    prisma.scheduledEvent.findUnique({
      where: { id: scheduledEventId },
      select: { rsvpDeadlineAt: true, lifecycleStatus: true },
    }),
    prisma.eventRsvp.findUnique({
      where: {
        scheduledEventId_memberProfileId: {
          scheduledEventId,
          memberProfileId: targetProfileId,
        },
      },
      include: {
        submittedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),
    prisma.parentChildLink.findMany({
      where: { parentId: callerProfileId },
      select: { playerId: true },
    }),
  ]);

  if (!event) {
    throw new Error("Event not found.");
  }

  const linkedChildIds = parentLinks.map((l) => l.playerId);
  const isLinkedChild = linkedChildIds.includes(targetProfileId);
  const isSelf = callerProfileId === targetProfileId;
  const isStaff =
    callerRoles.includes("ADMIN") ||
    callerRoles.includes("COACH") ||
    callerRoles.includes("AD_HOC_COACH");

  const cutoffPassed = isRsvpCutoffPassed(event.rsvpDeadlineAt);
  const isLocked = cutoffPassed && !isStaff;
  const canEdit = (isSelf || isLinkedChild || isStaff) && (!cutoffPassed || isStaff);

  return {
    hasRsvp: Boolean(rsvp),
    status: (rsvp?.status as RsvpStatusValue) || "NO_RESPONSE",
    transportNote: rsvp?.transportNote || null,
    submittedAt: rsvp?.submittedAt || null,
    submittedById: rsvp?.submittedById || null,
    isDelegated: isLinkedChild && !isSelf,
    isLocked: cutoffPassed,
    canEdit,
    cutoffDeadline: event.rsvpDeadlineAt,
  };
}
