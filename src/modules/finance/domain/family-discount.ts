import { calculatePercentageDiscount } from "./money-oere";

export interface YouthSubscriptionCandidate {
  id: string;
  memberProfileId: string;
  memberName: string;
  planId: string;
  planName: string;
  baseFeeOere: number;
  siblingDiscountPercent: number; // usually 25
  dateOfBirth?: Date | null;
  manualDiscountOere?: number | null;
  overrideReason?: string | null;
  overrideById?: string | null;
}

export interface CalculatedSubscriptionFee {
  id: string;
  memberProfileId: string;
  memberName: string;
  baseFeeOere: number;
  hasSiblingDiscount: boolean;
  siblingDiscountOere: number;
  manualDiscountOere: number | null;
  isManualOverride: boolean;
  overrideReason: string | null;
  finalFeeOere: number;
  sortRank: number; // 1 = highest-priced (full fee), 2+ = discounted
}

/**
 * Calculates household subscription fees for linked youth players.
 *
 * Sibling Discount Rules (per Clarification Q2):
 * 1. Candidates are sorted descending by baseFeeOere (highest price first).
 *    In case of a tie, older siblings (earlier dateOfBirth) come first.
 * 2. The highest-priced youth tier (Rank 1) pays 100% full fee.
 * 3. All subsequent youth tiers (Rank 2+) receive the sibling discount (default 25%).
 * 4. Explicit manual Treasurer overrides take precedence when provided.
 */
export function calculateHouseholdYouthFees(
  candidates: YouthSubscriptionCandidate[]
): CalculatedSubscriptionFee[] {
  if (!candidates || candidates.length === 0) {
    return [];
  }

  // Clone and sort: baseFeeOere DESC, then dateOfBirth ASC (older first)
  const sorted = [...candidates].sort((a, b) => {
    if (b.baseFeeOere !== a.baseFeeOere) {
      return b.baseFeeOere - a.baseFeeOere;
    }
    const aTime = a.dateOfBirth ? a.dateOfBirth.getTime() : 0;
    const bTime = b.dateOfBirth ? b.dateOfBirth.getTime() : 0;
    return aTime - bTime;
  });

  return sorted.map((candidate, index) => {
    const rank = index + 1;
    const isFirstYouth = rank === 1;

    // Check for explicit manual discount override
    if (
      candidate.manualDiscountOere !== undefined &&
      candidate.manualDiscountOere !== null
    ) {
      const manualDiscount = Math.min(
        candidate.baseFeeOere,
        Math.max(0, candidate.manualDiscountOere)
      );
      const finalFee = candidate.baseFeeOere - manualDiscount;

      return {
        id: candidate.id,
        memberProfileId: candidate.memberProfileId,
        memberName: candidate.memberName,
        baseFeeOere: candidate.baseFeeOere,
        hasSiblingDiscount: false,
        siblingDiscountOere: 0,
        manualDiscountOere: manualDiscount,
        isManualOverride: true,
        overrideReason: candidate.overrideReason ?? "Treasurer manual override",
        finalFeeOere: finalFee,
        sortRank: rank,
      };
    }

    // Automatic sibling discount logic
    if (isFirstYouth || candidates.length === 1) {
      // Highest-priced tier pays 100%
      return {
        id: candidate.id,
        memberProfileId: candidate.memberProfileId,
        memberName: candidate.memberName,
        baseFeeOere: candidate.baseFeeOere,
        hasSiblingDiscount: false,
        siblingDiscountOere: 0,
        manualDiscountOere: null,
        isManualOverride: false,
        overrideReason: null,
        finalFeeOere: candidate.baseFeeOere,
        sortRank: rank,
      };
    }

    // Rank 2+ receives automatic sibling discount
    const discountOere = calculatePercentageDiscount(
      candidate.baseFeeOere,
      candidate.siblingDiscountPercent
    );
    const finalFee = Math.max(0, candidate.baseFeeOere - discountOere);

    return {
      id: candidate.id,
      memberProfileId: candidate.memberProfileId,
      memberName: candidate.memberName,
      baseFeeOere: candidate.baseFeeOere,
      hasSiblingDiscount: true,
      siblingDiscountOere: discountOere,
      manualDiscountOere: null,
      isManualOverride: false,
      overrideReason: null,
      finalFeeOere: finalFee,
      sortRank: rank,
    };
  });
}
