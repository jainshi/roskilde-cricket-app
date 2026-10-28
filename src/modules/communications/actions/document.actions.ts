"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { Role, ClubDocument, DocumentSignOff } from "@prisma/client";
import {
  createClubDocumentSchema,
  updateClubDocumentSchema,
  signOffDocumentSchema,
} from "../contracts/document.contract";
import {
  createClubDocument,
  updateClubDocument,
  signOffDocument,
  sendPolicyReminder,
} from "../services/document.service";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action: Create a new club governance document (Admin only).
 */
export async function createClubDocumentAction(
  formData: unknown
): Promise<ActionResult<ClubDocument>> {
  try {
    const session = await requireActivatedSession();
    if (!session.roles.includes(Role.ADMIN)) {
      return {
        success: false,
        error: "Unauthorized: Only Club Administrators can publish governance documents.",
      };
    }

    const parsed = createClubDocumentSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const doc = await createClubDocument(parsed.data);

    revalidatePath("/documents");
    revalidatePath("/admin/compliance");
    revalidatePath("/dashboard");

    return { success: true, data: doc };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create club document.",
    };
  }
}

/**
 * Server Action: Update a club governance document (Admin only).
 */
export async function updateClubDocumentAction(
  formData: unknown
): Promise<ActionResult<ClubDocument>> {
  try {
    const session = await requireActivatedSession();
    if (!session.roles.includes(Role.ADMIN)) {
      return {
        success: false,
        error: "Unauthorized: Only Club Administrators can update governance documents.",
      };
    }

    const parsed = updateClubDocumentSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const doc = await updateClubDocument(parsed.data);

    revalidatePath("/documents");
    revalidatePath("/admin/compliance");
    revalidatePath("/dashboard");

    return { success: true, data: doc };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update club document.",
    };
  }
}

/**
 * Server Action: Submit 1-click digital sign-off with audit metadata.
 * Supports HeaderProfileSwitcher active profile delegation for parents.
 */
export async function signOffDocumentAction(
  formData: unknown
): Promise<ActionResult<DocumentSignOff>> {
  try {
    const session = await requireActivatedSession();
    const parsed = signOffDocumentSchema.safeParse(formData);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const targetProfileId =
      parsed.data.targetProfileId ||
      session.activeProfileId ||
      session.memberProfileId;

    // Safely extract IP and user agent for statutory audit logs
    let ipAddress: string | null = null;
    let userAgent: string | null = null;
    try {
      const headerList = await headers();
      ipAddress =
        headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headerList.get("x-real-ip") ||
        null;
      userAgent = headerList.get("user-agent") || null;
    } catch {
      // Fallback in environments where headers() is not available
    }

    const signOff = await signOffDocument({
      documentId: parsed.data.documentId,
      memberProfileId: targetProfileId,
      versionSigned: parsed.data.versionSigned,
      ipAddress,
      userAgent,
    });

    revalidatePath("/documents");
    revalidatePath("/dashboard");
    revalidatePath("/admin/compliance");

    return { success: true, data: signOff };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to record digital policy sign-off.",
    };
  }
}

/**
 * Server Action: Dispatch email reminders to all unsigned members (Admin only).
 */
export async function sendPolicyReminderAction(
  documentId: string
): Promise<ActionResult<{ remindersSent: number }>> {
  try {
    const session = await requireActivatedSession();
    if (!session.roles.includes(Role.ADMIN)) {
      return {
        success: false,
        error: "Unauthorized: Only Club Administrators can dispatch policy reminders.",
      };
    }

    const result = await sendPolicyReminder(documentId);

    revalidatePath("/admin/compliance");

    return { success: true, data: { remindersSent: result.remindersSent } };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to dispatch policy reminders.",
    };
  }
}
