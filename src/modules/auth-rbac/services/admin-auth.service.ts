import { prisma } from "@/lib/db";
import { hashPassword, generateTemporaryPassword } from "@/lib/password";
import { canHaveLoginAccount } from "../domain/age-rules";
import { computeTemporaryPasswordExpiry } from "../domain/activation";
import { notificationService } from "../notifications/notification.service";

export interface AdminResetPasswordResult {
  success: boolean;
  temporaryPassword: string;
  email: string;
  memberName: string;
}

/**
 * Resets a member's credentials pitch-side or on administrative request (SRS §3.1.3).
 * Generates a CSPRNG 6-8 char temporary password, sets mustResetPassword = true,
 * revokes all active sessions, dispatches an invitation notification, and returns
 * the temporary password for immediate display to the administrator.
 */
export async function adminResetMemberPassword(params: {
  actorProfileId: string;
  targetProfileId: string;
}): Promise<AdminResetPasswordResult> {
  const member = await prisma.memberProfile.findUnique({
    where: { id: params.targetProfileId },
    include: {
      userAccount: true,
    },
  });

  if (!member) {
    throw new Error("Member profile not found.");
  }

  if (!member.userAccount) {
    throw new Error(
      "Member does not have a login account. Use 'Create Login' to provision credentials."
    );
  }

  const temporaryPassword = generateTemporaryPassword(8);
  const passwordHash = await hashPassword(temporaryPassword);
  const temporaryPasswordExpiresAt = computeTemporaryPasswordExpiry();

  await prisma.$transaction(async (tx) => {
    // 1. Update user account credentials & reset flags
    await tx.userAccount.update({
      where: { id: member.userAccount!.id },
      data: {
        passwordHash,
        mustResetPassword: true,
        temporaryPasswordExpiresAt,
        failedLoginAttempts: 0,
        lockedUntil: null,
        status: "INVITED",
        sessionVersion: { increment: 1 },
      },
    });

    // 2. Revoke all existing sessions across all devices
    await tx.session.deleteMany({
      where: { userAccountId: member.userAccount!.id },
    });

    // 3. Record audit log
    await tx.auditLog.create({
      data: {
        actorProfileId: params.actorProfileId,
        targetProfileId: params.targetProfileId,
        action: "ADMIN_RESET_PASSWORD",
        metadata: {
          temporaryPasswordExpiresAt,
        },
      },
    });
  });

  // 4. Dispatch notification
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const loginUrl = `${appUrl.replace(/\/$/, "")}/signin`;

  await notificationService.sendEmail({
    to: member.userAccount.email,
    subject: "Your Roskilde Cricket Club Login Details Have Been Reset",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 580px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0c2340; margin-bottom: 16px;">Temporary Login Credentials</h2>
        <p>Hello ${member.firstName},</p>
        <p>A club administrator has reset your password for the Roskilde Cricket Club portal.</p>
        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #0369a1; font-weight: 600;">Your Temporary Credentials:</p>
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
          This temporary password will expire in 7 days. You will be prompted to choose a new password upon your first sign in.
        </p>
      </div>
    `,
  });

  console.log("\n==================================================");
  console.log(`[ADMIN PASSWORD RESET] New temporary password for: ${member.userAccount.email}`);
  console.log(`Temporary Password: ${temporaryPassword}`);
  console.log("==================================================\n");

  return {
    success: true,
    temporaryPassword,
    email: member.userAccount.email,
    memberName: `${member.firstName} ${member.lastName}`,
  };
}

/**
 * Provisions a login account for an existing member aged 13+ who currently has no account.
 */
export async function adminProvisionLogin(params: {
  actorProfileId: string;
  targetProfileId: string;
  email?: string;
}): Promise<AdminResetPasswordResult> {
  const member = await prisma.memberProfile.findUnique({
    where: { id: params.targetProfileId },
    include: {
      userAccount: true,
    },
  });

  if (!member) {
    throw new Error("Member profile not found.");
  }

  if (member.userAccount) {
    throw new Error("Member already has a login account. Use 'Reset Password' instead.");
  }

  // Age eligibility check (FR-012)
  if (!canHaveLoginAccount(member.dateOfBirth)) {
    throw new Error(
      "Members under 13 cannot be granted login credentials (FR-012). Their profiles are managed by linked parents."
    );
  }

  const cleanEmail = (params.email || member.email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("A valid email address is required to create a login account.");
  }

  // Ensure email uniqueness
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
        memberProfileId: member.id,
        email: cleanEmail,
        passwordHash,
        mustResetPassword: true,
        temporaryPasswordExpiresAt,
        status: "INVITED",
      },
    });

    // 2. Update member email if not previously set
    if (member.email !== cleanEmail) {
      await tx.memberProfile.update({
        where: { id: member.id },
        data: { email: cleanEmail },
      });
    }

    // 3. Record audit log
    await tx.auditLog.create({
      data: {
        actorProfileId: params.actorProfileId,
        targetProfileId: params.targetProfileId,
        action: "ADMIN_PROVISION_LOGIN",
        metadata: {
          email: cleanEmail,
          temporaryPasswordExpiresAt,
        },
      },
    });
  });

  // 4. Dispatch invitation email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const loginUrl = `${appUrl.replace(/\/$/, "")}/signin`;

  await notificationService.sendEmail({
    to: cleanEmail,
    subject: "Welcome to Roskilde Cricket Club - Your Login Details",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 580px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0c2340; margin-bottom: 16px;">Welcome to Roskilde Cricket Club</h2>
        <p>Hello ${member.firstName},</p>
        <p>A login account has been provisioned for you in the Roskilde Cricket Club portal.</p>
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
          This temporary password will expire in 7 days. You will be prompted to choose your own secure password upon signing in.
        </p>
      </div>
    `,
  });

  console.log("\n==================================================");
  console.log(`[ADMIN LOGIN PROVISIONED] Account created for: ${cleanEmail}`);
  console.log(`Temporary Password: ${temporaryPassword}`);
  console.log("==================================================\n");

  return {
    success: true,
    temporaryPassword,
    email: cleanEmail,
    memberName: `${member.firstName} ${member.lastName}`,
  };
}
