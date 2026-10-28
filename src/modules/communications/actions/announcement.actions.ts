"use server";

import { revalidatePath } from "next/cache";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { Role } from "@prisma/client";
import {
  createAnnouncementSchema,
  publishWeatherCancellationSchema,
  markAnnouncementReadSchema,
  CreateAnnouncementInput,
  PublishWeatherCancellationInput,
  MarkAnnouncementReadInput,
} from "../contracts/announcement.contract";
import {
  createAnnouncement,
  publishWeatherCancellation,
  markAnnouncementAsRead,
  deleteAnnouncement,
  AnnouncementWithDetails,
} from "../services/announcement.service";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action: Create and publish a club/squad announcement.
 * Accessible to Administrators and Coaches.
 */
export async function createAnnouncementAction(
  formData: unknown
): Promise<ActionResult<AnnouncementWithDetails>> {
  try {
    const session = await requireActivatedSession();
    const isAuthorized =
      session.roles.includes(Role.ADMIN) || session.roles.includes(Role.COACH);

    if (!isAuthorized) {
      return {
        success: false,
        error: "Unauthorized: Only Administrators and Coaches can publish club announcements.",
      };
    }

    const parsed = createAnnouncementSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const result = await createAnnouncement(session.memberProfileId, parsed.data);

    revalidatePath("/communications");
    revalidatePath("/dashboard");
    if (parsed.data.linkedEventId) {
      revalidatePath(`/events/${parsed.data.linkedEventId}`);
    }

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create announcement.",
    };
  }
}

/**
 * Server Action: Emergency weather cancellation notice that auto-cancels the linked fixture.
 * Accessible to Administrators and Coaches.
 */
export async function publishWeatherCancellationAction(
  formData: unknown
): Promise<ActionResult<{ announcement: AnnouncementWithDetails; eventCancelled: boolean }>> {
  try {
    const session = await requireActivatedSession();
    const isAuthorized =
      session.roles.includes(Role.ADMIN) || session.roles.includes(Role.COACH);

    if (!isAuthorized) {
      return {
        success: false,
        error: "Unauthorized: Only Administrators and Coaches can issue weather cancellations.",
      };
    }

    const parsed = publishWeatherCancellationSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const result = await publishWeatherCancellation(session.memberProfileId, parsed.data);

    revalidatePath("/communications");
    revalidatePath("/events");
    revalidatePath(`/events/${parsed.data.linkedEventId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to publish weather cancellation.",
    };
  }
}

/**
 * Server Action: Mark an announcement as read by the current member.
 */
export async function markAnnouncementReadAction(
  formData: unknown
): Promise<ActionResult<{ readAt: Date }>> {
  try {
    const session = await requireActivatedSession();
    const parsed = markAnnouncementReadSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid announcement ID.",
      };
    }

    const result = await markAnnouncementAsRead(parsed.data.announcementId, session.memberProfileId);

    revalidatePath("/communications");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to mark announcement as read.",
    };
  }
}

/**
 * Server Action: Delete an announcement.
 */
export async function deleteAnnouncementAction(
  announcementId: string
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const session = await requireActivatedSession();
    const result = await deleteAnnouncement(
      announcementId,
      session.memberProfileId,
      session.roles
    );

    revalidatePath("/communications");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete announcement.",
    };
  }
}
