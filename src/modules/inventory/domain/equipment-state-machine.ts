import { ItemStatus, ItemCondition, Role } from "@prisma/client";

export interface StatusTransitionRequest {
  currentStatus: ItemStatus;
  targetStatus: ItemStatus;
  returnedCondition?: ItemCondition;
  actorRoles: Role[];
}

export interface TransitionValidationResult {
  valid: boolean;
  error?: string;
  nextStatus?: ItemStatus;
}

/**
 * Validates whether an equipment status transition is permitted according to
 * Constitution v1.1.0 Domain Integrity Constraints and Module 2 rules:
 * - Status enum: AVAILABLE, ON_LOAN, UNDER_MAINTENANCE, RETIRED.
 * - Checkout permitted ONLY from AVAILABLE.
 * - Return permitted ONLY from ON_LOAN.
 * - RETIRED is terminal.
 * - At most one active loan per serialized asset.
 */
export function validateEquipmentStatusTransition(
  request: StatusTransitionRequest
): TransitionValidationResult {
  const { currentStatus, targetStatus, actorRoles } = request;

  // 1. Invariant: RETIRED is strictly terminal
  if (currentStatus === ItemStatus.RETIRED) {
    return {
      valid: false,
      error: "Terminal State Invariant: Retired equipment cannot be transitioned to any other status.",
    };
  }

  // 2. Same status is a no-op
  if (currentStatus === targetStatus) {
    return { valid: true, nextStatus: targetStatus };
  }

  // 3. Checkout workflow: AVAILABLE -> ON_LOAN
  if (targetStatus === ItemStatus.ON_LOAN) {
    if (currentStatus !== ItemStatus.AVAILABLE) {
      return {
        valid: false,
        error: `Checkout is only permitted for items in AVAILABLE status. Current status is ${currentStatus}.`,
      };
    }

    const hasCheckoutAuth = actorRoles.some((r) =>
      r === Role.ADMIN || r === Role.COACH || r === Role.AD_HOC_COACH
    );

    if (!hasCheckoutAuth) {
      return {
        valid: false,
        error: "Unauthorized: Only Admins, Coaches, and Ad-Hoc Coaches can check out equipment.",
      };
    }

    return { valid: true, nextStatus: ItemStatus.ON_LOAN };
  }

  // 4. Check-in / Return workflows: ON_LOAN -> AVAILABLE or UNDER_MAINTENANCE
  if (currentStatus === ItemStatus.ON_LOAN) {
    const hasReturnAuth = actorRoles.some((r) =>
      r === Role.ADMIN || r === Role.COACH || r === Role.AD_HOC_COACH
    );

    if (!hasReturnAuth) {
      return {
        valid: false,
        error: "Unauthorized: Only Admins, Coaches, and Ad-Hoc Coaches can check in returned equipment.",
      };
    }

    // ON_LOAN -> RETIRED (Lost or written off while on loan)
    if (targetStatus === ItemStatus.RETIRED) {
      const isAdmin = actorRoles.includes(Role.ADMIN);
      if (!isAdmin) {
        return {
          valid: false,
          error: "Unauthorized: Only Administrators can write off or retire loaned equipment.",
        };
      }
      return { valid: true, nextStatus: ItemStatus.RETIRED };
    }

    // Return to AVAILABLE or UNDER_MAINTENANCE
    if (targetStatus === ItemStatus.AVAILABLE || targetStatus === ItemStatus.UNDER_MAINTENANCE) {
      return { valid: true, nextStatus: targetStatus };
    }

    return {
      valid: false,
      error: `Invalid transition from ON_LOAN to ${targetStatus}.`,
    };
  }

  // 5. Maintenance workflows: AVAILABLE -> UNDER_MAINTENANCE
  if (currentStatus === ItemStatus.AVAILABLE && targetStatus === ItemStatus.UNDER_MAINTENANCE) {
    const hasMaintenanceAuth = actorRoles.some((r) => r === Role.ADMIN || r === Role.COACH);
    if (!hasMaintenanceAuth) {
      return {
        valid: false,
        error: "Unauthorized: Only Admins and Coaches can route equipment for maintenance.",
      };
    }
    return { valid: true, nextStatus: ItemStatus.UNDER_MAINTENANCE };
  }

  // 6. Maintenance completion: UNDER_MAINTENANCE -> AVAILABLE or RETIRED
  if (currentStatus === ItemStatus.UNDER_MAINTENANCE) {
    if (targetStatus === ItemStatus.AVAILABLE) {
      const hasRepairAuth = actorRoles.some((r) => r === Role.ADMIN || r === Role.COACH);
      if (!hasRepairAuth) {
        return {
          valid: false,
          error: "Unauthorized: Only Admins and Coaches can mark maintenance complete.",
        };
      }
      return { valid: true, nextStatus: ItemStatus.AVAILABLE };
    }

    if (targetStatus === ItemStatus.RETIRED) {
      const isAdmin = actorRoles.includes(Role.ADMIN);
      if (!isAdmin) {
        return {
          valid: false,
          error: "Unauthorized: Only Administrators can retire decommissioned equipment.",
        };
      }
      return { valid: true, nextStatus: ItemStatus.RETIRED };
    }

    return {
      valid: false,
      error: `Invalid transition from UNDER_MAINTENANCE to ${targetStatus}.`,
    };
  }

  // 7. Direct retirement: AVAILABLE -> RETIRED
  if (currentStatus === ItemStatus.AVAILABLE && targetStatus === ItemStatus.RETIRED) {
    const isAdmin = actorRoles.includes(Role.ADMIN);
    if (!isAdmin) {
      return {
        valid: false,
        error: "Unauthorized: Only Administrators can retire club equipment.",
      };
    }
    return { valid: true, nextStatus: ItemStatus.RETIRED };
  }

  return {
    valid: false,
    error: `Forbidden transition from ${currentStatus} to ${targetStatus}.`,
  };
}

/**
 * Determines the target equipment status upon check-in based on the inspected condition.
 */
export function determineCheckinStatus(returnCondition: ItemCondition): ItemStatus {
  switch (returnCondition) {
    case ItemCondition.NEW:
    case ItemCondition.GOOD:
    case ItemCondition.FAIR:
      return ItemStatus.AVAILABLE;
    case ItemCondition.NEEDS_REPAIR:
      return ItemStatus.UNDER_MAINTENANCE;
    case ItemCondition.RETIRED:
      return ItemStatus.RETIRED;
    default:
      return ItemStatus.AVAILABLE;
  }
}
