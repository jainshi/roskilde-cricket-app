import { prisma } from "@/lib/db";
import { validateDelegationAccess } from "../domain/delegation-rules";
import { isMinor, calculateAge } from "../domain/age-rules";
import {
  Role,
  BattingPosition,
  BowlingStyle,
  SecondaryRole,
  ApparelSize,
} from "@prisma/client";

export interface FullMemberProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  dateOfBirth: Date | null;
  age: number | null;
  isMinor: boolean;
  category: "ADULT" | "YOUTH_13_17" | "YOUTH_UNDER_13";
  roles: Role[];
  battingPosition: BattingPosition | null;
  bowlingStyle: BowlingStyle | null;
  secondaryRoles: SecondaryRole[];
  shirtSize: ApparelSize | null;
  trouserSize: ApparelSize | null;
  capSize: ApparelSize | null;
  privacySettings: {
    showEmailInDirectory: boolean;
    showPhoneInDirectory: boolean;
    showAddressInDirectory: boolean;
  };
  primaryEmergencyContact: {
    id?: string;
    name: string;
    relationship: string;
    phone: string;
  } | null;
  linkedParents: {
    id: string;
    name: string;
    relationship: string | null;
    email: string | null;
    phone: string | null;
  }[];
  linkedChildren: {
    id: string;
    name: string;
    relationship: string | null;
  }[];
  isEmergencyContactIncomplete: boolean; // FR-052
  canEdit: boolean;
  isDelegated: boolean;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  dateOfBirth?: Date | null;
  battingPosition?: BattingPosition | null;
  bowlingStyle?: BowlingStyle | null;
  secondaryRoles?: SecondaryRole[];
  shirtSize?: ApparelSize | null;
  trouserSize?: ApparelSize | null;
  capSize?: ApparelSize | null;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  } | null;
  privacySettings?: {
    showEmailInDirectory: boolean;
    showPhoneInDirectory: boolean;
    showAddressInDirectory: boolean;
  };
}

/**
 * Retrieves the full profile of a member, validating that the actor is authorized
 * (self, linked parent via delegation, or Admin/Coach staff per FR-051, FR-057).
 */
export async function getMemberFullProfile(
  targetProfileId: string,
  actorProfileId: string
): Promise<FullMemberProfile | null> {
  const actor = await prisma.memberProfile.findUnique({
    where: { id: actorProfileId },
    select: {
      id: true,
      roleAssignments: { select: { role: true } },
      parentLinksAsParent: { select: { playerId: true } },
    },
  });

  if (!actor) return null;

  const actorRoles = actor.roleAssignments.map((ra) => ra.role);
  const linkedChildIds = actor.parentLinksAsParent.map((l) => l.playerId);

  const delegation = validateDelegationAccess(
    {
      profileId: actor.id,
      roles: actorRoles,
      linkedChildIds,
    },
    targetProfileId
  );

  const isStaff = actorRoles.includes("ADMIN") || actorRoles.includes("COACH");

  // If not authorized by delegation and not staff, deny access
  if (!delegation.authorized && !isStaff) {
    return null;
  }

  const target = await prisma.memberProfile.findUnique({
    where: { id: targetProfileId, isAnonymized: false },
    include: {
      roleAssignments: true,
      privacySettings: true,
      emergencyContacts: {
        where: { isPrimary: true },
        take: 1,
      },
      parentLinksAsPlayer: {
        include: {
          parent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { slot: "asc" },
      },
      parentLinksAsParent: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  if (!target) return null;

  const now = new Date();
  const minor = isMinor(target.dateOfBirth, now);
  const age = target.dateOfBirth ? calculateAge(target.dateOfBirth, now) : null;
  let category: "ADULT" | "YOUTH_13_17" | "YOUTH_UNDER_13" = "ADULT";
  if (minor) {
    category = age !== null && age < 13 ? "YOUTH_UNDER_13" : "YOUTH_13_17";
  }

  const roles = target.roleAssignments.map((ra) => ra.role);
  const primaryEmergency = target.emergencyContacts[0] || null;

  // FR-052: Profiles holding Player role without emergency contact are flagged incomplete
  const isPlayer = roles.includes("PLAYER");
  const isEmergencyContactIncomplete =
    isPlayer &&
    (!primaryEmergency ||
      !primaryEmergency.name.trim() ||
      !primaryEmergency.phone.trim());

  const privacy = target.privacySettings || {
    showEmailInDirectory: false,
    showPhoneInDirectory: false,
    showAddressInDirectory: false,
  };

  return {
    id: target.id,
    firstName: target.firstName,
    lastName: target.lastName,
    fullName: `${target.firstName} ${target.lastName}`.trim(),
    email: target.email,
    phone: target.phone,
    address: target.address,
    city: target.city,
    postalCode: target.postalCode,
    dateOfBirth: target.dateOfBirth,
    age,
    isMinor: minor,
    category,
    roles,
    battingPosition: target.battingPosition,
    bowlingStyle: target.bowlingStyle,
    secondaryRoles: target.secondaryRoles || [],
    shirtSize: target.shirtSize,
    trouserSize: target.trouserSize,
    capSize: target.capSize,
    privacySettings: {
      showEmailInDirectory: privacy.showEmailInDirectory,
      showPhoneInDirectory: privacy.showPhoneInDirectory,
      showAddressInDirectory: privacy.showAddressInDirectory,
    },
    primaryEmergencyContact: primaryEmergency
      ? {
          id: primaryEmergency.id,
          name: primaryEmergency.name,
          relationship: primaryEmergency.relationship,
          phone: primaryEmergency.phone,
        }
      : null,
    linkedParents: target.parentLinksAsPlayer.map((l) => ({
      id: l.parent.id,
      name: `${l.parent.firstName} ${l.parent.lastName}`.trim(),
      relationship: l.relationship,
      email: l.parent.email,
      phone: l.parent.phone,
    })),
    linkedChildren: target.parentLinksAsParent.map((l) => ({
      id: l.player.id,
      name: `${l.player.firstName} ${l.player.lastName}`.trim(),
      relationship: l.relationship,
    })),
    isEmergencyContactIncomplete,
    canEdit: delegation.authorized,
    isDelegated: delegation.isDelegated,
  };
}

/**
 * Updates a member's profile attributes, emergency contact, kit sizes, and privacy settings.
 * Enforces delegation authorization (self, linked parent, or Admin per FR-051).
 */
export async function updateMemberProfile(params: {
  targetProfileId: string;
  actorProfileId: string;
  input: UpdateProfileInput;
}): Promise<{ success: boolean; profileId: string }> {
  const { targetProfileId, actorProfileId, input } = params;

  // 1. Fetch actor context
  const actor = await prisma.memberProfile.findUnique({
    where: { id: actorProfileId },
    select: {
      id: true,
      roleAssignments: { select: { role: true } },
      parentLinksAsParent: { select: { playerId: true } },
    },
  });

  if (!actor) {
    throw new Error("Actor profile not found.");
  }

  const actorRoles = actor.roleAssignments.map((ra) => ra.role);
  const linkedChildIds = actor.parentLinksAsParent.map((l) => l.playerId);

  const delegation = validateDelegationAccess(
    {
      profileId: actor.id,
      roles: actorRoles,
      linkedChildIds,
    },
    targetProfileId
  );

  if (!delegation.authorized) {
    throw new Error("You are not authorized to edit this profile.");
  }

  // 2. Fetch existing target
  const target = await prisma.memberProfile.findUnique({
    where: { id: targetProfileId },
    include: {
      emergencyContacts: { where: { isPrimary: true }, take: 1 },
      privacySettings: true,
    },
  });

  if (!target) {
    throw new Error("Member profile not found.");
  }

  const targetIsMinor = isMinor(target.dateOfBirth);

  // FR-056: For minors, only linked parent or Admin can update privacy settings
  if (targetIsMinor && input.privacySettings) {
    const isParent = linkedChildIds.includes(targetProfileId);
    const isAdmin = actorRoles.includes("ADMIN");
    if (!isParent && !isAdmin) {
      throw new Error(
        "Only a linked parent or club administrator can modify privacy settings for a minor."
      );
    }
  }

  // 3. Execute update in Prisma transaction
  await prisma.$transaction(async (tx) => {
    // A. Update MemberProfile core & cricket fields
    const updateData: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      address?: string | null;
      city?: string | null;
      postalCode?: string | null;
      dateOfBirth?: Date | null;
      battingPosition?: BattingPosition | null;
      bowlingStyle?: BowlingStyle | null;
      secondaryRoles?: SecondaryRole[];
      shirtSize?: ApparelSize | null;
      trouserSize?: ApparelSize | null;
      capSize?: ApparelSize | null;
    } = {};

    if (input.firstName !== undefined) updateData.firstName = input.firstName.trim();
    if (input.lastName !== undefined) updateData.lastName = input.lastName.trim();
    if (input.phone !== undefined) updateData.phone = input.phone?.trim() || null;
    if (input.address !== undefined) updateData.address = input.address?.trim() || null;
    if (input.city !== undefined) updateData.city = input.city?.trim() || null;
    if (input.postalCode !== undefined) updateData.postalCode = input.postalCode?.trim() || null;

    // Only Admin can change DOB once set, or initial set if null
    if (input.dateOfBirth !== undefined && (actorRoles.includes("ADMIN") || !target.dateOfBirth)) {
      updateData.dateOfBirth = input.dateOfBirth;
    }

    if (input.battingPosition !== undefined) updateData.battingPosition = input.battingPosition;
    if (input.bowlingStyle !== undefined) updateData.bowlingStyle = input.bowlingStyle;
    if (input.secondaryRoles !== undefined) updateData.secondaryRoles = input.secondaryRoles;
    if (input.shirtSize !== undefined) updateData.shirtSize = input.shirtSize;
    if (input.trouserSize !== undefined) updateData.trouserSize = input.trouserSize;
    if (input.capSize !== undefined) updateData.capSize = input.capSize;

    await tx.memberProfile.update({
      where: { id: targetProfileId },
      data: updateData,
    });

    // B. Upsert Primary Emergency Contact (FR-050, FR-052)
    if (input.emergencyContact !== undefined) {
      const existingPrimary = target.emergencyContacts[0];
      if (input.emergencyContact && input.emergencyContact.name.trim()) {
        if (existingPrimary) {
          await tx.emergencyContact.update({
            where: { id: existingPrimary.id },
            data: {
              name: input.emergencyContact.name.trim(),
              relationship: input.emergencyContact.relationship.trim(),
              phone: input.emergencyContact.phone.trim(),
            },
          });
        } else {
          await tx.emergencyContact.create({
            data: {
              memberProfileId: targetProfileId,
              name: input.emergencyContact.name.trim(),
              relationship: input.emergencyContact.relationship.trim(),
              phone: input.emergencyContact.phone.trim(),
              isPrimary: true,
            },
          });
        }
      } else if (existingPrimary && input.emergencyContact === null) {
        // Removed emergency contact
        await tx.emergencyContact.delete({
          where: { id: existingPrimary.id },
        });
      }
    }

    // C. Upsert Privacy Settings (FR-054, FR-055, FR-056)
    if (input.privacySettings !== undefined) {
      await tx.privacySettings.upsert({
        where: { memberProfileId: targetProfileId },
        create: {
          memberProfileId: targetProfileId,
          showEmailInDirectory: input.privacySettings.showEmailInDirectory,
          showPhoneInDirectory: input.privacySettings.showPhoneInDirectory,
          showAddressInDirectory: input.privacySettings.showAddressInDirectory,
        },
        update: {
          showEmailInDirectory: input.privacySettings.showEmailInDirectory,
          showPhoneInDirectory: input.privacySettings.showPhoneInDirectory,
          showAddressInDirectory: input.privacySettings.showAddressInDirectory,
        },
      });
    }

    // D. Create Audit Log Entry
    await tx.auditLog.create({
      data: {
        actorProfileId,
        targetProfileId,
        action: "MEMBER_PROFILE_UPDATED",
        metadata: {
          delegated: delegation.isDelegated,
          updatedFields: Object.keys(input),
        },
      },
    });
  });

  return { success: true, profileId: targetProfileId };
}
