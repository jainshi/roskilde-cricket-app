/**
 * Pure, framework-agnostic password complexity rules (SRS §3.1.3, spec FR-018).
 * Safe to import from both server and client code (no Node-only dependencies).
 */

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRule = "MIN_LENGTH" | "UPPERCASE" | "LOWERCASE" | "DIGIT" | "SYMBOL";

export const PASSWORD_RULES: readonly PasswordRule[] = [
  "MIN_LENGTH",
  "UPPERCASE",
  "LOWERCASE",
  "DIGIT",
  "SYMBOL",
];

const RULE_CHECKS: Record<PasswordRule, (password: string) => boolean> = {
  MIN_LENGTH: (p) => p.length >= PASSWORD_MIN_LENGTH,
  UPPERCASE: (p) => /[A-Z]/.test(p),
  LOWERCASE: (p) => /[a-z]/.test(p),
  DIGIT: (p) => /[0-9]/.test(p),
  SYMBOL: (p) => /[^A-Za-z0-9]/.test(p),
};

/**
 * Returns the list of complexity rules the password does NOT satisfy (empty = compliant).
 */
export function getFailedPasswordRules(password: string): PasswordRule[] {
  return PASSWORD_RULES.filter((rule) => !RULE_CHECKS[rule](password));
}
