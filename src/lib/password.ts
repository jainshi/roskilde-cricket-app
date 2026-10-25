import * as argon2 from "argon2";
import crypto from "crypto";
import {
  getFailedPasswordRules,
  type PasswordRule,
} from "@/modules/auth-rbac/domain/password-rules";

// Unambiguous character set (no 0/O, 1/I/l) to avoid transcription errors
const UNAMBIGUOUS_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Hashes a plaintext password using Argon2id with memory-hard parameters.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
  });
}

/**
 * Verifies a plaintext password against an Argon2id hash.
 */
export async function verifyPassword(
  hash: string,
  plain: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/**
 * Generates an unpredictable 6–8 character alphanumeric temporary password using CSPRNG.
 */
export function generateTemporaryPassword(length = 8): string {
  if (length < 6 || length > 8) {
    throw new Error("Temporary password length must be between 6 and 8 characters.");
  }

  let result = "";
  const charsLength = UNAMBIGUOUS_CHARS.length;
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charsLength);
    result += UNAMBIGUOUS_CHARS[randomIndex];
  }
  return result;
}

/**
 * Validates password complexity per SRS §3.1.3:
 * - Minimum 8 characters
 * - Uppercase letter
 * - Lowercase letter
 * - Digit
 * - Special symbol
 *
 * Rule evaluation is delegated to the shared pure module so the client-side
 * checklist and server-side enforcement can never drift apart.
 */
const RULE_MESSAGES: Record<PasswordRule, string> = {
  MIN_LENGTH: "Password must be at least 8 characters long.",
  UPPERCASE: "Password must contain at least one uppercase letter.",
  LOWERCASE: "Password must contain at least one lowercase letter.",
  DIGIT: "Password must contain at least one digit.",
  SYMBOL: "Password must contain at least one symbol.",
};

export function validatePasswordComplexity(password: string): {
  isValid: boolean;
  errors: string[];
  failedRules: PasswordRule[];
} {
  const failedRules = getFailedPasswordRules(password);
  return {
    isValid: failedRules.length === 0,
    errors: failedRules.map((rule) => RULE_MESSAGES[rule]),
    failedRules,
  };
}
