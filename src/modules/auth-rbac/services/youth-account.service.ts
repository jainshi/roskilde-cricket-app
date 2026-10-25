import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { canHaveLoginAccount } from "../domain/age-rules";
import { hashPassword, generateTemporaryPassword } from "@/lib/password";
import { computeTemporaryPasswordExpiry } from "../domain/activation";
import { notificationService } from "../notifications/notification.service";

export interface GrantYouthLoginResult {
  success: boolean;
  temporaryPassword: string;
  email: string;
}

/**
 * Validates whether a youth player profile is age-eligible for login credentials (FR-012).
 * Under-13: strictly false.
 * 13+: true.
 */
export function isYouthEligibleForLogin(
  dateOfBirth: Date | null | undefined
): boolean {
  return canHaveLoginAccount(dateOfBirth);
}

/**
 * Grants optional portal login credentials to a youth player aged 13+ (FR-012, FR-033).
 * Restricts roles to PLAYER only, sets mustResetPassword = true, and generates a
 * 6-8 character CSPRNG temporary password.
 */
export async function grantYouthLoginCredentials(params: {
  actorProfileId: string;
  playerId: string;
  email: string;
}): Promise<GrantYouthLoginResult> {
  const { actorProfileId, playerId, email } = params;
  const cleanEmail = email.trim().toLowerCase();

  const player = await prisma.memberProfile.findUnique({
    where: { id: playerId },
    include: {
      userAccount: true,
      roleAssignments: true,
    },
  });

  if (!player) {
    throw new Error("Youth player profile not found.");
  }

  if (player.userAccount) {
    throw new Error("Youth player already possesses a login account.");
  }

  // Age eligibility verification (FR-012)
  if (!canHaveLoginAccount(player.dateOfBirth)) {
    throw new Error(
      "Youth players under 13 cannot be provisioned login credentials (FR-012). Their activities are managed by linked parents."
    );
  }

  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("A valid unique email address is required for youth login access.");
  }

  // Check email uniqueness
  const existingAccount = await prisma.userAccount.findUnique({
    where: { email: cleanEmail },
  });
  if (existingAccount) {
    throw new Error(`Email address '${cleanEmail}' is already in use by another account.`);
  }

  const temporaryPassword = generateTemporaryPassword(8);
  const passwordHash = await hashPassword(temporaryPassword);
  const temporaryPasswordExpiresAt = computeTemporaryPasswordExpiry();

  await prisma.$transaction(async (tx) => {
    // 1. Create user account
    await tx.userAccount.create({
      data: {
        memberProfileId: player.id,
        email: cleanEmail,
        passwordHash,
        mustResetPassword: true,
        temporaryPasswordExpiresAt,
        status: "INVITED",
      },
    });

    // 2. Ensure youth player holds PLAYER role and no elevated roles (FR-004)
    const hasPlayerRole = player.roleAssignments.some(
      (ra) => ra.role === Role.PLAYER
    );
    if (!hasPlayerRole) {
      await tx.roleAssignment.create({
        data: {
          memberProfileId: player.id,
          role: Role.PLAYER,
          assignedById: actorProfileId,
        },
      });
    }

    // 3. Update player email if empty
    if (!player.email) {
      await tx.memberProfile.update({
        where: { id: player.id },
        data: { email: cleanEmail },
      });
    }

    // 4. Audit log
    await tx.auditLog.create({
      data: {
        actorProfileId,
        targetProfileId: player.id,
        action: "YOUTH_LOGIN_CREDENTIALS_GRANTED",
        metadata: {
          email: cleanEmail,
          temporaryPasswordExpiresAt,
        },
      },
    });
  });

  // 5. Dispatch invitation notification
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const loginUrl = `${appUrl.replace(/\/$/, "")}/signin`;

  await notificationService.sendEmail({
    to: cleanEmail,
    subject: "Welcome to Roskilde Cricket Club - Your Player Login Details",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 580px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0c2340; margin-bottom: 16px;">Welcome to Roskilde Cricket Club!</h2>
        <p>Hello ${player.firstName},</p>
        <p>A personal Player login account has been set up for you in the RCC portal.</p>
        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #0369a1; font-weight: 600;">Your Sign-in Credentials:</p>
          <p style="margin: 0 0 4px 0; font-size: 14px; color: #334155;">Email: <strong>${cleanEmail}</strong></p>
          <p style="margin: 0; font-family: monospace; font-size: 18px; color: #0c2340; letter-spacing: 1px;">
            Password: <strong>${temporaryPassword}</strong>
          </p>
        </div>
        <p style="margin: 24px 0;">
          <a href="${loginUrl}" style="background-color: #0ea5e9; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Sign In to Member Portal
          </a>
        </p>
        <p style="font-size: 13px; color: #64748b;">
          This temporary password will expire in 7 days. You will be prompted to choose a new password when you log in for the first time.
        </p>
      </div>
    `,
  });

  return {
    success: true,
    temporaryPassword,
    email: cleanEmail,
  };
}
