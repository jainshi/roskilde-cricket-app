/**
 * Domain module: RSVP Evaluator & Cutoff Deadline Enforcement
 * Implements Clarification #2:
 * - All scheduled events (matches & recurring training) initialize roster members with explicit NO_RESPONSE.
 * - Enforces RSVP cutoff deadline: self-service edits by players/parents are locked when now() >= rsvpDeadlineAt.
 * - Coaches and Administrators retain pitch-side override capability to update player availability after cutoff.
 * - Validates parental delegation: parents can submit RSVPs for linked minor players.
 */

export type RsvpStatusValue = "NO_RESPONSE" | "AVAILABLE" | "UNAVAILABLE" | "MAYBE";

export interface EventRsvpContext {
  scheduledEventId: string;
  rsvpDeadlineAt: Date | string;
  isCancelled?: boolean;
}

export interface SubmitRsvpEvaluationParams {
  event: EventRsvpContext;
  playerProfileId: string;
  callerProfileId: string;
  callerRole: "ADMIN" | "COACH" | "AD_HOC_COACH" | "PLAYER" | "PARENT";
  linkedParentProfileIds?: string[];
  newStatus: RsvpStatusValue;
  currentTime?: Date | string;
}

export interface RsvpEvaluationResult {
  isAllowed: boolean;
  isLocked: boolean;
  isDelegated: boolean;
  reason: string;
}

/**
 * Checks if the RSVP cutoff deadline has passed.
 */
export function isRsvpCutoffPassed(
  deadline: Date | string,
  currentTime: Date | string = new Date()
): boolean {
  const deadlineTime = new Date(deadline).getTime();
  const now = new Date(currentTime).getTime();
  return now >= deadlineTime;
}

/**
 * Evaluates whether an RSVP submission or update is permitted.
 */
export function evaluateRsvpSubmission({
  event,
  playerProfileId,
  callerProfileId,
  callerRole,
  linkedParentProfileIds = [],
  newStatus,
  currentTime = new Date(),
}: SubmitRsvpEvaluationParams): RsvpEvaluationResult {
  if (event.isCancelled) {
    return {
      isAllowed: false,
      isLocked: true,
      isDelegated: false,
      reason: "Cannot submit RSVP for a cancelled event.",
    };
  }

  // 1. Authorization & Delegation Check
  const isSelf = callerProfileId === playerProfileId;
  const isLinkedParent = linkedParentProfileIds.includes(callerProfileId);
  const isStaff = callerRole === "ADMIN" || callerRole === "COACH" || callerRole === "AD_HOC_COACH";

  if (!isSelf && !isLinkedParent && !isStaff) {
    return {
      isAllowed: false,
      isLocked: false,
      isDelegated: false,
      reason: "You do not have permission to submit an RSVP for this player.",
    };
  }

  const isDelegated = !isSelf && isLinkedParent;

  // 2. Cutoff Deadline Check
  const cutoffPassed = isRsvpCutoffPassed(event.rsvpDeadlineAt, currentTime);

  if (cutoffPassed) {
    // Staff (Coach/Admin) can override after cutoff
    if (isStaff) {
      return {
        isAllowed: true,
        isLocked: true,
        isDelegated,
        reason: "RSVP accepted via Coach/Admin pitch-side override after deadline.",
      };
    }

    // Players and parents are locked out after cutoff
    return {
      isAllowed: false,
      isLocked: true,
      isDelegated,
      reason: "The RSVP cutoff deadline for this event has passed. Please contact the team Coach directly.",
    };
  }

  return {
    isAllowed: true,
    isLocked: false,
    isDelegated,
    reason: `RSVP updated to ${newStatus} successfully.`,
  };
}

/**
 * Generates initial NO_RESPONSE RSVP records for a list of rostered members upon event publication.
 */
export function initializeRosterRsvps(
  scheduledEventId: string,
  rosterMemberProfileIds: string[]
): Array<{ scheduledEventId: string; memberProfileId: string; submittedById: string; status: "NO_RESPONSE" }> {
  return rosterMemberProfileIds.map((memberProfileId) => ({
    scheduledEventId,
    memberProfileId,
    submittedById: memberProfileId,
    status: "NO_RESPONSE" as const,
  }));
}
