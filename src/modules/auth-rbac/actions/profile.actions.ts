"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "../services/session-guard";
import {
  updateMemberProfile,
  UpdateProfileInput,
} from "../services/profile.service";
import {
  BattingPosition,
  BowlingStyle,
  SecondaryRole,
  ApparelSize,
} from "@prisma/client";

export interface ProfileActionState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function updateProfileAction(
  prevState: ProfileActionState | null,
  formData: FormData
): Promise<ProfileActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "You must be signed in to update a profile." };
  }

  const targetProfileId = formData.get("targetProfileId") as string;
  if (!targetProfileId) {
    return { success: false, error: "Target profile ID is missing." };
  }

  const firstName = (formData.get("firstName") as string) || "";
  const lastName = (formData.get("lastName") as string) || "";
  const phone = (formData.get("phone") as string) || "";
  const address = (formData.get("address") as string) || "";
  const city = (formData.get("city") as string) || "";
  const postalCode = (formData.get("postalCode") as string) || "";

  if (!firstName.trim() || !lastName.trim()) {
    return {
      success: false,
      error: "First name and last name are required.",
      fieldErrors: {
        firstName: !firstName.trim() ? "First name is required" : "",
        lastName: !lastName.trim() ? "Last name is required" : "",
      },
    };
  }

  // Emergency contact
  const emergencyName = (formData.get("emergencyName") as string) || "";
  const emergencyRelationship = (formData.get("emergencyRelationship") as string) || "";
  const emergencyPhone = (formData.get("emergencyPhone") as string) || "";

  // Cricket attributes
  const battingPosition = (formData.get("battingPosition") as BattingPosition) || null;
  const bowlingStyle = (formData.get("bowlingStyle") as BowlingStyle) || null;
  const secondaryRolesRaw = formData.getAll("secondaryRoles") as SecondaryRole[];

  // Apparel / Kit sizes
  const shirtSize = (formData.get("shirtSize") as ApparelSize) || null;
  const trouserSize = (formData.get("trouserSize") as ApparelSize) || null;
  const capSize = (formData.get("capSize") as ApparelSize) || null;

  // Privacy toggles (checkboxes submit "on" if checked)
  const showEmailInDirectory = formData.get("showEmailInDirectory") === "on";
  const showPhoneInDirectory = formData.get("showPhoneInDirectory") === "on";
  const showAddressInDirectory = formData.get("showAddressInDirectory") === "on";

  const input: UpdateProfileInput = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone: phone.trim() || null,
    address: address.trim() || null,
    city: city.trim() || null,
    postalCode: postalCode.trim() || null,
    battingPosition: battingPosition || null,
    bowlingStyle: bowlingStyle || null,
    secondaryRoles: secondaryRolesRaw.length > 0 ? secondaryRolesRaw : [],
    shirtSize: shirtSize || null,
    trouserSize: trouserSize || null,
    capSize: capSize || null,
    emergencyContact: emergencyName.trim()
      ? {
          name: emergencyName.trim(),
          relationship: emergencyRelationship.trim() || "Emergency Contact",
          phone: emergencyPhone.trim(),
        }
      : null,
    privacySettings: {
      showEmailInDirectory,
      showPhoneInDirectory,
      showAddressInDirectory,
    },
  };

  try {
    await updateMemberProfile({
      targetProfileId,
      actorProfileId: session.memberProfileId,
      input,
    });

    revalidatePath(`/profile/${targetProfileId}`);
    revalidatePath("/profile");
    revalidatePath("/directory");
    revalidatePath("/admin/members");

    return { success: true };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to update profile.";
    return { success: false, error: errorMsg };
  }
}
