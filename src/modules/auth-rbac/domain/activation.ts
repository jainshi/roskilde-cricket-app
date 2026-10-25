/**
 * Pure account-activation state machine and credential lifecycle rules (US1).
 * Framework-agnostic: no Prisma / Next.js imports.
 */

export const CURRENT_PRIVACY_POLICY_VERSION = "1.0.0";
export const TEMPORARY_PASSWORD_VALIDITY_DAYS = 7;
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;

export type ActivationStep =
  | "RESET_PASSWORD"
  | "CONSENT"
  | "AWAITING_GUARDIAN_CONSENT"
  | "COMPLETE";

/**
 * Determines the next step a signed-in user must complete before reaching the app.
 * Order: mandatory password reset → GDPR consent → complete.
 * Minors cannot consent for themselves; a linked guardian must do so.
 */
export function getActivationStep(state: {
  mustResetPassword: boolean;
  hasCurrentConsent: boolean;
  isMinor: boolean;
}): ActivationStep {
  if (state.mustResetPassword) return "RESET_PASSWORD";
  if (!state.hasCurrentConsent) {
    return state.isMinor ? "AWAITING_GUARDIAN_CONSENT" : "CONSENT";
  }
  return "COMPLETE";
}

export function computeTemporaryPasswordExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + TEMPORARY_PASSWORD_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
}

export function isTemporaryPasswordExpired(
  account: { mustResetPassword: boolean; temporaryPasswordExpiresAt: Date | null },
  now: Date = new Date()
): boolean {
  if (!account.mustResetPassword || !account.temporaryPasswordExpiresAt) return false;
  return account.temporaryPasswordExpiresAt.getTime() <= now.getTime();
}

export function isAccountLocked(lockedUntil: Date | null, now: Date = new Date()): boolean {
  return !!lockedUntil && lockedUntil.getTime() > now.getTime();
}

/**
 * Computes the new counter state after a failed login. Reaching the threshold
 * locks the account for LOCKOUT_DURATION_MINUTES and resets the counter.
 */
export function registerFailedLogin(
  failedLoginAttempts: number,
  now: Date = new Date()
): { failedLoginAttempts: number; lockedUntil: Date | null; locked: boolean } {
  const attempts = failedLoginAttempts + 1;
  if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    return {
      failedLoginAttempts: 0,
      lockedUntil: new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000),
      locked: true,
    };
  }
  return { failedLoginAttempts: attempts, lockedUntil: null, locked: false };
}
