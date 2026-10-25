"use server";

import { revalidatePath } from "next/cache";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import {
  checkoutEquipmentSchema,
  checkinEquipmentSchema,
} from "../contracts/loan.contract";
import {
  checkoutEquipment,
  checkinEquipment,
} from "../services/loan.service";
import { ActionResult } from "./catalog.actions";

/**
 * Server Action: Pitch-side equipment check-out to a player or squad.
 * Authorized: ADMIN, COACH, AD_HOC_COACH.
 */
export async function checkoutEquipmentAction(
  formData: unknown
): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();
    const isAuthorized = session.roles.some(
      (r) => r === "ADMIN" || r === "COACH" || r === "AD_HOC_COACH"
    );

    if (!isAuthorized) {
      return {
        success: false,
        error: "Unauthorized: Only Admins, Coaches, and Ad-Hoc Coaches can check out equipment.",
      };
    }

    const parsed = checkoutEquipmentSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const result = await checkoutEquipment(parsed.data, session.memberProfileId);

    revalidatePath("/inventory");
    revalidatePath("/inventory/checkout");
    revalidatePath("/inventory/checkin");
    revalidatePath("/profile/gear");
    revalidatePath(`/inventory/${parsed.data.equipmentItemId}`);

    return {
      success: true,
      data: {
        loanId: result.loan.id,
        isMinor: result.isMinor,
        parentCount: result.parentCount,
        expectedReturnAt: result.expectedReturnAt,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to execute equipment check-out.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Pitch-side equipment check-in / return.
 * Authorized: ADMIN, COACH, AD_HOC_COACH.
 */
export async function checkinEquipmentAction(
  formData: unknown
): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();
    const isAuthorized = session.roles.some(
      (r) => r === "ADMIN" || r === "COACH" || r === "AD_HOC_COACH"
    );

    if (!isAuthorized) {
      return {
        success: false,
        error: "Unauthorized: Only Admins, Coaches, and Ad-Hoc Coaches can check in returned equipment.",
      };
    }

    const parsed = checkinEquipmentSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const result = await checkinEquipment(parsed.data, session.memberProfileId);

    revalidatePath("/inventory");
    revalidatePath("/inventory/checkout");
    revalidatePath("/inventory/checkin");
    revalidatePath("/profile/gear");

    return {
      success: true,
      data: {
        loanId: result.loan.id,
        newStatus: result.newStatus,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to check in returned equipment.";
    return { success: false, error: msg };
  }
}
