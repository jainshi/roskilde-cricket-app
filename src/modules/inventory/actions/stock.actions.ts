"use server";

import { revalidatePath } from "next/cache";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import {
  recordStockConsumptionSchema,
  restockBulkEquipmentSchema,
} from "../contracts/stock.contract";
import {
  recordDirectConsumption,
  restockBulkEquipment,
} from "../services/stock.service";
import { ActionResult } from "./catalog.actions";

/**
 * Server Action: Record direct match-day consumption of bulk consumables (Match balls, scorebooks, tape).
 * Authorized: ADMIN, COACH, AD_HOC_COACH.
 */
export async function recordStockConsumptionAction(
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
        error: "Unauthorized: Only Admins and Coaches can record equipment consumption.",
      };
    }

    const parsed = recordStockConsumptionSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const result = await recordDirectConsumption(parsed.data, session.memberProfileId);
    revalidatePath("/inventory");
    revalidatePath(`/inventory/${parsed.data.equipmentItemId}`);
    return { success: true, data: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record stock consumption.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Restock bulk equipment with new inventory (Admin only).
 */
export async function restockBulkEquipmentAction(
  formData: unknown
): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!session.roles.includes("ADMIN")) {
      return {
        success: false,
        error: "Unauthorized: Only Admins can restock inventory.",
      };
    }

    const parsed = restockBulkEquipmentSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const result = await restockBulkEquipment(parsed.data, session.memberProfileId);
    revalidatePath("/inventory");
    revalidatePath(`/inventory/${parsed.data.equipmentItemId}`);
    return { success: true, data: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to restock equipment.";
    return { success: false, error: msg };
  }
}
