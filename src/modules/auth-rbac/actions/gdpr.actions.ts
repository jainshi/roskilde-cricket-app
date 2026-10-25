"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession, requireAdminSession } from "../services/session-guard";
import {
  requestMemberDeletion,
  executeMemberAnonymization,
} from "../services/gdpr-deletion.service";
import { recordGdprConsent } from "../services/auth.service";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export interface GdprActionState {
  success?: boolean;
  error?: string;
  message?: string;
}

/**
 * Server action to request account deletion under GDPR Article 17 (FR-074).
 */
export async function requestAccountDeletionAction(
  prevState: GdprActionState | null,
  formData: FormData
): Promise<GdprActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "You must be signed in to request account deletion." };
  }

  const targetProfileId = (formData.get("targetProfileId") as string) || session.memberProfileId;
  const reason = (formData.get("reason") as string) || "User requested GDPR erasure";

  try {
    const res = await requestMemberDeletion({
      targetProfileId,
      requesterProfileId: session.memberProfileId,
      reason,
    });

    revalidatePath("/profile/privacy");
    revalidatePath("/admin/gdpr");

    return {
      success: true,
      message:
        "Your account deletion request has been registered and submitted to club administration for processing.",
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to submit deletion request.";
    return { success: false, error: errorMsg };
  }
}

/**
 * Server action for Club Administrators to execute immediate GDPR account anonymization (FR-074).
 */
export async function executeAnonymizationAction(
  prevState: GdprActionState | null,
  formData: FormData
): Promise<GdprActionState> {
  const adminSession = await requireAdminSession();

  const targetProfileId = formData.get("targetProfileId") as string;
  if (!targetProfileId) {
    return { success: false, error: "Target member ID is required." };
  }

  try {
    const res = await executeMemberAnonymization({
      targetProfileId,
      adminProfileId: adminSession.memberProfileId,
    });

    revalidatePath("/admin/gdpr");
    revalidatePath("/admin/members");
    revalidatePath("/directory");

    return {
      success: true,
      message: `Profile scrubbed successfully. Transformed into anonymized statistical record '${res.shellName}'.`,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to execute anonymization.";
    return { success: false, error: errorMsg };
  }
}

/**
 * Server action for parents to grant GDPR consent on behalf of a linked youth player (FR-070).
 */
export async function parentConsentForYouthAction(
  prevState: GdprActionState | null,
  formData: FormData
): Promise<GdprActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "You must be signed in to record guardian consent." };
  }

  const youthPlayerId = formData.get("youthPlayerId") as string;
  if (!youthPlayerId) {
    return { success: false, error: "Youth player ID is required." };
  }

  // Verify parent linkage
  const link = await prisma.parentChildLink.findFirst({
    where: {
      parentId: session.memberProfileId,
      playerId: youthPlayerId,
    },
  });

  if (!link && !session.roles.includes("ADMIN")) {
    return {
      success: false,
      error: "You are not authorized to give parental consent for this player.",
    };
  }

  const reqHeaders = await headers();
  const ipAddress = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;

  try {
    await recordGdprConsent({
      subjectProfileId: youthPlayerId,
      consentedById: session.memberProfileId,
      ipAddress,
    });

    revalidatePath("/profile/privacy");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Parental consent successfully recorded for linked youth player.",
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to record parental consent.";
    return { success: false, error: errorMsg };
  }
}
