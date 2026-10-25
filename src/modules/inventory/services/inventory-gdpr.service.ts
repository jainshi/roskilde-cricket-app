import { prisma } from "@/lib/db";
import { LoanStatus } from "@prisma/client";

export interface ActiveLoansCheckResult {
  hasActiveLoans: boolean;
  activeLoanCount: number;
  items: Array<{
    loanId: string;
    itemName: string;
    assetTag: string | null;
    status: LoanStatus;
    borrowerName: string;
    isMinorChild: boolean;
  }>;
  blockingReason?: string;
}

/**
 * Evaluates whether a member profile (or any of their linked minor children)
 * currently holds active or overdue club equipment loans.
 *
 * Used by the GDPR erasure service to enforce Article 17 club asset retention safeguards:
 * An account cannot be deleted or anonymized while club assets remain unreturned in their custody.
 */
export async function hasActiveOrOverdueLoans(
  targetProfileId: string
): Promise<ActiveLoansCheckResult> {
  // 1. Direct active loans on target member
  const directLoans = await prisma.equipmentLoan.findMany({
    where: {
      borrowerProfileId: targetProfileId,
      status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
      returnedAt: null,
    },
    include: {
      equipmentItem: {
        select: { name: true, assetTag: true },
      },
      borrowerProfile: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  // 2. Active loans on linked minor children (if target member is a parent)
  const childLinks = await prisma.parentChildLink.findMany({
    where: { parentId: targetProfileId },
    select: { playerId: true },
  });

  const childPlayerIds = childLinks.map((cl) => cl.playerId);

  const childLoans =
    childPlayerIds.length > 0
      ? await prisma.equipmentLoan.findMany({
          where: {
            borrowerProfileId: { in: childPlayerIds },
            status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
            returnedAt: null,
          },
          include: {
            equipmentItem: {
              select: { name: true, assetTag: true },
            },
            borrowerProfile: {
              select: { firstName: true, lastName: true },
            },
          },
        })
      : [];

  const items = [
    ...directLoans.map((l) => ({
      loanId: l.id,
      itemName: l.equipmentItem.name,
      assetTag: l.equipmentItem.assetTag,
      status: l.status,
      borrowerName: `${l.borrowerProfile.firstName} ${l.borrowerProfile.lastName}`,
      isMinorChild: false,
    })),
    ...childLoans.map((l) => ({
      loanId: l.id,
      itemName: l.equipmentItem.name,
      assetTag: l.equipmentItem.assetTag,
      status: l.status,
      borrowerName: `${l.borrowerProfile.firstName} ${l.borrowerProfile.lastName}`,
      isMinorChild: true,
    })),
  ];

  const totalCount = items.length;

  if (totalCount > 0) {
    const itemSummaries = items
      .map((i) => `${i.itemName} (${i.isMinorChild ? `linked youth ${i.borrowerName}` : "direct"})`)
      .join(", ");

    return {
      hasActiveLoans: true,
      activeLoanCount: totalCount,
      items,
      blockingReason: `Member cannot be anonymized or erased: ${totalCount} club equipment asset(s) are currently on loan (${itemSummaries}) and must be returned first.`,
    };
  }

  return {
    hasActiveLoans: false,
    activeLoanCount: 0,
    items: [],
  };
}
