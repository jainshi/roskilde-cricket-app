"use server";

import { revalidatePath } from "next/cache";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { Role } from "@prisma/client";
import {
  enrollMemberSubscriptionSchema,
  overrideSubscriptionDiscountSchema,
  assignPlanToMembersSchema,
} from "../contracts/subscription.contract";
import {
  enrollMemberSubscription,
  overrideSubscriptionDiscount,
  assignPlanToMembers,
} from "../services/subscription.service";

import { prisma } from "@/lib/db";
import { ActionResult } from "./plan.actions";

/**
 * Server Action: Enroll a member into a seasonal subscription.
 * Authorized for: Admin, Player (self), Parent (linked child).
 */
export async function enrollMemberSubscriptionAction(
  formData: unknown
): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();

    const parsed = enrollMemberSubscriptionSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const { memberProfileId } = parsed.data;
    const isAdmin = session.roles.includes(Role.ADMIN);
    const isSelf =
      session.memberProfileId === memberProfileId ||
      session.activeProfileId === memberProfileId;

    let isLinkedParent = false;
    if (session.roles.includes(Role.PARENT)) {
      const link = await prisma.parentChildLink.findFirst({
        where: {
          parentId: session.memberProfileId,
          playerId: memberProfileId,
        },
      });
      isLinkedParent = Boolean(link);
    }

    if (!isAdmin && !isSelf && !isLinkedParent) {
      return {
        success: false,
        error: "Unauthorized: You can only enroll yourself or your linked youth players.",
      };
    }

    // Only Admin can apply manual overrides during enrollment
    if (parsed.data.manualDiscountOere && !isAdmin) {
      return {
        success: false,
        error: "Unauthorized: Only Club Administrators/Treasurers can apply manual fee overrides.",
      };
    }

    const sub = await enrollMemberSubscription(parsed.data, session.memberProfileId);
    revalidatePath("/admin/finance/plans");
    revalidatePath("/billing");
    return { success: true, data: sub };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to enroll subscription.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Apply manual Treasurer discount override to a subscription.
 * Authorized for: Admin only.
 */
export async function overrideSubscriptionDiscountAction(
  formData: unknown
): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!session.roles.includes(Role.ADMIN)) {
      return {
        success: false,
        error: "Unauthorized: Only Club Administrators/Treasurers can apply manual fee overrides.",
      };
    }

    const parsed = overrideSubscriptionDiscountSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const sub = await overrideSubscriptionDiscount(parsed.data, session.memberProfileId);
    revalidatePath("/admin/finance/plans");
    revalidatePath("/billing");
    return { success: true, data: sub };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to apply discount override.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Batch-assign a membership plan to selected members.
 * Authorized for: Admin only.
 */
export async function assignPlanToMembersAction(
  formData: unknown
): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!session.roles.includes(Role.ADMIN)) {
      return {
        success: false,
        error: "Unauthorized: Only Club Administrators can assign membership plans.",
      };
    }

    const parsed = assignPlanToMembersSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const result = await assignPlanToMembers(parsed.data, session.memberProfileId);
    revalidatePath("/admin/finance/plans");
    revalidatePath("/billing");
    return { success: true, data: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to assign plan to members.";
    return { success: false, error: msg };
  }
}

