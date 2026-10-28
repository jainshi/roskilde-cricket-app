import { describe, it, expect, vi, beforeEach } from "vitest";
import { VolunteerSlotStatus, VolunteerDutyType, DocumentCategory, AnnouncementCategory, AnnouncementPriority } from "@prisma/client";
import {
  vacateUpcomingVolunteerDuties,
  scrubCommunicationsAndVolunteerData,
  getCommunicationsGdprExportData,
} from "@/modules/communications/services/communications-gdpr.service";
import { executeMemberAnonymization } from "@/modules/auth-rbac/services/gdpr-deletion.service";
import { generateGdprExport } from "@/modules/auth-rbac/services/gdpr-export.service";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    memberProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    parentChildLink: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    emergencyContact: {
      deleteMany: vi.fn(),
    },
    privacySettings: {
      deleteMany: vi.fn(),
    },
    userAccount: {
      delete: vi.fn(),
    },
    roleAssignment: {
      deleteMany: vi.fn(),
    },
    eventRsvp: {
      updateMany: vi.fn(),
    },
    eventAttendance: {
      updateMany: vi.fn(),
    },
    teamRosterMember: {
      updateMany: vi.fn(),
    },
    teamCoachAssignment: {
      deleteMany: vi.fn(),
    },
    memberSubscription: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    paymentTransaction: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    volunteerDutySlot: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    announcement: {
      findMany: vi.fn(),
    },
    announcementReadReceipt: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    documentSignOff: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => {
      return await cb(prisma);
    }),
  },
}));

vi.mock("@/modules/inventory/services/inventory-gdpr.service", () => ({
  hasActiveOrOverdueLoans: vi.fn().mockResolvedValue({
    hasActiveLoans: false,
    activeLoanCount: 0,
    items: [],
  }),
}));

vi.mock("@/modules/finance/services/finance-gdpr.service", () => ({
  hasOpenInvoicesOrBalances: vi.fn().mockResolvedValue({
    hasOpenInvoices: false,
    blockingReason: null,
  }),
}));

describe("GDPR Article 17 & 20 Communications and Volunteer Guard (T040)", () => {
  const memberId = "profile-volunteer-member-001";
  const adminProfileId = "admin-profile-001";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("vacateUpcomingVolunteerDuties (Article 17 upcoming slot vacation)", () => {
    it("vacates future duty slots by resetting them to OPEN and nulling assignment metadata", async () => {
      (prisma.volunteerDutySlot.findMany as any).mockResolvedValueOnce([
        { id: "slot-future-1" },
        { id: "slot-future-2" },
      ]);
      (prisma.volunteerDutySlot.updateMany as any).mockResolvedValueOnce({ count: 2 });

      const vacatedCount = await vacateUpcomingVolunteerDuties(memberId);

      expect(vacatedCount).toBe(2);
      expect(prisma.volunteerDutySlot.findMany).toHaveBeenCalledWith({
        where: {
          assignedProfileId: memberId,
          scheduledEvent: {
            startAt: { gte: expect.any(Date) },
          },
        },
        select: { id: true },
      });

      expect(prisma.volunteerDutySlot.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ["slot-future-1", "slot-future-2"] },
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
    });

    it("returns 0 if member has no upcoming volunteer duty assignments", async () => {
      (prisma.volunteerDutySlot.findMany as any).mockResolvedValueOnce([]);

      const vacatedCount = await vacateUpcomingVolunteerDuties(memberId);

      expect(vacatedCount).toBe(0);
      expect(prisma.volunteerDutySlot.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("scrubCommunicationsAndVolunteerData (Article 17 historical anonymization & telemetry scrub)", () => {
    it("scrubs personal notes and telemetry while preserving historical attendance & sign-off facts", async () => {
      (prisma.volunteerDutySlot.updateMany as any).mockResolvedValueOnce({ count: 3 });
      (prisma.announcementReadReceipt.deleteMany as any).mockResolvedValueOnce({ count: 5 });
      (prisma.documentSignOff.updateMany as any).mockResolvedValueOnce({ count: 2 });

      await scrubCommunicationsAndVolunteerData(memberId);

      // 1. Concluded historical duties: scrub notes and swap reasons
      expect(prisma.volunteerDutySlot.updateMany).toHaveBeenCalledWith({
        where: {
          assignedProfileId: memberId,
          scheduledEvent: {
            startAt: { lt: expect.any(Date) },
          },
        },
        data: {
          notes: null,
          swapReason: null,
        },
      });

      // 2. Read receipts purged
      expect(prisma.announcementReadReceipt.deleteMany).toHaveBeenCalledWith({
        where: { memberProfileId: memberId },
      });

      // 3. Document sign-offs: scrub IP and User-Agent telemetry
      expect(prisma.documentSignOff.updateMany).toHaveBeenCalledWith({
        where: { memberProfileId: memberId },
        data: {
          ipAddress: null,
          userAgent: null,
        },
      });
    });
  });

  describe("getCommunicationsGdprExportData (Article 20 Data Portability)", () => {
    it("extracts authored announcements, read receipts, volunteer history, and policy sign-offs", async () => {
      const mockPublishedAt = new Date("2026-05-10T10:00:00Z");
      const mockReadAt = new Date("2026-05-10T11:00:00Z");
      const mockEventDate = new Date("2026-05-15T14:00:00Z");
      const mockClaimedAt = new Date("2026-05-01T12:00:00Z");
      const mockSignedAt = new Date("2026-04-01T09:00:00Z");

      (prisma.announcement.findMany as any).mockResolvedValueOnce([
        {
          id: "ann-01",
          title: "Pitch Maintenance Weekend",
          slug: "pitch-maintenance-weekend",
          category: AnnouncementCategory.WEATHER_ALERT,
          priority: AnnouncementPriority.URGENT_WEATHER_ALERT,
          publishedAt: mockPublishedAt,
        },
      ]);

      (prisma.announcementReadReceipt.findMany as any).mockResolvedValueOnce([
        {
          announcementId: "ann-02",
          readAt: mockReadAt,
          announcement: { title: "Annual General Meeting" },
        },
      ]);

      (prisma.volunteerDutySlot.findMany as any).mockResolvedValueOnce([
        {
          id: "slot-01",
          eventId: "event-01",
          dutyType: VolunteerDutyType.TEA_CATERING,
          status: VolunteerSlotStatus.CLAIMED,
          claimedAt: mockClaimedAt,
          carpoolSeats: null,
          scheduledEvent: {
            title: "RCC vs Svanholm CC",
            startAt: mockEventDate,
          },
        },
      ]);

      (prisma.documentSignOff.findMany as any).mockResolvedValueOnce([
        {
          documentId: "doc-01",
          versionSigned: "2026.1",
          signedAt: mockSignedAt,
          document: {
            title: "RCC Child Protection Policy (Børneattest)",
            category: DocumentCategory.CHILD_SAFETY,
          },
        },
      ]);

      const result = await getCommunicationsGdprExportData(memberId);

      expect(result.authoredAnnouncements).toHaveLength(1);
      expect(result.authoredAnnouncements[0]).toEqual({
        id: "ann-01",
        title: "Pitch Maintenance Weekend",
        slug: "pitch-maintenance-weekend",
        category: "WEATHER_ALERT",
        priority: "URGENT_WEATHER_ALERT",
        publishedAt: mockPublishedAt.toISOString(),
      });

      expect(result.readReceipts).toHaveLength(1);
      expect(result.readReceipts[0]).toEqual({
        announcementId: "ann-02",
        announcementTitle: "Annual General Meeting",
        readAt: mockReadAt.toISOString(),
      });

      expect(result.volunteerDutyHistory).toHaveLength(1);
      expect(result.volunteerDutyHistory[0]).toEqual({
        slotId: "slot-01",
        eventId: "event-01",
        eventTitle: "RCC vs Svanholm CC",
        eventDate: mockEventDate.toISOString(),
        dutyType: "TEA_CATERING",
        status: "CLAIMED",
        claimedAt: mockClaimedAt.toISOString(),
        carpoolSeats: null,
      });

      expect(result.signedDocuments).toHaveLength(1);
      expect(result.signedDocuments[0]).toEqual({
        documentId: "doc-01",
        documentTitle: "RCC Child Protection Policy (Børneattest)",
        category: "CHILD_SAFETY",
        versionSigned: "2026.1",
        signedAt: mockSignedAt.toISOString(),
      });
    });
  });

  describe("executeMemberAnonymization integration with Communications & Volunteer hooks", () => {
    it("calls vacateUpcomingVolunteerDuties and scrubCommunicationsAndVolunteerData inside the transaction", async () => {
      (prisma.memberProfile.findUnique as any)
        .mockResolvedValueOnce({
          id: adminProfileId,
          roleAssignments: [{ role: "ADMIN" }],
        })
        .mockResolvedValueOnce({
          id: memberId,
          firstName: "Søren",
          lastName: "Kierkegaard",
          email: "soren@example.dk",
          phone: "+4512345678",
          address: "Torvet 1",
          city: "Roskilde",
          postalCode: "4000",
          dateOfBirth: new Date("1985-05-05"),
          isAnonymized: false,
          userAccount: null,
          parentLinksAsPlayer: [],
          parentLinksAsParent: [],
        });

      (prisma.volunteerDutySlot.findMany as any).mockResolvedValueOnce([]);
      (prisma.volunteerDutySlot.updateMany as any).mockResolvedValue({ count: 0 });
      (prisma.announcementReadReceipt.deleteMany as any).mockResolvedValue({ count: 0 });
      (prisma.documentSignOff.updateMany as any).mockResolvedValue({ count: 0 });

      const result = await executeMemberAnonymization({
        targetProfileId: memberId,
        adminProfileId,
      });

      expect(result.success).toBe(true);
      expect(result.shellName).toMatch(/^Former Member #[A-Z0-9]+$/);

      // Verify volunteer duties check was invoked
      expect(prisma.volunteerDutySlot.findMany).toHaveBeenCalled();
      // Verify read receipts delete was invoked
      expect(prisma.announcementReadReceipt.deleteMany).toHaveBeenCalled();
      // Verify sign-off telemetry scrub was invoked
      expect(prisma.documentSignOff.updateMany).toHaveBeenCalled();
    });
  });

  describe("generateGdprExport integration with Communications & Volunteers", () => {
    it("includes communicationsAndVolunteers package in the Article 20 export archive", async () => {
      (prisma.memberProfile.findUnique as any)
        .mockResolvedValueOnce({
          id: memberId,
          roleAssignments: [{ role: "PLAYER" }],
          parentLinksAsParent: [],
        })
        .mockResolvedValueOnce({
          id: memberId,
          firstName: "Søren",
          lastName: "Kierkegaard",
          email: "soren@example.dk",
          phone: "+4512345678",
          address: "Torvet 1",
          city: "Roskilde",
          postalCode: "4000",
          dateOfBirth: new Date("1985-05-05"),
          createdAt: new Date("2026-01-01"),
          roleAssignments: [],
          battingPosition: null,
          bowlingStyle: null,
          secondaryRoles: [],
          shirtSize: null,
          trouserSize: null,
          capSize: null,
          emergencyContacts: [],
          parentLinksAsPlayer: [],
          parentLinksAsParent: [],
          consentsReceived: [],
          consentsGiven: [],
          actionsPerformed: [],
          actionsTargeted: [],
          borrowedEquipment: [],
          rosterMemberships: [],
          rsvps: [],
          matchSelections: [],
          attendances: [],
        });

      (prisma.memberSubscription.findMany as any).mockResolvedValueOnce([]);
      (prisma.invoice.findMany as any).mockResolvedValueOnce([]);
      (prisma.paymentTransaction.findMany as any).mockResolvedValueOnce([]);

      // Mock communications queries
      (prisma.announcement.findMany as any).mockResolvedValueOnce([]);
      (prisma.announcementReadReceipt.findMany as any).mockResolvedValueOnce([]);
      (prisma.volunteerDutySlot.findMany as any).mockResolvedValueOnce([]);
      (prisma.documentSignOff.findMany as any).mockResolvedValueOnce([]);

      const exportPkg = await generateGdprExport({
        targetProfileId: memberId,
        requesterProfileId: memberId,
      });

      expect(exportPkg).toBeDefined();
      expect(exportPkg.communicationsAndVolunteers).toBeDefined();
      expect(exportPkg.communicationsAndVolunteers.authoredAnnouncements).toEqual([]);
      expect(exportPkg.communicationsAndVolunteers.readReceipts).toEqual([]);
      expect(exportPkg.communicationsAndVolunteers.volunteerDutyHistory).toEqual([]);
      expect(exportPkg.communicationsAndVolunteers.signedDocuments).toEqual([]);
    });
  });
});
