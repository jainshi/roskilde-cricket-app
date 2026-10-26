import { prisma } from "@/lib/db";
import { computeAnonymizedShell } from "../domain/anonymization-rules";
import { validateDelegationAccess } from "../domain/delegation-rules";
import { notificationService } from "../notifications/notification.service";
import { hasActiveOrOverdueLoans } from "@/modules/inventory/services/inventory-gdpr.service";

export interface DeletionRequestItem {
  id: string;
  targetProfileId: string;
  targetName: string;
  requesterProfileId: string;
  requesterName: string;
  requestedAt: Date;
  reason?: string;
  isAlreadyAnonymized: boolean;
}

/**
 * Requests account deletion under GDPR Article 17 (Right to Erasure / FR-074).
 * Members can request for themselves, and parents can request for linked youth (FR-074, FR-075).
 */
export async function requestMemberDeletion(params: {
  targetProfileId: string;
  requesterProfileId: string;
  reason?: string;
}): Promise<{ success: boolean; requiresAdminApproval: boolean }> {
  const { targetProfileId, requesterProfileId, reason } = params;

  // 1. Authorization check
  const requester = await prisma.memberProfile.findUnique({
    where: { id: requesterProfileId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      roleAssignments: { select: { role: true } },
      parentLinksAsParent: { select: { playerId: true } },
    },
  });

  if (!requester) {
    throw new Error("Requester profile not found.");
  }

  const requesterRoles = requester.roleAssignments.map((ra) => ra.role);
  const linkedChildIds = requester.parentLinksAsParent.map((l) => l.playerId);

  const delegation = validateDelegationAccess(
    {
      profileId: requester.id,
      roles: requesterRoles,
      linkedChildIds,
    },
    targetProfileId
  );

  if (!delegation.authorized) {
    throw new Error("You are not authorized to request deletion for this profile.");
  }

  const target = await prisma.memberProfile.findUnique({
    where: { id: targetProfileId },
    include: {
      parentLinksAsPlayer: {
        include: {
          parent: { select: { id: true, email: true, firstName: true } },
        },
      },
    },
  });

  if (!target || target.isAnonymized) {
    throw new Error("Target profile is not active or already anonymized.");
  }

  // Cross-Module Inventory Safeguard: Block deletion requests if active/overdue equipment loans exist
  const loanCheck = await hasActiveOrOverdueLoans(targetProfileId);
  if (loanCheck.hasActiveLoans) {
    throw new Error(loanCheck.blockingReason || "Cannot request account deletion: active equipment loans must be returned first.");
  }

  // 2. Log deletion request in AuditLog
  await prisma.auditLog.create({
    data: {
      actorProfileId: requesterProfileId,
      targetProfileId,
      action: "GDPR_DELETION_REQUESTED",
      metadata: {
        reason: reason || "User requested GDPR erasure",
        isDelegated: delegation.isDelegated,
      },
    },
  });

  // 3. FR-075: When one parent requests deletion of a linked youth, notify the other linked parent
  if (delegation.isDelegated && target.parentLinksAsPlayer.length > 1) {
    const otherParentLinks = target.parentLinksAsPlayer.filter(
      (pl) => pl.parent.id !== requesterProfileId
    );

    for (const pl of otherParentLinks) {
      if (pl.parent.email) {
        await notificationService.sendEmail({
          to: pl.parent.email,
          subject: `GDPR Deletion Request Notice for ${target.firstName} ${target.lastName}`,
          html: `<p>Hello ${pl.parent.firstName},</p>
<p>A deletion request under GDPR Article 17 has been submitted for your linked youth player <strong>${target.firstName} ${target.lastName}</strong> by ${requester.firstName} ${requester.lastName}.</p>
<p>Club administration will review this request.</p>`,
        });
      }
    }
  }

  return { success: true, requiresAdminApproval: true };
}

/**
 * Executes irreversible GDPR account anonymization (FR-074).
 * Must be executed by an Admin or upon approved deletion request.
 * - Scrubs all PII (name, email, phone, physical address, emergency contact, date of birth)
 * - Revokes login credentials and sessions
 * - Severs parent-child linkages
 * - Converts the profile to a permanent statistical shell record ("Former Member #...")
 */
export async function executeMemberAnonymization(params: {
  targetProfileId: string;
  adminProfileId: string;
}): Promise<{ success: boolean; shellName: string }> {
  const { targetProfileId, adminProfileId } = params;

  // 1. Verify Admin authority
  const admin = await prisma.memberProfile.findUnique({
    where: { id: adminProfileId },
    select: {
      id: true,
      roleAssignments: { select: { role: true } },
    },
  });

  if (!admin || !admin.roleAssignments.some((ra) => ra.role === "ADMIN")) {
    throw new Error("Only club administrators can execute GDPR account anonymization.");
  }

  const target = await prisma.memberProfile.findUnique({
    where: { id: targetProfileId },
    include: {
      userAccount: true,
      parentLinksAsPlayer: true,
      parentLinksAsParent: true,
    },
  });

  if (!target) {
    throw new Error("Target profile not found.");
  }

  if (target.isAnonymized) {
    throw new Error("This profile has already been anonymized.");
  }

  // Cross-Module Inventory Safeguard: Block irreversible anonymization if active/overdue equipment loans exist
  const loanCheck = await hasActiveOrOverdueLoans(targetProfileId);
  if (loanCheck.hasActiveLoans) {
    throw new Error(loanCheck.blockingReason || "Cannot anonymize member: active or overdue equipment loans must be returned first.");
  }

  const shell = computeAnonymizedShell(target);

  // 2. Execute scrub and severance in atomic transaction
  await prisma.$transaction(async (tx) => {
    // A. Sever all parent-child links
    await tx.parentChildLink.deleteMany({
      where: {
        OR: [
          { playerId: targetProfileId },
          { parentId: targetProfileId },
        ],
      },
    });

    // B. Delete emergency contacts
    await tx.emergencyContact.deleteMany({
      where: { memberProfileId: targetProfileId },
    });

    // C. Delete privacy settings
    await tx.privacySettings.deleteMany({
      where: { memberProfileId: targetProfileId },
    });

    // D. Purge user account and sessions if present
    if (target.userAccount) {
      await tx.userAccount.delete({
        where: { id: target.userAccount.id },
      });
    }

    // E. Strip all assigned roles
    await tx.roleAssignment.deleteMany({
      where: { memberProfileId: targetProfileId },
    });

    // F. Transform MemberProfile into immutable anonymized shell
    await tx.memberProfile.update({
      where: { id: targetProfileId },
      data: {
        firstName: shell.firstName,
        lastName: shell.lastName,
        email: null,
        phone: null,
        address: null,
        city: null,
        postalCode: null,
        dateOfBirth: null,
        isAnonymized: true,
      },
    });

    // F2. Module 3: Scrub personal transport notes from RSVPs while preserving RSVP history & appearances
    await tx.eventRsvp.updateMany({
      where: { memberProfileId: targetProfileId },
      data: { transportNote: null },
    });

    // F3. Module 3: Scrub personal notes from Attendance records while preserving municipal attendance tallies
    await tx.eventAttendance.updateMany({
      where: { memberProfileId: targetProfileId },
      data: { notes: null },
    });

    // F4. Module 3: Deactivate active squad roster memberships
    await tx.teamRosterMember.updateMany({
      where: { memberProfileId: targetProfileId },
      data: { isActive: false },
    });

    // F5. Module 3: Remove any coach assignments
    await tx.teamCoachAssignment.deleteMany({
      where: { coachProfileId: targetProfileId },
    });

    // G. Create permanent AuditLog entry
    await tx.auditLog.create({
      data: {
        actorProfileId: adminProfileId,
        targetProfileId,
        action: "GDPR_MEMBER_ANONYMIZED",
        metadata: {
          previousName: `${target.firstName[0]}*** ${target.lastName[0]}***`,
          shellName: `${shell.firstName} ${shell.lastName}`,
          executedAt: new Date().toISOString(),
        },
      },
    });
  });

  return { success: true, shellName: `${shell.firstName} ${shell.lastName}` };
}

/**
 * Retrieves pending GDPR deletion requests for the Admin review dashboard (FR-074).
 */
export async function getPendingDeletionRequests(): Promise<DeletionRequestItem[]> {
  const requestLogs = await prisma.auditLog.findMany({
    where: {
      action: "GDPR_DELETION_REQUESTED",
    },
    include: {
      actorProfile: { select: { firstName: true, lastName: true } },
      targetProfile: { select: { firstName: true, lastName: true, isAnonymized: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return requestLogs.map((log) => ({
    id: log.id,
    targetProfileId: log.targetProfileId || "",
    targetName: log.targetProfile
      ? `${log.targetProfile.firstName} ${log.targetProfile.lastName}`
      : "Unknown Profile",
    requesterProfileId: log.actorProfileId || "",
    requesterName: log.actorProfile
      ? `${log.actorProfile.firstName} ${log.actorProfile.lastName}`
      : "Unknown Requester",
    requestedAt: log.createdAt,
    reason: (log.metadata as any)?.reason || undefined,
    isAlreadyAnonymized: log.targetProfile?.isAnonymized ?? false,
  }));
}
