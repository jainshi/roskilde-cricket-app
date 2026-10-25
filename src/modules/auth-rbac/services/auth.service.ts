import crypto from "crypto";
import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword, validatePasswordComplexity } from "@/lib/password";
import { createSession } from "./session.service";
import { notificationService } from "../notifications/notification.service";
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

/**
 * Requests a self-service password reset email (FR-019, SRS §3.1.3).
 * Always returns ok: true to prevent account enumeration.
 */
export async function requestPasswordReset(params: {
  email: string;
  baseUrl?: string;
}): Promise<{ ok: boolean }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const userAccount = await prisma.userAccount.findUnique({
    where: { email: cleanEmail },
    include: {
      memberProfile: {
        select: { id: true, firstName: true, isAnonymized: true },
      },
    },
  });

  // Generic response if account does not exist or profile is anonymized
  if (
    !userAccount ||
    userAccount.memberProfile.isAnonymized ||
    userAccount.status === "DEACTIVATED"
  ) {
    return { ok: true };
  }

  // Generate secure single-use token (valid for 1 hour per SRS §3.1.3)
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      token,
      userAccountId: userAccount.id,
      expiresAt,
    },
  });

  const baseUrl =
    params.baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${token}`;

  // Dispatch password reset email
  await notificationService.sendEmail({
    to: userAccount.email,
    subject: "Reset Your Roskilde Cricket Club Password",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 580px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0c2340; margin-bottom: 16px;">Reset Your Password</h2>
        <p>Hello ${userAccount.memberProfile.firstName},</p>
        <p>We received a request to reset your password for the Roskilde Cricket Club portal.</p>
        <p style="margin: 28px 0;">
          <a href="${resetUrl}" style="background-color: #0ea5e9; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="font-size: 13px; color: #64748b;">
          Or copy and paste this link into your browser:<br/>
          <a href="${resetUrl}" style="color: #0ea5e9;">${resetUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">
          This link is single-use and will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  // Prominently log in console for development ease
  console.log("\n==================================================");
  console.log(`[PASSWORD RESET] Token generated for: ${userAccount.email}`);
  console.log(`Reset URL: ${resetUrl}`);
  console.log("==================================================\n");

  return { ok: true };
}

export interface ValidateTokenResult {
  valid: boolean;
  error?: "INVALID_OR_EXPIRED" | "ACCOUNT_INACTIVE";
  userAccountId?: string;
  email?: string;
  memberName?: string;
}

/**
 * Validates a password reset token from URL parameters.
 */
export async function validatePasswordResetToken(
  token: string
): Promise<ValidateTokenResult> {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "INVALID_OR_EXPIRED" };
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: {
      userAccount: {
        include: {
          memberProfile: true,
        },
      },
    },
  });

  if (!resetToken) {
    return { valid: false, error: "INVALID_OR_EXPIRED" };
  }

  // Must not be already used (single-use)
  if (resetToken.usedAt !== null) {
    return { valid: false, error: "INVALID_OR_EXPIRED" };
  }

  // Must not be expired (1-hour window)
  if (resetToken.expiresAt < new Date()) {
    return { valid: false, error: "INVALID_OR_EXPIRED" };
  }

  if (
    resetToken.userAccount.status === "DEACTIVATED" ||
    resetToken.userAccount.memberProfile.isAnonymized
  ) {
    return { valid: false, error: "ACCOUNT_INACTIVE" };
  }

  return {
    valid: true,
    userAccountId: resetToken.userAccountId,
    email: resetToken.userAccount.email,
    memberName: `${resetToken.userAccount.memberProfile.firstName} ${resetToken.userAccount.memberProfile.lastName}`,
  };
}

/**
 * Sets a new password using a validated single-use reset token.
 * Revokes all existing active sessions across all devices (SRS §3.1.3).
 */
export async function resetPasswordWithToken(params: {
  token: string;
  newPassword: string;
}): Promise<{ ok: boolean; errorCode?: string }> {
  const tokenValidation = await validatePasswordResetToken(params.token);
  if (!tokenValidation.valid || !tokenValidation.userAccountId) {
    return { ok: false, errorCode: tokenValidation.error || "INVALID_OR_EXPIRED" };
  }

  const complexity = validatePasswordComplexity(params.newPassword);
  if (!complexity.isValid) {
    return { ok: false, errorCode: "COMPLEXITY_FAILED" };
  }

  const userAccount = await prisma.userAccount.findUnique({
    where: { id: tokenValidation.userAccountId },
    select: { id: true, passwordHash: true, memberProfileId: true },
  });

  if (!userAccount) {
    return { ok: false, errorCode: "ACCOUNT_NOT_FOUND" };
  }

  // Verify new password is not identical to current
  const isSame = await verifyPassword(userAccount.passwordHash, params.newPassword);
  if (isSame) {
    return { ok: false, errorCode: "SAME_AS_CURRENT" };
  }

  const newHash = await hashPassword(params.newPassword);

  await prisma.$transaction(async (tx) => {
    // 1. Mark token as used
    await tx.passwordResetToken.update({
      where: { token: params.token },
      data: { usedAt: new Date() },
    });

    // 2. Update user account credentials & active status
    await tx.userAccount.update({
      where: { id: userAccount.id },
      data: {
        passwordHash: newHash,
        mustResetPassword: false,
        temporaryPasswordExpiresAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        status: "ACTIVE",
        sessionVersion: { increment: 1 },
      },
    });

    // 3. Revoke all active sessions across all devices (SRS §3.1.3)
    await tx.session.deleteMany({
      where: { userAccountId: userAccount.id },
    });

    // 4. Record audit log
    await tx.auditLog.create({
      data: {
        actorProfileId: userAccount.memberProfileId,
        targetProfileId: userAccount.memberProfileId,
        action: "PASSWORD_RESET_TOKEN_COMPLETED",
        metadata: { reason: "SELF_SERVICE_TOKEN_RESET" },
      },
    });
  });

  return { ok: true };
}

