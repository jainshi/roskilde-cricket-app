import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { isMinor } from "../domain/age-rules";
import {
  assertCanModifyAdminStatus,
  LastAdminSafeguardError,
} from "../domain/admin-safeguard";

export interface MemberRoleDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  dateOfBirth: Date | null;
  isMinor: boolean;
  roles: Role[];
  totalActiveAdmins: number;
}

/**
 * Counts all active, non-deactivated, non-anonymized members who hold the ADMIN role.
 */
export async function countActiveAdmins(): Promise<number> {
  const adminProfiles = await prisma.memberProfile.findMany({
    where: {
      isAnonymized: false,
      roleAssignments: {
        some: {
          role: Role.ADMIN,
        },
      },
      OR: [
        { userAccount: null },
        { userAccount: { status: { not: "DEACTIVATED" } } },
      ],
    },
    select: { id: true },
  });

  return adminProfiles.length;
}

/**
 * Retrieves member details and current roles for Admin role management view.
 */
export async function getMemberRoleDetails(
  memberProfileId: string
): Promise<MemberRoleDetails | null> {
  const member = await prisma.memberProfile.findUnique({
    where: { id: memberProfileId },
    include: {
      roleAssignments: true,
    },
  });

  if (!member) return null;

  const totalActiveAdmins = await countActiveAdmins();
  const currentRoles = member.roleAssignments.map((ra) => ra.role);
  const minorStatus = isMinor(member.dateOfBirth);

  return {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    dateOfBirth: member.dateOfBirth,
    isMinor: minorStatus,
    roles: currentRoles,
    totalActiveAdmins,
  };
}

export interface UpdateRolesParams {
  actorProfileId: string;
  targetProfileId: string;
  newRoles: Role[];
}

/**
 * Assigns or revokes roles for a member profile (FR-003, FR-004, FR-005).
 * Validates minor restrictions (<18 can only have PLAYER role) and prevents
 * removing the last Administrator.
 */
export async function updateMemberRoles(params: UpdateRolesParams): Promise<{
  success: boolean;
  roles: Role[];
}> {
  const { actorProfileId, targetProfileId, newRoles } = params;

  // 1. Fetch target member and current roles
  const target = await prisma.memberProfile.findUnique({
    where: { id: targetProfileId },
    include: {
      roleAssignments: true,
      userAccount: true,
    },
  });

  if (!target) {
    throw new Error("Target member profile not found.");
  }

  const currentRoles = target.roleAssignments.map((ra) => ra.role);
  const targetIsMinor = isMinor(target.dateOfBirth);

  // 2. Validate at least one role is assigned
  if (!newRoles || newRoles.length === 0) {
    throw new Error("A member must be assigned at least one role.");
  }

  // 3. Minor Role Restriction (FR-004): Members under 18 MUST only be assignable the Player role
  if (targetIsMinor) {
    const invalidRoles = newRoles.filter((r) => r !== Role.PLAYER);
    if (invalidRoles.length > 0) {
      throw new Error(
        `Members under 18 can only be assigned the Player role (FR-004). Attempted to assign: ${invalidRoles.join(
          ", "
        )}`
      );
    }
  }

  // 4. Admin Safeguard (FR-005): System MUST always retain at least one active Admin
  const targetIsAdmin = currentRoles.includes(Role.ADMIN);
  const removingAdmin = targetIsAdmin && !newRoles.includes(Role.ADMIN);

  if (removingAdmin) {
    const totalActiveAdmins = await countActiveAdmins();
    assertCanModifyAdminStatus("REVOKE_ROLE", {
      activeAdminCount: totalActiveAdmins,
      isTargetActiveAdmin: true,
    });
  }

  // 5. Execute atomic role replacement in database transaction
  await prisma.$transaction(async (tx) => {
    // Delete existing role assignments
    await tx.roleAssignment.deleteMany({
      where: { memberProfileId: targetProfileId },
    });

    // Create new role assignments
    await tx.roleAssignment.createMany({
      data: newRoles.map((role) => ({
        memberProfileId: targetProfileId,
        role,
        assignedById: actorProfileId,
      })),
    });

    // Record audit log entry
    await tx.auditLog.create({
      data: {
        actorProfileId,
        targetProfileId,
        action: "ROLE_ASSIGNMENT_UPDATE",
        metadata: {
          previousRoles: currentRoles,
          newRoles,
        },
      },
    });
  });

  return {
    success: true,
    roles: newRoles,
  };
}
