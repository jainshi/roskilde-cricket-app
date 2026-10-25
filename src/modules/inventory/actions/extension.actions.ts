"use server";

import { revalidatePath } from "next/cache";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import {
  requestLoanExtensionSchema,
  reviewLoanExtensionSchema,
} from "../contracts/extension.contract";
import {
  requestLoanExtension,
  reviewLoanExtension,
} from "../services/extension.service";

/**
 * Server Action: Submit loan return extension request.
 * Can be called by borrower or linked parent.
 */
export async function requestLoanExtensionAction(
  rawInput: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireActivatedSession();
    const parsed = requestLoanExtensionSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid extension request data.",
      };
    }

    await requestLoanExtension(parsed.data, session.memberProfileId);

    revalidatePath("/profile/gear");
    revalidatePath("/inventory/extensions");
    revalidatePath("/inventory");

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to submit loan extension request.",
    };
  }
}

/**
 * Server Action: Review (approve / reject) a pending loan extension.
 * Requires official role (ADMIN, COACH, AD_HOC_COACH).
 */
export async function reviewLoanExtensionAction(
  rawInput: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireActivatedSession();

    const isOfficial = session.roles.some(
      (r) => r === "ADMIN" || r === "COACH" || r === "AD_HOC_COACH"
    );

    if (!isOfficial) {
      return {
        success: false,
        error: "Forbidden: Only coaches and administrators can review extension requests.",
      };
    }

    const parsed = reviewLoanExtensionSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid review data.",
      };
    }

    await reviewLoanExtension(parsed.data, session.memberProfileId);

    revalidatePath("/inventory/extensions");
    revalidatePath("/inventory");
    revalidatePath("/profile/gear");

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to review loan extension.",
    };
  }
}
