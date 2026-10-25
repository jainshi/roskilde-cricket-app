import type { Role } from "@prisma/client";

/**
 * Pure age-based eligibility rules (spec FR-003/FR-004, data-model "Youth" rules).
 */

export const MIN_LOGIN_AGE = 13;
export const ADULT_AGE = 18;

/** Full years between date of birth and `now` (UTC based, timezone-stable). */
export function calculateAge(dateOfBirth: Date, now: Date = new Date()): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/** A profile without a date of birth is treated as an adult (non-player members). */
export function isMinor(dateOfBirth: Date | null | undefined, now: Date = new Date()): boolean {
  if (!dateOfBirth) return false;
  return calculateAge(dateOfBirth, now) < ADULT_AGE;
}

/** Under-13s never get login credentials; 13+ (or adults without DOB) may. */
export function canHaveLoginAccount(
  dateOfBirth: Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!dateOfBirth) return true;
  return calculateAge(dateOfBirth, now) >= MIN_LOGIN_AGE;
}

const ALL_ROLES: readonly Role[] = ["ADMIN", "COACH", "AD_HOC_COACH", "PLAYER", "PARENT"];

/** Minors may only ever hold the PLAYER role. */
export function getAllowedRolesForAge(
  dateOfBirth: Date | null | undefined,
  now: Date = new Date()
): readonly Role[] {
  return isMinor(dateOfBirth, now) ? ["PLAYER"] : ALL_ROLES;
}
