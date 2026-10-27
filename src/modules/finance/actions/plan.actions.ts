"use server";

import { revalidatePath } from "next/cache";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { Role } from "@prisma/client";
import {
  createMembershipPlanSchema,
  updateMembershipPlanSchema,
} from "../contracts/plan.contract";
import {
  createMembershipPlan,
  updateMembershipPlan,
  toggleMembershipPlanActive,
} from "../services/plan.service";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action: Create a new membership plan (Admin only).
 */
export async function createMembershipPlanAction(
  formData: unknown
): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!session.roles.includes(Role.ADMIN)) {
      return {
        success: false,
        error: "Unauthorized: Only Club Administrators/Treasurers can create membership plans.",
      };
    }

    const parsed = createMembershipPlanSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const plan = await createMembershipPlan(parsed.data);
    revalidatePath("/admin/finance/plans");
    revalidatePath("/admin/finance");
    return { success: true, data: plan };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create membership plan.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Update an existing membership plan (Admin only).
 */
export async function updateMembershipPlanAction(
  formData: unknown
): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!session.roles.includes(Role.ADMIN)) {
      return {
        success: false,
        error: "Unauthorized: Only Club Administrators/Treasurers can update membership plans.",
      };
    }

    const parsed = updateMembershipPlanSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const plan = await updateMembershipPlan(parsed.data);
    revalidatePath("/admin/finance/plans");
    revalidatePath("/admin/finance");
    return { success: true, data: plan };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update membership plan.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Toggle active status of a membership plan (Admin only).
 */
export async function toggleMembershipPlanActiveAction(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!session.roles.includes(Role.ADMIN)) {
      return {
        success: false,
        error: "Unauthorized: Only Club Administrators/Treasurers can modify membership plans.",
      };
    }

    const plan = await toggleMembershipPlanActive(id, isActive);
    revalidatePath("/admin/finance/plans");
    revalidatePath("/admin/finance");
    return { success: true, data: plan };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to toggle plan status.";
    return { success: false, error: msg };
  }
}
