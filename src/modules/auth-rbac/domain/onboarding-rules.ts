import type { Role } from "@prisma/client";
import { canHaveLoginAccount, isMinor } from "./age-rules";

export type OnboardingRuleViolation =
  | "PLAYER_REQUIRES_DOB"
  | "DOB_IN_FUTURE"
  | "MINOR_ROLES_RESTRICTED"
  | "LOGIN_REQUIRES_EMAIL"
  | "LOGIN_REQUIRES_AGE_13";

/**
 * Cross-field business rules for onboarding a member (pure, server-enforced).
 */
export function validateOnboardingRules(
  input: {
    roles: readonly Role[];
    dateOfBirth: Date | null;
    email: string | null;
    grantLoginAccess: boolean;
  },
  now: Date = new Date()
): OnboardingRuleViolation[] {
  const violations: OnboardingRuleViolation[] = [];
  const { roles, dateOfBirth, email, grantLoginAccess } = input;

  if (roles.includes("PLAYER") && !dateOfBirth) violations.push("PLAYER_REQUIRES_DOB");
  if (dateOfBirth && dateOfBirth.getTime() > now.getTime()) violations.push("DOB_IN_FUTURE");
  if (isMinor(dateOfBirth, now) && roles.some((r) => r !== "PLAYER")) {
    violations.push("MINOR_ROLES_RESTRICTED");
  }
  if (grantLoginAccess) {
    if (!email) violations.push("LOGIN_REQUIRES_EMAIL");
    if (!canHaveLoginAccount(dateOfBirth, now)) violations.push("LOGIN_REQUIRES_AGE_13");
  }
  return violations;
}
