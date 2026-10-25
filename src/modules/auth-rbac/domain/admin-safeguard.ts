/**
 * Domain rules and safeguards for Administrator role and account management (FR-005).
 * "System MUST always retain at least one active Admin; removing the last Admin role or
 * deactivating the last Admin account MUST be refused."
 */

export interface AdminSafeguardContext {
  activeAdminCount: number;
  isTargetActiveAdmin: boolean;
}

export class LastAdminSafeguardError extends Error {
  constructor(
    message = "Operation refused: The system must retain at least one active Administrator (FR-005)."
  ) {
    super(message);
    this.name = "LastAdminSafeguardError";
  }
}

/**
 * Checks whether the Admin role can be removed from a member.
 */
export function canRemoveAdminRole(ctx: AdminSafeguardContext): boolean {
  if (!ctx.isTargetActiveAdmin) {
    return true;
  }
  return ctx.activeAdminCount > 1;
}

/**
 * Checks whether an account can be deactivated without leaving 0 active admins.
 */
export function canDeactivateAccount(ctx: AdminSafeguardContext): boolean {
  if (!ctx.isTargetActiveAdmin) {
    return true;
  }
  return ctx.activeAdminCount > 1;
}

/**
 * Asserts that removing an Admin role or deactivating an account will not violate FR-005.
 * Throws LastAdminSafeguardError if refused.
 */
export function assertCanModifyAdminStatus(
  action: "REVOKE_ROLE" | "DEACTIVATE_ACCOUNT",
  ctx: AdminSafeguardContext
): void {
  const allowed =
    action === "REVOKE_ROLE"
      ? canRemoveAdminRole(ctx)
      : canDeactivateAccount(ctx);

  if (!allowed) {
    throw new LastAdminSafeguardError();
  }
}
