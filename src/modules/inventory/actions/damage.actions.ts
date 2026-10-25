"use server";

import { revalidatePath } from "next/cache";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import {
  reportDamageSchema,
  resolveDamageReportSchema,
} from "../contracts/damage.contract";
import {
  reportDamage,
  resolveDamageReport,
} from "../services/damage.service";

/**
 * Server Action: Submit equipment damage or loss report.
 * Callable by player, parent, coach, or administrator.
 */
export async function reportDamageAction(
  rawInput: unknown
): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    const session = await requireActivatedSession();
    const parsed = reportDamageSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid damage report data.",
      };
    }

    const report = await reportDamage(parsed.data, session.memberProfileId);

    revalidatePath("/profile/gear");
    revalidatePath("/inventory");
    revalidatePath("/inventory/damage");
    revalidatePath(`/inventory/${parsed.data.equipmentItemId}`);

    return { success: true, reportId: report.id };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to submit damage report.",
    };
  }
}

/**
 * Server Action: Resolve an equipment damage incident.
 * Accessible to Administrators and Coaching staff.
 */
export async function resolveDamageReportAction(
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
        error: "Forbidden: Only club administrators and coaches can resolve damage reports.",
      };
    }

    const parsed = resolveDamageReportSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid damage resolution data.",
      };
    }

    await resolveDamageReport(parsed.data, session.memberProfileId);

    revalidatePath("/inventory/damage");
    revalidatePath("/inventory");
    revalidatePath("/profile/gear");

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to resolve damage report.",
    };
  }
}
