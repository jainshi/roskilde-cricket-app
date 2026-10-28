"use server";

import { revalidatePath } from "next/cache";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { Role } from "@prisma/client";
import {
  createVolunteerDutySlotSchema,
  assignVolunteerDutySlotSchema,
  claimVolunteerDutySlotSchema,
  requestVolunteerSwapSchema,
  acceptVolunteerSwapSchema,
  unassignVolunteerDutySlotSchema,
} from "../contracts/volunteer.contract";
import {
  createVolunteerDutySlot,
  assignVolunteerDutySlot,
  claimVolunteerDutySlot,
  requestVolunteerDutySwap,
  acceptVolunteerDutySwap,
  unassignVolunteerDutySlot,
  deleteVolunteerDutySlot,
  VolunteerSlotWithDetails,
} from "../services/volunteer.service";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warning?: string;
}

/**
 * Server Action: Create a new volunteer duty slot on a fixture (Admin / Coach).
 */
export async function createVolunteerDutySlotAction(
  formData: unknown
): Promise<ActionResult<VolunteerSlotWithDetails>> {
  try {
    const session = await requireActivatedSession();
    const isStaff =
      session.roles.includes(Role.ADMIN) ||
      session.roles.includes(Role.COACH) ||
      session.roles.includes(Role.AD_HOC_COACH);

    if (!isStaff) {
      return {
        success: false,
        error: "Unauthorized: Only Administrators and Coaches can create volunteer duty slots.",
      };
    }

    const parsed = createVolunteerDutySlotSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const slot = await createVolunteerDutySlot(parsed.data);

    revalidatePath("/volunteers");
    revalidatePath(`/events/${parsed.data.eventId}`);
    revalidatePath("/events");
    revalidatePath("/dashboard");

    return { success: true, data: slot };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create volunteer duty slot.",
    };
  }
}

/**
 * Server Action: Directly assign a member to a duty slot (Admin / Coach).
 */
export async function assignVolunteerDutySlotAction(
  formData: unknown
): Promise<ActionResult<VolunteerSlotWithDetails>> {
  try {
    const session = await requireActivatedSession();
    const isStaff =
      session.roles.includes(Role.ADMIN) ||
      session.roles.includes(Role.COACH) ||
      session.roles.includes(Role.AD_HOC_COACH);

    if (!isStaff) {
      return {
        success: false,
        error: "Unauthorized: Only Administrators and Coaches can directly assign duties.",
      };
    }

    const parsed = assignVolunteerDutySlotSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const slot = await assignVolunteerDutySlot(parsed.data);

    revalidatePath("/volunteers");
    revalidatePath(`/events/${slot.eventId}`);
    revalidatePath("/events");
    revalidatePath("/dashboard");

    return { success: true, data: slot };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to assign volunteer duty slot.",
    };
  }
}

/**
 * Server Action: 1-Tap Mobile Volunteer Claim.
 * Supports HeaderProfileSwitcher delegation (parent claiming for linked youth player).
 */
export async function claimVolunteerDutySlotAction(
  formData: unknown
): Promise<ActionResult<VolunteerSlotWithDetails>> {
  try {
    const session = await requireActivatedSession();
    const targetProfileId = session.activeProfileId || session.memberProfileId;

    const parsed = claimVolunteerDutySlotSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const { slot, warningMessage } = await claimVolunteerDutySlot(targetProfileId, parsed.data);

    revalidatePath("/volunteers");
    revalidatePath(`/events/${slot.eventId}`);
    revalidatePath("/events");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: slot,
      warning: warningMessage,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to claim volunteer duty slot.",
    };
  }
}

/**
 * Server Action: Request a peer-to-peer swap for a claimed duty slot.
 */
export async function requestVolunteerSwapAction(
  formData: unknown
): Promise<ActionResult<VolunteerSlotWithDetails>> {
  try {
    const session = await requireActivatedSession();
    const targetProfileId = session.activeProfileId || session.memberProfileId;

    const parsed = requestVolunteerSwapSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const slot = await requestVolunteerDutySwap(targetProfileId, parsed.data);

    revalidatePath("/volunteers");
    revalidatePath(`/events/${slot.eventId}`);
    revalidatePath("/events");
    revalidatePath("/dashboard");

    return { success: true, data: slot };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to request duty swap.",
    };
  }
}

/**
 * Server Action: Accept a pending peer swap request.
 */
export async function acceptVolunteerSwapAction(
  formData: unknown
): Promise<ActionResult<VolunteerSlotWithDetails>> {
  try {
    const session = await requireActivatedSession();
    const targetProfileId = session.activeProfileId || session.memberProfileId;

    const parsed = acceptVolunteerSwapSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const slot = await acceptVolunteerDutySwap(targetProfileId, parsed.data);

    revalidatePath("/volunteers");
    revalidatePath(`/events/${slot.eventId}`);
    revalidatePath("/events");
    revalidatePath("/dashboard");

    return { success: true, data: slot };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to accept duty swap.",
    };
  }
}

/**
 * Server Action: Unassign a volunteer duty slot back to OPEN.
 */
export async function unassignVolunteerDutySlotAction(
  slotId: string
): Promise<ActionResult<VolunteerSlotWithDetails>> {
  try {
    const session = await requireActivatedSession();
    const targetProfileId = session.activeProfileId || session.memberProfileId;

    const parsed = unassignVolunteerDutySlotSchema.safeParse({ slotId });
    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid slot ID.",
      };
    }

    const slot = await unassignVolunteerDutySlot(
      parsed.data.slotId,
      targetProfileId,
      session.roles
    );

    revalidatePath("/volunteers");
    revalidatePath(`/events/${slot.eventId}`);
    revalidatePath("/events");
    revalidatePath("/dashboard");

    return { success: true, data: slot };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to unassign volunteer duty slot.",
    };
  }
}

/**
 * Server Action: Delete a volunteer duty slot (Admin / Coach only).
 */
export async function deleteVolunteerDutySlotAction(
  slotId: string,
  eventId: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const session = await requireActivatedSession();
    const isStaff =
      session.roles.includes(Role.ADMIN) ||
      session.roles.includes(Role.COACH) ||
      session.roles.includes(Role.AD_HOC_COACH);

    if (!isStaff) {
      return {
        success: false,
        error: "Unauthorized: Only Administrators and Coaches can delete volunteer duty slots.",
      };
    }

    const result = await deleteVolunteerDutySlot(slotId);

    revalidatePath("/volunteers");
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/dashboard");

    return { success: true, data: result };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete volunteer duty slot.",
    };
  }
}
