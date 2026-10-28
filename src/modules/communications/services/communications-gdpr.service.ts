import { prisma } from "@/lib/db";
import { Prisma, VolunteerSlotStatus } from "@prisma/client";

export interface CommunicationsGdprExportData {
  authoredAnnouncements: Array<{
    id: string;
    title: string;
    slug: string;
    category: string;
    priority: string;
    publishedAt: string;
  }>;
  readReceipts: Array<{
    announcementId: string;
    announcementTitle: string;
    readAt: string;
  }>;
  volunteerDutyHistory: Array<{
    slotId: string;
    eventId: string;
    eventTitle: string;
    eventDate: string;
    dutyType: string;
    status: string;
    claimedAt: string | null;
    carpoolSeats: number | null;
  }>;
  signedDocuments: Array<{
    documentId: string;
    documentTitle: string;
    category: string;
    versionSigned: string;
    signedAt: string;
  }>;
}

/**
 * Vacate all upcoming volunteer duty slots held by the member undergoing erasure.
 * Reverts slots to OPEN so the squad can refill the match-day role.
 */
export async function vacateUpcomingVolunteerDuties(
  memberProfileId: string,
  tx?: Prisma.TransactionClient
): Promise<number> {
  const client = tx || prisma;
  if (!client?.volunteerDutySlot?.findMany) return 0;

  const now = new Date();

  // Find upcoming duty slots assigned to this member
  const upcomingSlots = await client.volunteerDutySlot.findMany({
    where: {
      assignedProfileId: memberProfileId,
      scheduledEvent: {
        startAt: { gte: now },
      },
    },
    select: { id: true },
  });

  if (upcomingSlots.length === 0) return 0;

  const slotIds = upcomingSlots.map((s) => s.id);

  const updated = await client.volunteerDutySlot.updateMany({
    where: {
      id: { in: slotIds },
    },
    data: {
      assignedProfileId: null,
      status: VolunteerSlotStatus.OPEN,
      claimedAt: null,
      swapRequestedAt: null,
      swapReason: null,
      carpoolSeats: null,
      notes: null,
    },
  });

  return updated.count;
}

/**
 * Anonymize historical concluded volunteer duty slots and digital sign-offs.
 * Scrubs personal notes, carpool notes, IP addresses, and user-agent strings.
 */
export async function scrubCommunicationsAndVolunteerData(
  memberProfileId: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx || prisma;
  const now = new Date();

  // 1. Scrub notes and swap reasons on past concluded volunteer duties
  if (client?.volunteerDutySlot?.updateMany) {
    await client.volunteerDutySlot.updateMany({
      where: {
        assignedProfileId: memberProfileId,
        scheduledEvent: {
          startAt: { lt: now },
        },
      },
      data: {
        notes: null,
        swapReason: null,
      },
    });
  }

  // 2. Delete announcement read receipts (personal activity tracking)
  if (client?.announcementReadReceipt?.deleteMany) {
    await client.announcementReadReceipt.deleteMany({
      where: { memberProfileId },
    });
  }

  // 3. Scrub IP addresses and User-Agent telemetry from policy sign-off audit logs
  if (client?.documentSignOff?.updateMany) {
    await client.documentSignOff.updateMany({
      where: { memberProfileId },
      data: {
        ipAddress: null,
        userAgent: null,
      },
    });
  }
}

/**
 * Extract communications, volunteer, and governance data for GDPR Article 20 data portability export.
 */
export async function getCommunicationsGdprExportData(
  memberProfileId: string
): Promise<CommunicationsGdprExportData> {
  if (
    !prisma?.announcement?.findMany ||
    !prisma?.announcementReadReceipt?.findMany ||
    !prisma?.volunteerDutySlot?.findMany ||
    !prisma?.documentSignOff?.findMany
  ) {
    return {
      authoredAnnouncements: [],
      readReceipts: [],
      volunteerDutyHistory: [],
      signedDocuments: [],
    };
  }

  const [announcements, readReceipts, volunteerSlots, signOffs] = await Promise.all([
    // Authored announcements
    prisma.announcement.findMany({
      where: { authorProfileId: memberProfileId },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        priority: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: "desc" },
    }),

    // Announcement read receipts
    prisma.announcementReadReceipt.findMany({
      where: { memberProfileId },
      include: {
        announcement: {
          select: { title: true },
        },
      },
      orderBy: { readAt: "desc" },
    }),

    // Volunteer duty history
    prisma.volunteerDutySlot.findMany({
      where: { assignedProfileId: memberProfileId },
      include: {
        scheduledEvent: {
          select: { title: true, startAt: true },
        },
      },
      orderBy: {
        scheduledEvent: {
          startAt: "desc",
        },
      },
    }),

    // Signed club governance policies
    prisma.documentSignOff.findMany({
      where: { memberProfileId },
      include: {
        document: {
          select: { title: true, category: true },
        },
      },
      orderBy: { signedAt: "desc" },
    }),
  ]);

  return {
    authoredAnnouncements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      category: a.category,
      priority: a.priority,
      publishedAt: a.publishedAt.toISOString(),
    })),
    readReceipts: readReceipts.map((r) => ({
      announcementId: r.announcementId,
      announcementTitle: r.announcement.title,
      readAt: r.readAt.toISOString(),
    })),
    volunteerDutyHistory: volunteerSlots.map((s) => ({
      slotId: s.id,
      eventId: s.eventId,
      eventTitle: s.scheduledEvent.title,
      eventDate: s.scheduledEvent.startAt.toISOString(),
      dutyType: s.dutyType,
      status: s.status,
      claimedAt: s.claimedAt ? s.claimedAt.toISOString() : null,
      carpoolSeats: s.carpoolSeats,
    })),
    signedDocuments: signOffs.map((so) => ({
      documentId: so.documentId,
      documentTitle: so.document.title,
      category: so.document.category,
      versionSigned: so.versionSigned,
      signedAt: so.signedAt.toISOString(),
    })),
  };
}
