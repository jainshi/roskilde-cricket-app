import { describe, it, expect, vi, beforeEach } from "vitest";
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
      findMany: vi.fn().mockResolvedValue([]),
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
    auditLog: {
      create: vi.fn(),
    },
    equipmentLoan: {
      findMany: vi.fn(),
    },
    invoice: {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn(),
    },
    paymentTransaction: {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn(),
    },
    memberSubscription: {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn(),
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

describe("Module 3 Cross-Module GDPR Article 17 & 20 Guard (T047, T048, T049)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const adminProfileId = "admin-profile-001";
  const targetProfileId = "player-profile-002";

  it("scrubs personal transport notes and attendance notes while preserving statistical appearance records upon account erasure", async () => {
    (prisma.memberProfile.findUnique as any)
      .mockResolvedValueOnce({
        id: adminProfileId,
        roleAssignments: [{ role: "ADMIN" }],
      })
      .mockResolvedValueOnce({
        id: targetProfileId,
        firstName: "Vikram",
        lastName: "Sharma",
        email: "vikram@example.dk",
        phone: "+4511223344",
        address: "Skovvej 12",
        city: "Roskilde",
        postalCode: "4000",
        dateOfBirth: new Date("1996-04-12"),
        isAnonymized: false,
        userAccount: { id: "ua-001" },
        parentLinksAsPlayer: [],
        parentLinksAsParent: [],
      });

    const result = await executeMemberAnonymization({
      targetProfileId,
      adminProfileId,
    });

    expect(result.success).toBe(true);
    expect(result.shellName).toMatch(/^Former Member #[A-Z0-9]+$/);

    // Verify MemberProfile PII scrubbing
    expect(prisma.memberProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: targetProfileId },
        data: expect.objectContaining({
          firstName: "Former",
          email: null,
          phone: null,
          address: null,
          dateOfBirth: null,
          isAnonymized: true,
        }),
      })
    );

    // Verify personal transport note scrubbing on RSVPs (records preserved for stats)
    expect(prisma.eventRsvp.updateMany).toHaveBeenCalledWith({
      where: { memberProfileId: targetProfileId },
      data: { transportNote: null },
    });

    // Verify personal pitch-side note scrubbing on Attendances (records preserved for municipal stats)
    expect(prisma.eventAttendance.updateMany).toHaveBeenCalledWith({
      where: { memberProfileId: targetProfileId },
      data: { notes: null },
    });

    // Verify roster deactivation & coach severance
    expect(prisma.teamRosterMember.updateMany).toHaveBeenCalledWith({
      where: { memberProfileId: targetProfileId },
      data: { isActive: false },
    });
    expect(prisma.teamCoachAssignment.deleteMany).toHaveBeenCalledWith({
      where: { coachProfileId: targetProfileId },
    });
  });

  it("exports squad memberships, event RSVPs, match selections, and attendance history in GDPR Article 20 package", async () => {
    (prisma.memberProfile.findUnique as any)
      .mockResolvedValueOnce({
        id: targetProfileId,
        roleAssignments: [{ role: "PLAYER" }],
        parentLinksAsParent: [],
      })
      .mockResolvedValueOnce({
        id: targetProfileId,
        firstName: "Vikram",
        lastName: "Sharma",
        email: "vikram@example.dk",
        phone: "+4511223344",
        address: "Skovvej 12",
        city: "Roskilde",
        postalCode: "4000",
        dateOfBirth: new Date("1996-04-12"),
        createdAt: new Date("2026-01-01"),
        roleAssignments: [{ role: "PLAYER", assignedAt: new Date("2026-01-01") }],
        emergencyContacts: [],
        privacySettings: null,
        consentsReceived: [],
        consentsGiven: [],
        parentLinksAsPlayer: [],
        parentLinksAsParent: [],
        actionsPerformed: [],
        actionsTargeted: [],
        borrowedEquipment: [],
        rosterMemberships: [
          {
            role: "PLAYER",
            isActive: true,
            joinedAt: new Date("2026-01-10"),
            teamSquad: { id: "squad-1st-xi", name: "1st XI (Senior)" },
          },
        ],
        rsvps: [
          {
            status: "AVAILABLE",
            transportNote: "Can drive 3 passengers from Trekroner",
            submittedAt: new Date("2026-05-01"),
            scheduledEvent: {
              id: "event-001",
              title: "RCC vs Svanholm CC",
              date: new Date("2026-05-04"),
            },
          },
        ],
        matchSelections: [
          {
            selectionRole: "SELECTED",
            tacticalRole: "NONE",
            battingOrderPosition: 3,
            matchSelection: {
              scheduledEvent: {
                id: "event-001",
                title: "RCC vs Svanholm CC",
                date: new Date("2026-05-04"),
              },
            },
          },
        ],
        attendances: [
          {
            status: "PRESENT",
            arrivalTime: new Date("2026-05-04T09:45:00Z"),
            notes: "Ready for warmups",
            scheduledEvent: {
              id: "event-001",
              title: "RCC vs Svanholm CC",
              date: new Date("2026-05-04"),
            },
          },
        ],
      });

    const exportPackage = await generateGdprExport({
      targetProfileId,
      requesterProfileId: targetProfileId,
    });

    expect(exportPackage.squadMemberships).toHaveLength(1);
    expect(exportPackage.squadMemberships[0].squadName).toBe("1st XI (Senior)");

    expect(exportPackage.eventRsvps).toHaveLength(1);
    expect(exportPackage.eventRsvps[0].eventTitle).toBe("RCC vs Svanholm CC");
    expect(exportPackage.eventRsvps[0].transportNote).toBe(
      "Can drive 3 passengers from Trekroner"
    );

    expect(exportPackage.matchSelections).toHaveLength(1);
    expect(exportPackage.matchSelections[0].selectionRole).toBe("SELECTED");
    expect(exportPackage.matchSelections[0].battingOrderPosition).toBe(3);

    expect(exportPackage.attendanceHistory).toHaveLength(1);
    expect(exportPackage.attendanceHistory[0].status).toBe("PRESENT");
  });
});
