"use server";

import { revalidatePath } from "next/cache";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import {
  submitEventRsvpSchema,
  updateTransportNoteSchema,
} from "../contracts/rsvp.contract";
import {
  submitEventRsvp,
  updateTransportNote,
} from "../services/rsvp.service";

export interface RsvpActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  isDelegated?: boolean;
  isLocked?: boolean;
  message?: string;
}

/**
 * Server Action: Submit or update a 1-tap event RSVP
 */
export async function submitEventRsvpAction(
  rawInput: unknown
): Promise<RsvpActionResult> {
  try {
    const session = await requireActivatedSession();
    const parsed = submitEventRsvpSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid RSVP data.",
      };
    }

    const result = await submitEventRsvp(
      parsed.data,
      session.memberProfileId,
      session.roles
    );

    revalidatePath("/events");
    revalidatePath(`/events/${parsed.data.scheduledEventId}`);

    return {
      success: true,
      data: result.rsvp,
      isDelegated: result.isDelegated,
      message: result.message,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit RSVP";
    const isLocked = message.toLowerCase().includes("deadline") || message.toLowerCase().includes("cutoff");
    return {
      success: false,
      error: message,
      isLocked,
    };
  }
}

/**
 * Server Action: Update player transport/carpooling note
 */
export async function updateTransportNoteAction(
  rawInput: unknown
): Promise<RsvpActionResult> {
  try {
    const session = await requireActivatedSession();
    const parsed = updateTransportNoteSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid transport note data.",
      };
    }

    const rsvp = await updateTransportNote(
      parsed.data,
      session.memberProfileId,
      session.roles
    );

    revalidatePath(`/events/${parsed.data.scheduledEventId}`);

    return {
      success: true,
      data: rsvp,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update note",
    };
  }
}
