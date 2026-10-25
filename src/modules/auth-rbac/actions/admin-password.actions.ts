"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "../services/auth-guard";
import {
  adminResetMemberPassword,
  adminProvisionLogin,
  AdminResetPasswordResult,
} from "../services/admin-auth.service";

export interface AdminPasswordActionState {
  success?: boolean;
  temporaryPassword?: string;
  email?: string;
  memberName?: string;
  error?: string;
}

/**
 * Admin action to reset a member's temporary password pitch-side or on request.
 */
export async function adminResetMemberPasswordAction(
  targetProfileId: string
): Promise<AdminPasswordActionState> {
  try {
    const session = await requirePermission("USER_MANAGEMENT_ONBOARD");

    const result = await adminResetMemberPassword({
      actorProfileId: session.memberProfileId,
      targetProfileId,
    });

    revalidatePath("/admin/members");

    return {
      success: true,
      temporaryPassword: result.temporaryPassword,
      email: result.email,
      memberName: result.memberName,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to reset member password.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Admin action to provision a new login account for a 13+ member who currently has no login.
 */
export async function adminProvisionLoginAction(
  targetProfileId: string,
  email?: string
): Promise<AdminPasswordActionState> {
  try {
    const session = await requirePermission("USER_MANAGEMENT_ONBOARD");

    const result = await adminProvisionLogin({
      actorProfileId: session.memberProfileId,
      targetProfileId,
      email,
    });

    revalidatePath("/admin/members");

    return {
      success: true,
      temporaryPassword: result.temporaryPassword,
      email: result.email,
      memberName: result.memberName,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to provision login credentials.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}
