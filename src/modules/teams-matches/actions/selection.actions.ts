"use server";

import { revalidatePath } from "next/cache";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import {
  saveMatchLineupDraftSchema,
  publishMatchLineupSchema,
} from "../contracts/selection.contract";
import {
  saveMatchLineupDraft,
  publishMatchLineup,
} from "../services/selection.service";

export interface SelectionActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  notifiedPlayerCount?: number;
}

function canManageSelection(roles: string[]): boolean {
  return (
    roles.includes("ADMIN") ||
    roles.includes("COACH") ||
    roles.includes("AD_HOC_COACH")
  );
}

/**
 * Server Action: Save draft match lineup
 */
export async function saveMatchLineupDraftAction(
  rawInput: unknown
): Promise<SelectionActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!canManageSelection(session.roles)) {
      return {
        success: false,
        error: "Forbidden: Only coaches and captains can manage match lineups.",
      };
    }

    const parsed = saveMatchLineupDraftSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid lineup draft input",
      };
    }

    const selection = await saveMatchLineupDraft(
      parsed.data,
      session.memberProfileId
    );

    revalidatePath(`/events/${parsed.data.scheduledEventId}`);
    revalidatePath(`/events/${parsed.data.scheduledEventId}/selection`);

    return {
      success: true,
      data: selection,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save draft lineup",
    };
  }
}

/**
 * Server Action: Publish official match lineup and alert parents
 */
export async function publishMatchLineupAction(
  rawInput: unknown
): Promise<SelectionActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!canManageSelection(session.roles)) {
      return {
        success: false,
        error: "Forbidden: Only coaches and captains can publish match lineups.",
      };
    }

    const parsed = publishMatchLineupSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid lineup input",
      };
    }

    const result = await publishMatchLineup(
      parsed.data,
      session.memberProfileId
    );

    revalidatePath(`/events/${parsed.data.scheduledEventId}`);
    revalidatePath(`/events/${parsed.data.scheduledEventId}/selection`);

    return {
      success: true,
      data: result,
      notifiedPlayerCount: result.notifiedPlayerCount,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to publish lineup",
    };
  }
}
