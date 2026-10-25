import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import {
  validateParentChildLink,
  MAX_PARENTS_PER_YOUTH,
} from "../domain/parent-child-rules";
import { isMinor } from "../domain/age-rules";

export interface ParentLinkItem {
  id: string;
  slot: number;
  relationship: string | null;
  parentId: string;
  parentName: string;
  parentEmail: string | null;
  parentPhone: string | null;
  createdAt: Date;
}

export interface LinkedYouthItem {
  id: string;
  playerId: string;
  playerName: string;
  playerDateOfBirth: Date | null;
  playerEmail: string | null;
  relationship: string | null;
  slot: number;
}

/**
 * Retrieves all linked parents for a given player profile.
 */
export async function getParentChildLinksForPlayer(
  playerId: string
): Promise<ParentLinkItem[]> {
  const links = await prisma.parentChildLink.findMany({
    where: { playerId },
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
  });

  return links.map((l) => ({
    id: l.id,
    slot: l.slot,
    relationship: l.relationship,
    parentId: l.parent.id,
    parentName: `${l.parent.firstName} ${l.parent.lastName}`.trim(),
    parentEmail: l.parent.email,
    parentPhone: l.parent.phone,
    createdAt: l.createdAt,
  }));
}

/**
 * Retrieves all linked youth players for a parent profile.
 * Used by the Header Profile Switcher and parent management views.
 */
export async function getLinkedYouthForParent(
  parentId: string
): Promise<LinkedYouthItem[]> {
  const links = await prisma.parentChildLink.findMany({
    where: { parentId },
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          email: true,
        },
      },
    },
    orderBy: { slot: "asc" },
  });

  return links.map((l) => ({
    id: l.id,
    playerId: l.player.id,
    playerName: `${l.player.firstName} ${l.player.lastName}`.trim(),
    playerDateOfBirth: l.player.dateOfBirth,
    playerEmail: l.player.email,
    relationship: l.relationship,
    slot: l.slot,
  }));
}

/**
 * Links a parent to a youth player profile (FR-030, FR-031).
 * Enforces maximum 2 parents per youth, unique slots, and automatically
 * grants the PARENT role to the linked member if not already assigned.
 */
export async function addParentChildLink(params: {
  actorProfileId: string;
  playerId: string;
  parentId: string;
  slot: number;
  relationship?: string;
}): Promise<{ success: boolean; linkId: string }> {
  const { actorProfileId, playerId, parentId, slot, relationship } = params;

  // 1. Verify player and parent profiles exist
  const [player, parent] = await Promise.all([
    prisma.memberProfile.findUnique({
      where: { id: playerId },
      include: {
        parentLinksAsPlayer: true,
      },
    }),
    prisma.memberProfile.findUnique({
      where: { id: parentId },
      include: {
        roleAssignments: true,
      },
    }),
  ]);

  if (!player) {
    throw new Error("Youth player profile not found.");
  }
  if (!parent) {
    throw new Error("Parent profile not found.");
  }

  // 2. Age status checks (FR-004, FR-030)
  const childIsMinor = isMinor(player.dateOfBirth);
  const parentIsMinor = isMinor(parent.dateOfBirth);

  if (!childIsMinor) {
    throw new Error(
      "Parent/guardian links can only be assigned to youth players under 18 years of age (FR-030). Adult members manage their own profiles."
    );
  }

  if (parentIsMinor) {
    throw new Error(
      "Minors under 18 cannot be linked as parents (FR-004, FR-030). Parents must be adult members."
    );
  }

  // 3. Pure domain validation
  const existingLinks = player.parentLinksAsPlayer.map((l) => ({
    id: l.id,
    parentId: l.parentId,
    slot: l.slot,
  }));

  const validation = validateParentChildLink({
    playerId,
    parentId,
    slot,
    existingLinks,
    childIsMinor,
    parentIsMinor,
  });

  if (!validation.valid) {
    throw new Error(validation.errorMessage || "Invalid parent link.");
  }

  // 4. Execute link creation in atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    const link = await tx.parentChildLink.create({
      data: {
        playerId,
        parentId,
        slot,
        relationship: relationship?.trim() || null,
      },
    });

    // Ensure parent has PARENT role assigned
    const hasParentRole = parent.roleAssignments.some(
      (ra) => ra.role === Role.PARENT
    );
    if (!hasParentRole) {
      await tx.roleAssignment.create({
        data: {
          memberProfileId: parentId,
          role: Role.PARENT,
          assignedById: actorProfileId,
        },
      });
    }

    // Audit log entry
    await tx.auditLog.create({
      data: {
        actorProfileId,
        targetProfileId: playerId,
        action: "PARENT_CHILD_LINK_CREATED",
        metadata: {
          parentId,
          slot,
          relationship,
        },
      },
    });

    return link;
  });

  return { success: true, linkId: result.id };
}

/**
 * Removes a parent-child link (FR-031).
 */
export async function removeParentChildLink(params: {
  actorProfileId: string;
  linkId: string;
}): Promise<{ success: boolean }> {
  const { actorProfileId, linkId } = params;

  const link = await prisma.parentChildLink.findUnique({
    where: { id: linkId },
  });

  if (!link) {
    throw new Error("Parent-child link not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.parentChildLink.delete({
      where: { id: linkId },
    });

    await tx.auditLog.create({
      data: {
        actorProfileId,
        targetProfileId: link.playerId,
        action: "PARENT_CHILD_LINK_REMOVED",
        metadata: {
          removedParentId: link.parentId,
          slot: link.slot,
        },
      },
    });
  });

  return { success: true };
}
