import { describe, it, expect, vi, beforeEach } from "vitest";
import { InvoiceStatus, SubscriptionStatus, PaymentMethod, TransactionStatus } from "@prisma/client";
import { hasOpenInvoicesOrBalances } from "@/modules/finance/services/finance-gdpr.service";
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
    auditLog: {
      create: vi.fn(),
    },
    equipmentLoan: {
      findMany: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    paymentTransaction: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    memberSubscription: {
      findMany: vi.fn(),
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

describe("Cross-Module GDPR Article 17 & 20 Finance Guard (T046, T047, T048)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const memberId = "profile-senior-player-001";
  const parentId = "profile-parent-001";
  const childId = "profile-junior-player-001";
  const adminProfileId = "admin-profile-001";

  describe("hasOpenInvoicesOrBalances (GDPR Article 17 Erasure Guard)", () => {
    it("blocks erasure when member has a direct OPEN invoice", async () => {
      (prisma.invoice.findMany as any).mockResolvedValueOnce([
        {
          id: "inv-001",
          invoiceNumber: "RCC-INV-2026-0001",
          status: InvoiceStatus.OPEN,
          totalOere: 240000,
          paidOere: 0,
          memberProfile: { firstName: "Lars", lastName: "Mikkelsen" },
        },
      ]);
      (prisma.parentChildLink.findMany as any).mockResolvedValueOnce([]);

      const result = await hasOpenInvoicesOrBalances(memberId);

      expect(result.hasOpenInvoices).toBe(true);
      expect(result.openInvoiceCount).toBe(1);
      expect(result.totalOutstandingOere).toBe(240000);
      expect(result.blockingReason).toContain("RCC-INV-2026-0001");
      expect(result.blockingReason).toContain("2400.00 DKK");
      expect(result.blockingReason).toContain("Bogføringsloven § 10");
    });

    it("blocks erasure when member has a PENDING_VERIFICATION invoice", async () => {
      (prisma.invoice.findMany as any).mockResolvedValueOnce([
        {
          id: "inv-002",
          invoiceNumber: "RCC-INV-2026-0002",
          status: InvoiceStatus.PENDING_VERIFICATION,
          totalOere: 150000,
          paidOere: 0,
          memberProfile: { firstName: "Lars", lastName: "Mikkelsen" },
        },
      ]);
      (prisma.parentChildLink.findMany as any).mockResolvedValueOnce([]);

      const result = await hasOpenInvoicesOrBalances(memberId);

      expect(result.hasOpenInvoices).toBe(true);
      expect(result.invoices[0].status).toBe(InvoiceStatus.PENDING_VERIFICATION);
      expect(result.blockingReason).toBeDefined();
    });

    it("blocks erasure when member has a PARTIALLY_PAID invoice with remaining balance", async () => {
      (prisma.invoice.findMany as any).mockResolvedValueOnce([
        {
          id: "inv-003",
          invoiceNumber: "RCC-INV-2026-0003",
          status: InvoiceStatus.PARTIALLY_PAID,
          totalOere: 200000,
          paidOere: 50000,
          memberProfile: { firstName: "Lars", lastName: "Mikkelsen" },
        },
      ]);
      (prisma.parentChildLink.findMany as any).mockResolvedValueOnce([]);

      const result = await hasOpenInvoicesOrBalances(memberId);

      expect(result.hasOpenInvoices).toBe(true);
      expect(result.totalOutstandingOere).toBe(150000); // 2000 - 500 = 1500 DKK (150000 oere)
      expect(result.blockingReason).toContain("1500.00 DKK");
    });

    it("blocks erasure when parent's linked child has an outstanding OVERDUE invoice", async () => {
      // Direct invoices for parent -> empty
      (prisma.invoice.findMany as any).mockResolvedValueOnce([]);
      // Parent has 1 linked child
      (prisma.parentChildLink.findMany as any).mockResolvedValueOnce([
        { playerId: childId },
      ]);
      // Child has an overdue youth invoice
      (prisma.invoice.findMany as any).mockResolvedValueOnce([
        {
          id: "inv-004",
          invoiceNumber: "RCC-INV-2026-0004",
          status: InvoiceStatus.OVERDUE,
          totalOere: 120000,
          paidOere: 0,
          memberProfile: { firstName: "Emil", lastName: "Mikkelsen" },
        },
      ]);

      const result = await hasOpenInvoicesOrBalances(parentId);

      expect(result.hasOpenInvoices).toBe(true);
      expect(result.openInvoiceCount).toBe(1);
      expect(result.invoices[0].isLinkedChild).toBe(true);
      expect(result.invoices[0].beneficiaryName).toBe("Emil Mikkelsen");
      expect(result.blockingReason).toContain("linked youth Emil Mikkelsen");
    });

    it("allows erasure when member has only fully settled invoices", async () => {
      // Prisma query filters by status in [OPEN, PENDING_VERIFICATION, PARTIALLY_PAID, OVERDUE]
      (prisma.invoice.findMany as any).mockResolvedValueOnce([]);
      (prisma.parentChildLink.findMany as any).mockResolvedValueOnce([]);

      const result = await hasOpenInvoicesOrBalances(memberId);

      expect(result.hasOpenInvoices).toBe(false);
      expect(result.openInvoiceCount).toBe(0);
      expect(result.totalOutstandingOere).toBe(0);
      expect(result.blockingReason).toBeUndefined();
    });
  });

  describe("executeMemberAnonymization (GDPR Article 17 Scrubbing & Statutory Retention)", () => {
    it("blocks anonymization if open invoices exist", async () => {
      (prisma.memberProfile.findUnique as any).mockResolvedValueOnce({
        id: adminProfileId,
        roleAssignments: [{ role: "ADMIN" }],
      }).mockResolvedValueOnce({
        id: memberId,
        firstName: "Lars",
        lastName: "Mikkelsen",
        isAnonymized: false,
      });

      // hasOpenInvoicesOrBalances returns true
      (prisma.invoice.findMany as any).mockResolvedValueOnce([
        {
          id: "inv-005",
          invoiceNumber: "RCC-INV-2026-0005",
          status: InvoiceStatus.OPEN,
          totalOere: 100000,
          paidOere: 0,
          memberProfile: { firstName: "Lars", lastName: "Mikkelsen" },
        },
      ]);
      (prisma.parentChildLink.findMany as any).mockResolvedValueOnce([]);

      await expect(
        executeMemberAnonymization({
          targetProfileId: memberId,
          adminProfileId,
        })
      ).rejects.toThrow(/unpaid club invoice/);
    });

    it("scrubs personal notes on invoices and payment transactions while preserving 5-year accounting shells", async () => {
      (prisma.memberProfile.findUnique as any)
        .mockResolvedValueOnce({
          id: adminProfileId,
          roleAssignments: [{ role: "ADMIN" }],
        })
        .mockResolvedValueOnce({
          id: memberId,
          firstName: "Lars",
          lastName: "Mikkelsen",
          email: "lars@example.dk",
          phone: "+4512345678",
          address: "Hestetorvet 1",
          city: "Roskilde",
          postalCode: "4000",
          dateOfBirth: new Date("1990-05-15"),
          isAnonymized: false,
          userAccount: null,
          parentLinksAsPlayer: [],
          parentLinksAsParent: [],
        });

      // No open invoices
      (prisma.invoice.findMany as any).mockResolvedValueOnce([]);
      (prisma.parentChildLink.findMany as any).mockResolvedValueOnce([]);

      const result = await executeMemberAnonymization({
        targetProfileId: memberId,
        adminProfileId,
      });

      expect(result.success).toBe(true);
      expect(result.shellName).toMatch(/^Former Member #[A-Z0-9]+$/);

      // Verify active subscriptions cancelled
      expect(prisma.memberSubscription.updateMany).toHaveBeenCalledWith({
        where: {
          memberProfileId: memberId,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING_PAYMENT] },
        },
        data: { status: SubscriptionStatus.CANCELLED },
      });

      // Verify personal notes scrubbed on invoices
      expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { memberProfileId: memberId },
            { billedToProfileId: memberId },
          ],
        },
        data: { notes: null },
      });

      // Verify transaction reference and notes scrubbed on payment transactions
      expect(prisma.paymentTransaction.updateMany).toHaveBeenCalledWith({
        where: { reportedById: memberId },
        data: { notes: null, transactionReference: null },
      });
    });
  });

  describe("generateGdprExport (GDPR Article 20 Data Portability)", () => {
    it("includes member subscriptions, itemized invoices, and payment history in export archive", async () => {
      (prisma.memberProfile.findUnique as any)
        .mockResolvedValueOnce({
          id: memberId,
          roleAssignments: [{ role: "PLAYER" }],
          parentLinksAsParent: [],
        })
        .mockResolvedValueOnce({
          id: memberId,
          firstName: "Lars",
          lastName: "Mikkelsen",
          email: "lars@example.dk",
          phone: "+4512345678",
          address: "Hestetorvet 1",
          city: "Roskilde",
          postalCode: "4000",
          dateOfBirth: new Date("1990-05-15"),
          createdAt: new Date("2025-01-01"),
          roleAssignments: [{ role: "PLAYER", assignedAt: new Date("2025-01-01") }],
          battingPosition: "Top Order",
          bowlingStyle: "Right-arm medium",
          secondaryRoles: [],
          shirtSize: "L",
          trouserSize: "L",
          capSize: "M",
          emergencyContacts: [],
          parentLinksAsPlayer: [],
          parentLinksAsParent: [],
          privacySettings: null,
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

      (prisma.memberSubscription.findMany as any).mockResolvedValueOnce([
        {
          id: "sub-001",
          plan: { name: "Senior Player", category: "SENIOR" },
          seasonYear: 2026,
          seasonCycle: "FULL_YEAR",
          status: SubscriptionStatus.ACTIVE,
          hasSiblingDiscount: false,
          siblingDiscountOere: 0,
          manualDiscountOere: null,
          finalFeeOere: 240000,
          createdAt: new Date("2026-01-01"),
        },
      ]);

      (prisma.invoice.findMany as any).mockResolvedValueOnce([
        {
          id: "inv-001",
          invoiceNumber: "RCC-INV-2026-0001",
          paymentReference: "RCC-INV-2026-0001",
          category: "MEMBERSHIP_DUES",
          status: InvoiceStatus.PAID,
          subtotalOere: 240000,
          discountOere: 0,
          totalOere: 240000,
          paidOere: 240000,
          issueDate: new Date("2026-01-05"),
          dueDate: new Date("2026-01-31"),
          paidAt: new Date("2026-01-10"),
          lineItems: [
            {
              description: "Senior Membership Dues 2026",
              quantity: 1,
              unitPriceOere: 240000,
              totalOere: 240000,
            },
          ],
        },
      ]);

      (prisma.paymentTransaction.findMany as any).mockResolvedValueOnce([
        {
          id: "tx-001",
          invoice: { invoiceNumber: "RCC-INV-2026-0001" },
          amountOere: 240000,
          paymentMethod: PaymentMethod.MOBILEPAY,
          status: TransactionStatus.VERIFIED,
          transactionReference: "MP-REF-9988",
          reportedAt: new Date("2026-01-10"),
          verifiedAt: new Date("2026-01-11"),
          settlementDate: new Date("2026-01-10"),
        },
      ]);

      const pkg = await generateGdprExport({
        targetProfileId: memberId,
        requesterProfileId: memberId,
      });

      expect(pkg.subscriptions).toHaveLength(1);
      expect(pkg.subscriptions[0].planName).toBe("Senior Player");
      expect(pkg.subscriptions[0].planCategory).toBe("SENIOR");
      expect(pkg.subscriptions[0].finalFeeOere).toBe(240000);

      expect(pkg.invoices).toHaveLength(1);
      expect(pkg.invoices[0].invoiceNumber).toBe("RCC-INV-2026-0001");
      expect(pkg.invoices[0].lineItems[0].description).toBe("Senior Membership Dues 2026");

      expect(pkg.paymentHistory).toHaveLength(1);
      expect(pkg.paymentHistory[0].amountOere).toBe(240000);
      expect(pkg.paymentHistory[0].invoiceNumber).toBe("RCC-INV-2026-0001");
    });
  });
});
