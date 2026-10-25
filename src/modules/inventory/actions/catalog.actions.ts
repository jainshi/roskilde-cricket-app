"use server";

import { revalidatePath } from "next/cache";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import {
  createEquipmentItemSchema,
  updateEquipmentItemSchema,
} from "../contracts/catalog.contract";
import {
  createEquipmentItem,
  updateEquipmentItem,
} from "../services/catalog.service";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action: Create a new serialized or bulk equipment item (Admin only).
 */
export async function createEquipmentItemAction(
  formData: unknown
): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!session.roles.includes("ADMIN")) {
      return { success: false, error: "Unauthorized: Only Admins can add equipment to the catalog." };
    }

    const parsed = createEquipmentItemSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const item = await createEquipmentItem(parsed.data, session.memberProfileId);
    revalidatePath("/inventory");
    return { success: true, data: item };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create equipment item.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Update equipment item details, status, or condition (Admin / Coach).
 */
export async function updateEquipmentItemAction(
  formData: unknown
): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();
    const isAuthorized = session.roles.some(
      (r) => r === "ADMIN" || r === "COACH"
    );

    if (!isAuthorized) {
      return { success: false, error: "Unauthorized: Only Admins and Coaches can modify equipment." };
    }

    const parsed = updateEquipmentItemSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const item = await updateEquipmentItem(
      parsed.data,
      session.memberProfileId,
      session.roles
    );

    revalidatePath("/inventory");
    revalidatePath(`/inventory/${parsed.data.id}`);
    return { success: true, data: item };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update equipment item.";
    return { success: false, error: msg };
  }
}
