import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoanStatus } from "@prisma/client";
import { hasActiveOrOverdueLoans } from "@/modules/inventory/services/inventory-gdpr.service";
import { computeAnonymizedShell } from "@/modules/auth-rbac/domain/anonymization-rules";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    equipmentLoan: {
      findMany: vi.fn(),
    },
    parentChildLink: {
      findMany: vi.fn(),
    },
  },
}));

describe("Cross-Module GDPR Article 17 Inventory Guard (T035, T036, T037)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const memberId = "profile-senior-player-001";
  const parentId = "profile-parent-001";
  const childId = "profile-junior-player-001";

  it("blocks erasure when member holds a direct ACTIVE equipment loan", async () => {
    (prisma.equipmentLoan.findMany as any).mockResolvedValueOnce([
      {
        id: "loan-001",
        status: LoanStatus.ACTIVE,
        returnedAt: null,
        equipmentItem: { name: "Kookaburra Kahuna Bat", assetTag: "BAT-KAHUNA-01" },
        borrowerProfile: { firstName: "Lars", lastName: "Mikkelsen" },
      },
    ]);
    (prisma.parentChildLink.findMany as any).mockResolvedValueOnce([]);

    const result = await hasActiveOrOverdueLoans(memberId);

    expect(result.hasActiveLoans).toBe(true);
    expect(result.activeLoanCount).toBe(1);
    expect(result.items[0].itemName).toBe("Kookaburra Kahuna Bat");
    expect(result.blockingReason).toContain("1 club equipment asset(s) are currently on loan");
    expect(result.blockingReason).toContain("Kookaburra Kahuna Bat (direct)");
  });

  it("blocks erasure when member holds a direct OVERDUE equipment loan", async () => {
    (prisma.equipmentLoan.findMany as any).mockResolvedValueOnce([
      {
        id: "loan-002",
        status: LoanStatus.OVERDUE,
        returnedAt: null,
        equipmentItem: { name: "Club Match Batting Pads", assetTag: "PADS-MATCH-01" },
        borrowerProfile: { firstName: "Lars", lastName: "Mikkelsen" },
      },
    ]);
    (prisma.parentChildLink.findMany as any).mockResolvedValueOnce([]);

    const result = await hasActiveOrOverdueLoans(memberId);

    expect(result.hasActiveLoans).toBe(true);
    expect(result.activeLoanCount).toBe(1);
    expect(result.items[0].status).toBe(LoanStatus.OVERDUE);
    expect(result.blockingReason).toBeDefined();
  });

  it("blocks erasure when member is a parent and their linked minor child holds an active loan", async () => {
    // 1. Direct loans for parent -> empty
    (prisma.equipmentLoan.findMany as any).mockResolvedValueOnce([]);
    // 2. Parent-child links -> 1 child
    (prisma.parentChildLink.findMany as any).mockResolvedValueOnce([
      { playerId: childId },
    ]);
    // 3. Child loans -> 1 active youth helmet loan
    (prisma.equipmentLoan.findMany as any).mockResolvedValueOnce([
      {
        id: "loan-003",
        status: LoanStatus.ACTIVE,
        returnedAt: null,
        equipmentItem: { name: "Junior Masuri Helmet", assetTag: "HELM-JR-01" },
        borrowerProfile: { firstName: "Emil", lastName: "Mikkelsen" },
      },
    ]);

    const result = await hasActiveOrOverdueLoans(parentId);

    expect(result.hasActiveLoans).toBe(true);
    expect(result.activeLoanCount).toBe(1);
    expect(result.items[0].isMinorChild).toBe(true);
    expect(result.items[0].borrowerName).toBe("Emil Mikkelsen");
    expect(result.blockingReason).toContain("linked youth Emil Mikkelsen");
  });

  it("allows erasure when member has only RETURNED loans (0 active)", async () => {
    // Both direct loans and child loans return empty list because Prisma query filters by status in [ACTIVE, OVERDUE]
    (prisma.equipmentLoan.findMany as any).mockResolvedValueOnce([]);
    (prisma.parentChildLink.findMany as any).mockResolvedValueOnce([]);

    const result = await hasActiveOrOverdueLoans(memberId);

    expect(result.hasActiveLoans).toBe(false);
    expect(result.activeLoanCount).toBe(0);
    expect(result.items).toHaveLength(0);
    expect(result.blockingReason).toBeUndefined();

    // Verify statistical shell anonymization preserves the ID while purging PII
    const anonymizedShell = computeAnonymizedShell({
      id: memberId,
      firstName: "Lars",
      lastName: "Mikkelsen",
      email: "lars@example.dk",
      phone: "+4512345678",
      address: "Cricketvej 1",
      city: "Roskilde",
      postalCode: "4000",
      dateOfBirth: new Date("1985-05-15"),
      isAnonymized: false,
    });

    expect(anonymizedShell.id).toBe(memberId);
    expect(anonymizedShell.firstName).toBe("Former");
    expect(anonymizedShell.lastName).toMatch(/^Member #[A-Z0-9]+$/);
    expect(anonymizedShell.email).toBeNull();
    expect(anonymizedShell.phone).toBeNull();
  });
});
