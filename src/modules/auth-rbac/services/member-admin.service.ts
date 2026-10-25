import { prisma } from "@/lib/db";
import { calculateAge, isMinor } from "../domain/age-rules";
import type { Role, AccountStatus } from "@prisma/client";

export interface AdminMemberListItem {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  age: number | null;
  isMinor: boolean;
  category: "ADULT" | "YOUTH_13_17" | "YOUTH_UNDER_13";
  roles: Role[];
  accountStatus: AccountStatus | "NO_ACCOUNT";
  mustResetPassword: boolean | null;
  effectiveContactEmail: string | null;
  effectiveContactPhone: string | null;
  linkedParents: { id: string; name: string; relationship: string | null; email: string | null }[];
  linkedChildren: { id: string; name: string; relationship: string | null }[];
  createdAt: Date;
}

/**
 * Retrieves all club members formatted with effective contacts, roles,
 * account credentials state, and parent/child linkage info for Admin management.
 */
export async function getAllMembersForAdmin(): Promise<AdminMemberListItem[]> {
  const members = await prisma.memberProfile.findMany({
    where: {
      isAnonymized: false,
    },
    include: {
      userAccount: {
        select: {
          id: true,
          status: true,
          mustResetPassword: true,
        },
      },
      roleAssignments: {
        select: {
          role: true,
        },
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
    orderBy: [
      { lastName: "asc" },
      { firstName: "asc" },
    ],
  });

  const now = new Date();

  return members.map((m) => {
    const age = m.dateOfBirth ? calculateAge(m.dateOfBirth, now) : null;
    const minor = isMinor(m.dateOfBirth, now);
    const roles = m.roleAssignments.map((ra) => ra.role);

    let category: "ADULT" | "YOUTH_13_17" | "YOUTH_UNDER_13" = "ADULT";
    if (minor && age !== null) {
      category = age < 13 ? "YOUTH_UNDER_13" : "YOUTH_13_17";
    }

    const linkedParents = m.parentLinksAsPlayer.map((link) => ({
      id: link.parent.id,
      name: `${link.parent.firstName} ${link.parent.lastName}`,
      relationship: link.relationship,
      email: link.parent.email,
    }));

    const linkedChildren = m.parentLinksAsParent.map((link) => ({
      id: link.player.id,
      name: `${link.player.firstName} ${link.player.lastName}`,
      relationship: link.relationship,
    }));

    // Effective contact resolution (dual parent fallback for youth without direct contacts)
    let effectiveContactEmail = m.email;
    let effectiveContactPhone = m.phone;

    if (!effectiveContactEmail && linkedParents.length > 0) {
      effectiveContactEmail = linkedParents.map((p) => p.email).filter(Boolean).join(" / ") || null;
    }

    const accountStatus: AccountStatus | "NO_ACCOUNT" = m.userAccount
      ? m.userAccount.status
      : "NO_ACCOUNT";

    return {
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      fullName: `${m.firstName} ${m.lastName}`,
      email: m.email,
      phone: m.phone,
      dateOfBirth: m.dateOfBirth,
      age,
      isMinor: minor,
      category,
      roles,
      accountStatus,
      mustResetPassword: m.userAccount?.mustResetPassword ?? null,
      effectiveContactEmail,
      effectiveContactPhone,
      linkedParents,
      linkedChildren,
      createdAt: m.createdAt,
    };
  });
}
