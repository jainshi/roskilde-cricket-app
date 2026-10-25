import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword, validatePasswordComplexity } from "@/lib/password";
import { createSession } from "./session.service";
import {
  isAccountLocked,
  isTemporaryPasswordExpired,
  registerFailedLogin,
  CURRENT_PRIVACY_POLICY_VERSION,
  getActivationStep,
  ActivationStep,
} from "../domain/activation";
import { isMinor } from "../domain/age-rules";

// Constant dummy hash to prevent timing attacks when email does not exist
const DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$6Fv/y0eM7a4U8u/2qGz61A$V3xN2U8x+K0M7e/b6L2X1g";

export type SignInErrorCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_LOCKED"
  | "INVITATION_EXPIRED"
  | "ACCOUNT_DEACTIVATED";

export interface SignInResult {
  ok: boolean;
  sessionToken?: string;
  mustResetPassword?: boolean;
  errorCode?: SignInErrorCode;
}

/**
 * Authenticates user credentials, enforces lockout after 5 failures,
 * checks temporary password expiry, and generates active session token.
 */
export async function authenticateUser(params: {
  email: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<SignInResult> {
  const cleanEmail = params.email.trim().toLowerCase();
  const now = new Date();

  const userAccount = await prisma.userAccount.findUnique({
    where: { email: cleanEmail },
    include: {
      memberProfile: {
        select: {
          id: true,
          isAnonymized: true,
        },
      },
    },
  });

  // Account does not exist or profile is anonymized
  if (!userAccount || userAccount.memberProfile.isAnonymized) {
    await verifyPassword(DUMMY_HASH, params.password);
    return { ok: false, errorCode: "INVALID_CREDENTIALS" };
  }

  // Deactivated account
  if (userAccount.status === "DEACTIVATED") {
    return { ok: false, errorCode: "ACCOUNT_DEACTIVATED" };
  }

  // Check lockout status
  if (isAccountLocked(userAccount.lockedUntil, now)) {
    return { ok: false, errorCode: "ACCOUNT_LOCKED" };
  }

  // Verify password
  const isValid = await verifyPassword(userAccount.passwordHash, params.password);

  if (!isValid) {
    const lockoutState = registerFailedLogin(userAccount.failedLoginAttempts, now);
    await prisma.userAccount.update({
      where: { id: userAccount.id },
      data: {
        failedLoginAttempts: lockoutState.failedLoginAttempts,
        lockedUntil: lockoutState.lockedUntil,
        status: lockoutState.locked ? "LOCKED" : userAccount.status,
      },
    });

    return {
      ok: false,
      errorCode: lockoutState.locked ? "ACCOUNT_LOCKED" : "INVALID_CREDENTIALS",
    };
  }

  // Check temporary password expiry
  if (isTemporaryPasswordExpired(userAccount, now)) {
    return { ok: false, errorCode: "INVITATION_EXPIRED" };
  }

  // Reset failed login attempts on successful sign-in
  if (userAccount.failedLoginAttempts > 0 || userAccount.lockedUntil) {
    await prisma.userAccount.update({
      where: { id: userAccount.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        status: userAccount.status === "LOCKED" ? "ACTIVE" : userAccount.status,
      },
    });
  }

  // Create session
  const sessionToken = await createSession({
    userAccountId: userAccount.id,
    userAgent: params.userAgent,
    ipAddress: params.ipAddress,
  });

  return {
    ok: true,
    sessionToken,
    mustResetPassword: userAccount.mustResetPassword,
  };
}

export type ResetPasswordErrorCode =
  | "COMPLEXITY_FAILED"
  | "SAME_AS_CURRENT"
  | "ACCOUNT_NOT_FOUND";

export interface CompleteResetPasswordResult {
  ok: boolean;
  errorCode?: ResetPasswordErrorCode;
}

/**
 * Completes mandatory password reset, enforces complexity,
 * verifies password differs from previous, clears mustResetPassword flag,
 * and sets account status to ACTIVE.
 */
export async function completeMandatoryPasswordReset(params: {
  userAccountId: string;
  newPassword: string;
}): Promise<CompleteResetPasswordResult> {
  const complexity = validatePasswordComplexity(params.newPassword);
  if (!complexity.isValid) {
    return { ok: false, errorCode: "COMPLEXITY_FAILED" };
  }

  const userAccount = await prisma.userAccount.findUnique({
    where: { id: params.userAccountId },
    select: { id: true, passwordHash: true, memberProfileId: true },
  });

  if (!userAccount) {
    return { ok: false, errorCode: "ACCOUNT_NOT_FOUND" };
  }

  // Ensure new password is not identical to current
  const isSame = await verifyPassword(userAccount.passwordHash, params.newPassword);
  if (isSame) {
    return { ok: false, errorCode: "SAME_AS_CURRENT" };
  }

  const newHash = await hashPassword(params.newPassword);

  await prisma.$transaction([
    prisma.userAccount.update({
      where: { id: params.userAccountId },
      data: {
        passwordHash: newHash,
        mustResetPassword: false,
        temporaryPasswordExpiresAt: null,
        status: "ACTIVE",
      },
    }),
    prisma.auditLog.create({
      data: {
        actorProfileId: userAccount.memberProfileId,
        targetProfileId: userAccount.memberProfileId,
        action: "PASSWORD_RESET_COMPLETED",
        metadata: { reason: "MANDATORY_INITIAL_RESET" },
      },
    }),
  ]);

  return { ok: true };
}

/**
 * Records GDPR consent given by a member or guardian.
 */
export async function recordGdprConsent(params: {
  subjectProfileId: string;
  consentedById: string;
  ipAddress?: string;
  policyVersion?: string;
}): Promise<void> {
  const version = params.policyVersion || CURRENT_PRIVACY_POLICY_VERSION;

  await prisma.$transaction([
    prisma.consentRecord.create({
      data: {
        subjectProfileId: params.subjectProfileId,
        consentedById: params.consentedById,
        policyVersion: version,
        ipAddress: params.ipAddress,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorProfileId: params.consentedById,
        targetProfileId: params.subjectProfileId,
        action: "GDPR_CONSENT_RECORDED",
        metadata: { policyVersion: version },
      },
    }),
  ]);
}

/**
 * Resolves the current activation step for an active member session.
 */
export async function getActivationStepForProfile(params: {
  memberProfileId: string;
  mustResetPassword: boolean;
}): Promise<ActivationStep> {
  if (params.mustResetPassword) {
    return "RESET_PASSWORD";
  }

  const profile = await prisma.memberProfile.findUnique({
    where: { id: params.memberProfileId },
    select: {
      dateOfBirth: true,
      consentsReceived: {
        where: { policyVersion: CURRENT_PRIVACY_POLICY_VERSION },
        take: 1,
      },
    },
  });

  const minor = isMinor(profile?.dateOfBirth);
  const hasConsent = (profile?.consentsReceived.length ?? 0) > 0;

  return getActivationStep({
    mustResetPassword: false,
    hasCurrentConsent: hasConsent,
    isMinor: minor,
  });
}
