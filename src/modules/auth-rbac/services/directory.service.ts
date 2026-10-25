import { prisma } from "@/lib/db";
import {
  sanitizeMemberForDirectory,
  filterDirectoryMembers,
  DirectoryFilters,
  DirectoryViewerContext,
  SanitizedDirectoryMember,
} from "../domain/directory-privacy";

export async function getDirectoryMembers(
  viewerProfileId: string,
  filters: DirectoryFilters = {}
): Promise<SanitizedDirectoryMember[]> {
  // 1. Resolve viewer's roles and linked children
  const viewerProfile = await prisma.memberProfile.findUnique({
    where: { id: viewerProfileId },
    select: {
      id: true,
      roleAssignments: { select: { role: true } },
      parentLinksAsParent: { select: { playerId: true } },
    },
  });

  if (!viewerProfile) {
    throw new Error("Viewer profile not found.");
  }

  const viewerContext: DirectoryViewerContext = {
    viewerProfileId,
    viewerRoles: viewerProfile.roleAssignments.map((ra) => ra.role),
    linkedChildIds: viewerProfile.parentLinksAsParent.map((l) => l.playerId),
  };

  // 2. Fetch all non-anonymized members
  const rawMembers = await prisma.memberProfile.findMany({
    where: {
      isAnonymized: false,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      postalCode: true,
      dateOfBirth: true,
      battingPosition: true,
      bowlingStyle: true,
      secondaryRoles: true,
      isAnonymized: true,
      roleAssignments: {
        select: { role: true },
      },
      privacySettings: {
        select: {
          showEmailInDirectory: true,
          showPhoneInDirectory: true,
          showAddressInDirectory: true,
        },
      },
    },
    orderBy: [
      { lastName: "asc" },
      { firstName: "asc" },
    ],
  });

  const now = new Date();

  // 3. Privacy sanitize and mask every member on the server
  const sanitizedList: SanitizedDirectoryMember[] = [];
  for (const m of rawMembers) {
    const sanitized = sanitizeMemberForDirectory(m, viewerContext, now);
    if (sanitized) {
      sanitizedList.push(sanitized);
    }
  }

  // 4. Apply search & attribute filters
  return filterDirectoryMembers(sanitizedList, filters);
}
