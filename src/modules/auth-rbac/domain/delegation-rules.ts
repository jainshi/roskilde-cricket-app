/**
 * Pure domain rules for delegation and profile editing authorization (FR-040, FR-041, FR-051).
 */

export interface DelegationActor {
  profileId: string;
  roles: string[];
  linkedChildIds: string[];
}

export interface DelegationCheckResult {
  authorized: boolean;
  reason?: string;
  isDelegated: boolean;
}

/**
 * Validates whether an actor has authority to view or edit a target member profile.
 * - Self: Always authorized (not delegated).
 * - Admin: Always authorized across all profiles (FR-051).
 * - Parent: Authorized for linked youth players (FR-040, FR-041, FR-051) (delegated).
 * - Unauthorized: Attempting to act on unlinked youth or other adult members.
 */
export function validateDelegationAccess(
  actor: DelegationActor,
  targetProfileId: string
): DelegationCheckResult {
  if (!actor || !actor.profileId) {
    return {
      authorized: false,
      isDelegated: false,
      reason: "Actor context is missing.",
    };
  }

  // 1. Self access
  if (actor.profileId === targetProfileId) {
    return {
      authorized: true,
      isDelegated: false,
    };
  }

  // 2. Admin access (override across all profiles)
  if (actor.roles.includes("ADMIN")) {
    return {
      authorized: true,
      isDelegated: true,
      reason: "Administrator access.",
    };
  }

  // 3. Parent delegation on linked youth
  if (actor.linkedChildIds.includes(targetProfileId)) {
    return {
      authorized: true,
      isDelegated: true,
      reason: "Parent delegation for linked youth player.",
    };
  }

  // 4. Unauthorized
  return {
    authorized: false,
    isDelegated: false,
    reason: "You are not authorized to view or edit this profile.",
  };
}
