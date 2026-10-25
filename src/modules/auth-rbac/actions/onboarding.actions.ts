"use server";

import { requireAdminSession } from "../services/session-guard";
import { createMemberProfile } from "../services/onboarding.service";
import { CreateMemberProfileSchema, ParentSlotInput } from "../contracts/schemas";
import type { Role } from "@prisma/client";

export interface OnboardingActionState {
  success?: boolean;
  memberProfileId?: string;
  temporaryPassword?: string;
  invitationSent?: boolean;
  parentInvitationsSent?: number;
  error?: string;
  fieldErrors?: Record<string, string>;
  submittedValues?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    roles: Role[];
    grantLoginAccess: boolean;
  };
}

export async function createMemberAction(
  prevState: OnboardingActionState | null,
  formData: FormData
): Promise<OnboardingActionState> {
  const adminSession = await requireAdminSession();

  const firstName = (formData.get("firstName") as string) || "";
  const lastName = (formData.get("lastName") as string) || "";
  const email = (formData.get("email") as string) || "";
  const phone = (formData.get("phone") as string) || "";
  const dateOfBirth = (formData.get("dateOfBirth") as string) || "";
  const roles = formData.getAll("roles") as Role[];
  const grantLoginAccess = formData.get("grantLoginAccess") === "on";

  // Parse parent1 inputs
  const p1Enabled = formData.get("p1_enabled") === "on";
  let parent1: ParentSlotInput | undefined = undefined;
  if (p1Enabled) {
    parent1 = {
      mode: (formData.get("p1_mode") as "EXISTING" | "NEW") || "NEW",
      existingProfileId: (formData.get("p1_existingProfileId") as string) || "",
      relationship: (formData.get("p1_relationship") as string) || "",
      firstName: (formData.get("p1_firstName") as string) || "",
      lastName: (formData.get("p1_lastName") as string) || "",
      email: (formData.get("p1_email") as string) || "",
      phone: (formData.get("p1_phone") as string) || "",
    };
  }

  // Parse parent2 inputs
  const p2Enabled = formData.get("p2_enabled") === "on";
  let parent2: ParentSlotInput | undefined = undefined;
  if (p2Enabled) {
    parent2 = {
      mode: (formData.get("p2_mode") as "EXISTING" | "NEW") || "NEW",
      existingProfileId: (formData.get("p2_existingProfileId") as string) || "",
      relationship: (formData.get("p2_relationship") as string) || "",
      firstName: (formData.get("p2_firstName") as string) || "",
      lastName: (formData.get("p2_lastName") as string) || "",
      email: (formData.get("p2_email") as string) || "",
      phone: (formData.get("p2_phone") as string) || "",
    };
  }

  const rawValues = {
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    roles,
    grantLoginAccess,
    parent1,
    parent2,
  };

  const parsed = CreateMemberProfileSchema.safeParse(rawValues);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path.join(".");
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { fieldErrors, submittedValues: rawValues };
  }

  const result = await createMemberProfile(
    {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      dateOfBirth: parsed.data.dateOfBirth || null,
      roles: parsed.data.roles,
      grantLoginAccess: parsed.data.grantLoginAccess,
      parent1,
      parent2,
    },
    adminSession.memberProfileId
  );

  if (!result.ok) {
    return {
      error: `admin.errors.${result.errorCode || "SAVE_FAILED"}`,
      submittedValues: rawValues,
    };
  }

  return {
    success: true,
    memberProfileId: result.memberProfileId,
    temporaryPassword: result.temporaryPassword,
    invitationSent: result.invitationSent,
    parentInvitationsSent: result.parentInvitationsSent,
  };
}
