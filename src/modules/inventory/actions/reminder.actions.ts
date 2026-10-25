"use server";

import { revalidatePath } from "next/cache";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import {
  evaluateAndDispatchReminders,
  ReminderDispatchResult,
} from "../services/reminder.service";

/**
 * Server Action: Trigger overdue return reminder evaluation and dispatch.
 * Restricted to coaches and administrators.
 */
export async function sendOverdueRemindersAction(options?: {
  dryRun?: boolean;
}): Promise<{
  success: boolean;
  result?: ReminderDispatchResult;
  error?: string;
}> {
  try {
    const session = await requireActivatedSession();

    const isOfficial = session.roles.some(
      (r) => r === "ADMIN" || r === "COACH" || r === "AD_HOC_COACH"
    );

    if (!isOfficial) {
      return {
        success: false,
        error: "Forbidden: Only coaching staff and administrators can dispatch overdue reminders.",
      };
    }

    const result = await evaluateAndDispatchReminders({
      dryRun: options?.dryRun ?? false,
    });

    revalidatePath("/inventory");
    revalidatePath("/profile/gear");

    return {
      success: true,
      result,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to dispatch overdue reminders.",
    };
  }
}
