"use server";

import { redirect } from "next/navigation";
import { getCurrentSession, clearSessionCookie } from "../services/session-guard";
import { revokeAllSessions } from "../services/session.service";
import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword, validatePasswordComplexity } from "@/lib/password";

export interface SecurityActionState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function signOutEverywhereAction(): Promise<void> {
  const session = await getCurrentSession();
  if (session) {
    await revokeAllSessions(session.userAccountId);
    await clearSessionCookie();
  }
  redirect("/signin?reason=signed_out_everywhere");
}

export async function changePasswordAction(
  prevState: SecurityActionState | null,
  formData: FormData
): Promise<SecurityActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "You must be signed in to change your password." };
  }

  const currentPassword = (formData.get("currentPassword") as string) || "";
  const newPassword = (formData.get("newPassword") as string) || "";
  const confirmPassword = (formData.get("confirmPassword") as string) || "";

  if (!currentPassword) {
    return { success: false, error: "Current password is required." };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "New passwords do not match." };
  }

  // Validate password rules (SRS §3.1.3)
  const complexity = validatePasswordComplexity(newPassword);

  if (!complexity.isValid) {
    return {
      success: false,
      error: `Password does not meet complexity requirements. Failed checks: ${complexity.failedRules.join(", ")}`,
    };
  }

  // Fetch account
  const account = await prisma.userAccount.findUnique({
    where: { id: session.userAccountId },
  });

  if (!account) {
    return { success: false, error: "User account not found." };
  }

  const matchesCurrent = await verifyPassword(currentPassword, account.passwordHash);
  if (!matchesCurrent) {
    return { success: false, error: "Current password is incorrect." };
  }

  const isSameAsOld = await verifyPassword(newPassword, account.passwordHash);
  if (isSameAsOld) {
    return {
      success: false,
      error: "New password cannot be the same as your current password.",
    };
  }

  const newHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.userAccount.update({
      where: { id: session.userAccountId },
      data: {
        passwordHash: newHash,
        mustResetPassword: false,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorProfileId: session.memberProfileId,
        targetProfileId: session.memberProfileId,
        action: "PASSWORD_CHANGED",
        metadata: { selfService: true },
      },
    }),
  ]);

  return { success: true };
}
