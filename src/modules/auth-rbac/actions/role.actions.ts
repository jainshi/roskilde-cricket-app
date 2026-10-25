"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { requirePermission } from "../services/auth-guard";
import { updateMemberRoles } from "../services/role.service";

export interface RoleActionState {
  success?: boolean;
  roles?: Role[];
  error?: string;
}

export async function updateMemberRolesAction(
  prevState: RoleActionState | null,
  formData: FormData
): Promise<RoleActionState> {
  try {
    // Enforce server-side RBAC guard for role assignment
    const session = await requirePermission("ROLE_ASSIGNMENT");

    const targetProfileId = formData.get("targetProfileId") as string;
    if (!targetProfileId) {
      return { success: false, error: "Target member profile ID is required." };
    }

    const roles = formData.getAll("roles") as Role[];
    if (roles.length === 0) {
      return {
        success: false,
        error: "At least one role must be selected for the member.",
      };
    }

    const result = await updateMemberRoles({
      actorProfileId: session.memberProfileId,
      targetProfileId,
      newRoles: roles,
    });

    revalidatePath("/admin/members");
    revalidatePath(`/admin/members/${targetProfileId}/roles`);

    return {
      success: true,
      roles: result.roles,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to update member roles.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}
