"use server";

import { revalidatePath } from "next/cache";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import {
  createScheduledEventSchema,
  updateScheduledEventSchema,
  updateEventLifecycleStatusSchema,
  createFacilitySchema,
  updateFacilitySchema,
  checkFacilityConflictSchema,
  createRecurringTrainingScheduleSchema,
  inviteEventParticipantsSchema,
} from "../contracts/event.contract";
import {
  createScheduledEvent,
  updateScheduledEvent,
  updateEventLifecycleStatus,
  createRecurringTrainingSchedule,
  inviteEventParticipants,
} from "../services/event.service";
import {
  createFacility,
  updateFacility,
  checkFacilityConflictPreflight,
} from "../services/facility.service";

export interface EventActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warning?: string;
  collisionDetected?: boolean;
}

function resolveCallerRole(
  roles: string[]
): "ADMIN" | "COACH" | "AD_HOC_COACH" | "PLAYER" | "PARENT" {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("COACH")) return "COACH";
  if (roles.includes("AD_HOC_COACH")) return "AD_HOC_COACH";
  if (roles.includes("PLAYER")) return "PLAYER";
  if (roles.includes("PARENT")) return "PARENT";
  return "PLAYER";
}

function isStaff(roles: string[]): boolean {
  return (
    roles.includes("ADMIN") ||
    roles.includes("COACH") ||
    roles.includes("AD_HOC_COACH")
  );
}

/**
 * Server Action: Create a new fixture or training session.
 */
export async function createScheduledEventAction(
  rawInput: unknown
): Promise<EventActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!isStaff(session.roles)) {
      return {
        success: false,
        error: "Forbidden: Only coaches and administrators can schedule events.",
      };
    }

    const parsed = createScheduledEventSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid event input",
      };
    }

    const callerRole = resolveCallerRole(session.roles);
    const result = await createScheduledEvent(
      parsed.data,
      session.memberProfileId,
      callerRole
    );

    revalidatePath("/events");
    revalidatePath(`/teams/${parsed.data.teamSquadId}`);
    if (parsed.data.facilityId) {
      revalidatePath("/admin/facilities");
    }

    return {
      success: true,
      data: result.event,
      warning: result.warning,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create event";
    const isCollision = message.toLowerCase().includes("collision");
    return {
      success: false,
      error: message,
      collisionDetected: isCollision,
    };
  }
}

/**
 * Server Action: Update an existing event.
 */
export async function updateScheduledEventAction(
  rawInput: unknown
): Promise<EventActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!isStaff(session.roles)) {
      return {
        success: false,
        error: "Forbidden: Only coaches and administrators can update events.",
      };
    }

    const parsed = updateScheduledEventSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid update input",
      };
    }

    const callerRole = resolveCallerRole(session.roles);
    const updated = await updateScheduledEvent(
      parsed.data,
      session.memberProfileId,
      callerRole
    );

    revalidatePath("/events");
    revalidatePath(`/events/${parsed.data.id}`);
    revalidatePath("/admin/facilities");

    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update event";
    const isCollision = message.toLowerCase().includes("collision");
    return {
      success: false,
      error: message,
      collisionDetected: isCollision,
    };
  }
}

/**
 * Server Action: Update event lifecycle status (PLAYED, RAINED_OUT, CANCELLED).
 */
export async function updateEventLifecycleStatusAction(
  rawInput: unknown
): Promise<EventActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!isStaff(session.roles)) {
      return {
        success: false,
        error: "Forbidden: Only staff can update event lifecycle status.",
      };
    }

    const parsed = updateEventLifecycleStatusSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid status input",
      };
    }

    const updated = await updateEventLifecycleStatus(parsed.data);

    revalidatePath("/events");
    revalidatePath(`/events/${parsed.data.id}`);

    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update status",
    };
  }
}

/**
 * Server Action: Pre-flight check for facility collisions before scheduling.
 */
export async function checkFacilityConflictAction(rawInput: unknown) {
  try {
    const session = await requireActivatedSession();
    const parsed = checkFacilityConflictSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid check params",
      };
    }

    const callerRole = resolveCallerRole(session.roles);
    const result = await checkFacilityConflictPreflight(parsed.data, callerRole);

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Conflict check failed",
    };
  }
}

/**
 * Server Action: Create facility (Admin only).
 */
export async function createFacilityAction(
  rawInput: unknown
): Promise<EventActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!session.roles.includes("ADMIN")) {
      return {
        success: false,
        error: "Forbidden: Only administrators can create club facilities.",
      };
    }

    const parsed = createFacilitySchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid facility input",
      };
    }

    const facility = await createFacility(parsed.data);
    revalidatePath("/admin/facilities");
    revalidatePath("/events/new");

    return {
      success: true,
      data: facility,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create facility",
    };
  }
}

/**
 * Server Action: Update facility (Admin only).
 */
export async function updateFacilityAction(
  rawInput: unknown
): Promise<EventActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!session.roles.includes("ADMIN")) {
      return {
        success: false,
        error: "Forbidden: Only administrators can update club facilities.",
      };
    }

    const parsed = updateFacilitySchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid facility input",
      };
    }

    const facility = await updateFacility(parsed.data);
    revalidatePath("/admin/facilities");

    return {
      success: true,
      data: facility,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update facility",
    };
  }
}

/**
 * Server Action: Create recurring weekly training schedule
 * (e.g. Sunday 08-10 for U13 & U15, or Saturday 10-12 for seniors).
 */
export async function createRecurringTrainingScheduleAction(
  rawInput: unknown
): Promise<EventActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!isStaff(session.roles)) {
      return {
        success: false,
        error:
          "Forbidden: Only coaches and administrators can schedule recurring trainings.",
      };
    }

    const parsed = createRecurringTrainingScheduleSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message || "Invalid recurring schedule input",
      };
    }

    const callerRole = resolveCallerRole(session.roles);
    const result = await createRecurringTrainingSchedule(
      parsed.data,
      session.memberProfileId,
      callerRole
    );

    revalidatePath("/events");
    for (const squadId of parsed.data.teamSquadIds) {
      revalidatePath(`/teams/${squadId}`);
    }
    if (parsed.data.facilityId) {
      revalidatePath("/admin/facilities");
    }

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create recurring training";
    const isCollision =
      message.toLowerCase().includes("conflict") ||
      message.toLowerCase().includes("collision");
    return {
      success: false,
      error: message,
      collisionDetected: isCollision,
    };
  }
}

/**
 * Server Action: Invite additional participants to an existing event
 */
export async function inviteEventParticipantsAction(
  rawInput: unknown
): Promise<EventActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!isStaff(session.roles)) {
      return {
        success: false,
        error: "Forbidden: Only coaches and administrators can invite participants.",
      };
    }

    const parsed = inviteEventParticipantsSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid participant input",
      };
    }

    const result = await inviteEventParticipants(
      parsed.data,
      session.memberProfileId
    );

    revalidatePath(`/events/${parsed.data.scheduledEventId}`);
    revalidatePath("/events");

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to invite participants";
    return {
      success: false,
      error: message,
    };
  }
}

