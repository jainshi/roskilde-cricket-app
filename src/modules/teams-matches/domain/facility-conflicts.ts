/**
 * Domain module: Facility & Ground Booking Collision Detector
 * Implements Clarification #3:
 * - Two events sharing the same physical facilityId collide if their [startAt, endAt] intervals overlap.
 * - Overlap condition: max(A.start, B.start) < min(A.end, B.end).
 * - For regular COACH / AD_HOC_COACH: Collisions are strictly hard-blocked.
 * - For ADMIN: Collisions may be overridden provided an explicit override reason (min 5 chars) is supplied.
 */

export interface TimeInterval {
  id?: string;
  facilityId: string;
  facilityName?: string;
  title: string;
  startAt: Date | string;
  endAt: Date | string;
  lifecycleStatus?: string; // "SCHEDULED" | "PLAYED" | "RAINED_OUT" | "CANCELLED"
}

export interface ConflictEvaluationParams {
  candidate: {
    id?: string;
    facilityId?: string | null;
    startAt: Date | string;
    endAt: Date | string;
  };
  existingEvents: TimeInterval[];
  userRole: "ADMIN" | "COACH" | "AD_HOC_COACH" | "PLAYER" | "PARENT";
  collisionOverrideReason?: string | null;
}

export interface ConflictEvaluationResult {
  hasConflict: boolean;
  isAllowed: boolean;
  isOverride: boolean;
  conflictingEvent?: TimeInterval;
  reason: string;
  warning?: string;
}

/**
 * Checks if two time intervals overlap.
 * Boundaries touching (e.g. A ends exactly when B starts) are considered non-overlapping.
 */
export function doIntervalsOverlap(
  startA: Date | string,
  endA: Date | string,
  startB: Date | string,
  endB: Date | string
): boolean {
  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();

  if (sA >= eA || sB >= eB) {
    throw new Error("Invalid interval: startAt must be earlier than endAt.");
  }

  // Overlap occurs if the maximum of start times is strictly less than the minimum of end times
  return Math.max(sA, sB) < Math.min(eA, eB);
}

/**
 * Evaluates facility collision for a candidate event against existing bookings.
 */
export function evaluateFacilityConflict({
  candidate,
  existingEvents,
  userRole,
  collisionOverrideReason,
}: ConflictEvaluationParams): ConflictEvaluationResult {
  // If no facility is reserved (e.g. away match without club ground booking), no facility conflict
  if (!candidate.facilityId) {
    return {
      hasConflict: false,
      isAllowed: true,
      isOverride: false,
      reason: "No club facility requested. Conflict check passed.",
    };
  }

  const candidateStart = new Date(candidate.startAt);
  const candidateEnd = new Date(candidate.endAt);

  if (candidateStart.getTime() >= candidateEnd.getTime()) {
    return {
      hasConflict: false,
      isAllowed: false,
      isOverride: false,
      reason: "Event start time must be earlier than end time.",
    };
  }

  // Find overlapping event on the same facility
  const conflictingEvent = existingEvents.find((event) => {
    // Skip the candidate event itself when updating
    if (candidate.id && event.id === candidate.id) {
      return false;
    }

    // Skip if different facility
    if (event.facilityId !== candidate.facilityId) {
      return false;
    }

    // Ignore cancelled events
    if (event.lifecycleStatus === "CANCELLED") {
      return false;
    }

    return doIntervalsOverlap(
      candidateStart,
      candidateEnd,
      new Date(event.startAt),
      new Date(event.endAt)
    );
  });

  // No conflict detected
  if (!conflictingEvent) {
    return {
      hasConflict: false,
      isAllowed: true,
      isOverride: false,
      reason: "Facility is available for the requested time slot.",
    };
  }

  // Collision detected! Apply role-based policy
  const eventDesc = `"${conflictingEvent.title}" (${new Date(conflictingEvent.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(conflictingEvent.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`;

  // Admin override path
  if (userRole === "ADMIN") {
    const trimmedReason = collisionOverrideReason?.trim() || "";
    if (trimmedReason.length >= 5) {
      return {
        hasConflict: true,
        isAllowed: true,
        isOverride: true,
        conflictingEvent,
        reason: `Facility collision with ${eventDesc} acknowledged and overridden by Administrator.`,
        warning: `Admin override applied: overlapping with ${eventDesc}. Rationale: "${trimmedReason}"`,
      };
    }

    return {
      hasConflict: true,
      isAllowed: false,
      isOverride: false,
      conflictingEvent,
      reason: `Facility collision detected with ${eventDesc}. Administrator must provide an override reason (min 5 characters) to proceed.`,
    };
  }

  // Regular Coach / Ad-Hoc Coach / Other Roles: Hard block
  return {
    hasConflict: true,
    isAllowed: false,
    isOverride: false,
    conflictingEvent,
    reason: `Facility collision: Ground or facility is already booked by ${eventDesc}. Regular coaches cannot override overlapping reservations.`,
  };
}
