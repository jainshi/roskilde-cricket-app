import { VolunteerDutyType, VolunteerSlotStatus } from "@prisma/client";

export interface VolunteerSlotState {
  id: string;
  eventId: string;
  dutyType: VolunteerDutyType;
  title: string;
  status: VolunteerSlotStatus;
  assignedProfileId: string | null;
  claimedAt?: Date | null;
  swapRequestedAt?: Date | null;
  swapReason?: string | null;
  carpoolSeats?: number | null;
}

export interface ClaimValidationResult {
  valid: boolean;
  error?: string;
  hasLineupWarning?: boolean;
  warningMessage?: string;
}

export interface SwapRequestResult {
  valid: boolean;
  error?: string;
  updatedSlot?: Partial<VolunteerSlotState>;
}

export interface SwapAcceptResult {
  valid: boolean;
  error?: string;
  updatedSlot?: Partial<VolunteerSlotState>;
}

export interface EventVolunteerFulfillment {
  totalSlots: number;
  filledSlots: number;
  openSlots: number;
  swapRequestedSlots: number;
  isFullyStaffed: boolean;
  badgeLabel: string;
  badgeVariant: "success" | "warning" | "destructive" | "neutral";
}

/**
 * Pure domain evaluator: Validates whether a member can claim an open volunteer duty slot,
 * checking slot availability and match Playing XI lineup conflicts.
 */
export function validateDutyClaim(
  slot: VolunteerSlotState,
  memberProfileId: string,
  isPlayingInMatchLineup: boolean = false
): ClaimValidationResult {
  if (slot.status === VolunteerSlotStatus.CLAIMED && slot.assignedProfileId) {
    return {
      valid: false,
      error: "This volunteer duty slot is already claimed.",
    };
  }

  // Lineup conflict check: Players confirmed in Playing XI should not umpire or score
  const isInGameDuty =
    slot.dutyType === VolunteerDutyType.SCORING ||
    slot.dutyType === VolunteerDutyType.UMPIRING;

  if (isPlayingInMatchLineup && isInGameDuty) {
    return {
      valid: true,
      hasLineupWarning: true,
      warningMessage: `You are confirmed in the Playing XI lineup for this match. Officiating (${slot.title}) is typically handled by non-playing members or parents.`,
    };
  }

  return { valid: true };
}

/**
 * Pure domain evaluator: Transitions a claimed duty slot to SWAP_REQUESTED.
 */
export function requestDutySwap(
  slot: VolunteerSlotState,
  requesterProfileId: string,
  reason: string,
  now: Date = new Date()
): SwapRequestResult {
  if (slot.status === VolunteerSlotStatus.OPEN) {
    return {
      valid: false,
      error: "Cannot request a swap for an open, unassigned slot.",
    };
  }

  if (slot.status === VolunteerSlotStatus.SWAP_REQUESTED) {
    return {
      valid: false,
      error: "A swap has already been requested for this duty slot.",
    };
  }

  if (slot.assignedProfileId !== requesterProfileId) {
    return {
      valid: false,
      error: "Only the currently assigned volunteer can request a duty swap.",
    };
  }

  if (!reason.trim()) {
    return {
      valid: false,
      error: "A reason is required when requesting a duty swap.",
    };
  }

  return {
    valid: true,
    updatedSlot: {
      status: VolunteerSlotStatus.SWAP_REQUESTED,
      swapRequestedAt: now,
      swapReason: reason.trim(),
    },
  };
}

/**
 * Pure domain evaluator: Accepts an open duty swap, reassigning the slot to the new volunteer.
 */
export function acceptDutySwap(
  slot: VolunteerSlotState,
  newVolunteerProfileId: string,
  now: Date = new Date()
): SwapAcceptResult {
  if (slot.status !== VolunteerSlotStatus.SWAP_REQUESTED) {
    return {
      valid: false,
      error: "This duty slot is not currently pending a swap request.",
    };
  }

  if (slot.assignedProfileId === newVolunteerProfileId) {
    return {
      valid: false,
      error: "You are already the assigned volunteer for this duty slot.",
    };
  }

  return {
    valid: true,
    updatedSlot: {
      status: VolunteerSlotStatus.CLAIMED,
      assignedProfileId: newVolunteerProfileId,
      claimedAt: now,
      swapRequestedAt: null,
      swapReason: null,
    },
  };
}

/**
 * Pure domain evaluator: Calculates volunteer staffing fulfillment and UI badge indicators for an event.
 */
export function calculateEventVolunteerFulfillment(
  slots: VolunteerSlotState[]
): EventVolunteerFulfillment {
  const totalSlots = slots.length;

  if (totalSlots === 0) {
    return {
      totalSlots: 0,
      filledSlots: 0,
      openSlots: 0,
      swapRequestedSlots: 0,
      isFullyStaffed: true,
      badgeLabel: "No Duties Required",
      badgeVariant: "neutral",
    };
  }

  let filledCount = 0;
  let swapRequestedCount = 0;
  let openCount = 0;

  for (const slot of slots) {
    if (slot.status === VolunteerSlotStatus.SWAP_REQUESTED) {
      swapRequestedCount++;
    } else if (slot.status === VolunteerSlotStatus.CLAIMED && slot.assignedProfileId) {
      filledCount++;
    } else {
      openCount++;
    }
  }

  if (swapRequestedCount > 0) {
    return {
      totalSlots,
      filledSlots: filledCount,
      openSlots: openCount,
      swapRequestedSlots: swapRequestedCount,
      isFullyStaffed: false,
      badgeLabel: `Swap Requested (${swapRequestedCount})`,
      badgeVariant: "warning",
    };
  }

  if (openCount > 0) {
    return {
      totalSlots,
      filledSlots: filledCount,
      openSlots: openCount,
      swapRequestedSlots: 0,
      isFullyStaffed: false,
      badgeLabel: `Volunteers Needed (${filledCount}/${totalSlots})`,
      badgeVariant: filledCount === 0 ? "destructive" : "warning",
    };
  }

  return {
    totalSlots,
    filledSlots: filledCount,
    openSlots: 0,
    swapRequestedSlots: 0,
    isFullyStaffed: true,
    badgeLabel: `Duties Filled (${totalSlots}/${totalSlots})`,
    badgeVariant: "success",
  };
}
