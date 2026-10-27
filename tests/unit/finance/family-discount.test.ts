import { describe, it, expect } from "vitest";
import {
  calculateHouseholdYouthFees,
  YouthSubscriptionCandidate,
} from "../../../src/modules/finance/domain/family-discount";

describe("family-discount domain rules", () => {
  it("bills single youth candidate at 100% full price without discount", () => {
    const single: YouthSubscriptionCandidate[] = [
      {
        id: "sub-1",
        memberProfileId: "youth-1",
        memberName: "Lucas Hansen",
        planId: "plan-u15",
        planName: "Youth U15",
        baseFeeOere: 100000, // 1,000 DKK
        siblingDiscountPercent: 25,
      },
    ];

    const result = calculateHouseholdYouthFees(single);
    expect(result).toHaveLength(1);
    expect(result[0].baseFeeOere).toBe(100000);
    expect(result[0].hasSiblingDiscount).toBe(false);
    expect(result[0].siblingDiscountOere).toBe(0);
    expect(result[0].finalFeeOere).toBe(100000);
    expect(result[0].sortRank).toBe(1);
  });

  it("applies 25% discount to the lower-priced youth tier when prices differ", () => {
    const twoYouthDifferentPlans: YouthSubscriptionCandidate[] = [
      {
        id: "sub-junior",
        memberProfileId: "youth-junior",
        memberName: "Emma Hansen (U11)",
        planId: "plan-u11",
        planName: "Youth U11 Mini",
        baseFeeOere: 60000, // 600 DKK
        siblingDiscountPercent: 25,
      },
      {
        id: "sub-senior",
        memberProfileId: "youth-senior",
        memberName: "Lucas Hansen (U15)",
        planId: "plan-u15",
        planName: "Youth U15 Competitive",
        baseFeeOere: 100000, // 1,000 DKK
        siblingDiscountPercent: 25,
      },
    ];

    const result = calculateHouseholdYouthFees(twoYouthDifferentPlans);
    expect(result).toHaveLength(2);

    // Rank 1: Lucas (100,000 øre) pays 100%
    expect(result[0].memberProfileId).toBe("youth-senior");
    expect(result[0].baseFeeOere).toBe(100000);
    expect(result[0].hasSiblingDiscount).toBe(false);
    expect(result[0].finalFeeOere).toBe(100000);
    expect(result[0].sortRank).toBe(1);

    // Rank 2: Emma (60,000 øre) receives 25% discount (15,000 øre off -> 45,000 øre)
    expect(result[1].memberProfileId).toBe("youth-junior");
    expect(result[1].baseFeeOere).toBe(60000);
    expect(result[1].hasSiblingDiscount).toBe(true);
    expect(result[1].siblingDiscountOere).toBe(15000);
    expect(result[1].finalFeeOere).toBe(45000);
    expect(result[1].sortRank).toBe(2);
  });

  it("applies 25% discount to subsequent children when prices are identical", () => {
    const threeSiblingsSamePlan: YouthSubscriptionCandidate[] = [
      {
        id: "sub-1",
        memberProfileId: "youth-1",
        memberName: "First Child",
        planId: "plan-u15",
        planName: "Youth U15",
        baseFeeOere: 100000,
        siblingDiscountPercent: 25,
        dateOfBirth: new Date("2012-01-01"),
      },
      {
        id: "sub-2",
        memberProfileId: "youth-2",
        memberName: "Second Child",
        planId: "plan-u15",
        planName: "Youth U15",
        baseFeeOere: 100000,
        siblingDiscountPercent: 25,
        dateOfBirth: new Date("2014-06-01"),
      },
      {
        id: "sub-3",
        memberProfileId: "youth-3",
        memberName: "Third Child",
        planId: "plan-u15",
        planName: "Youth U15",
        baseFeeOere: 100000,
        siblingDiscountPercent: 25,
        dateOfBirth: new Date("2016-11-01"),
      },
    ];

    const result = calculateHouseholdYouthFees(threeSiblingsSamePlan);
    expect(result).toHaveLength(3);

    // 1st child: 100,000 øre
    expect(result[0].finalFeeOere).toBe(100000);
    expect(result[0].hasSiblingDiscount).toBe(false);

    // 2nd child: 75,000 øre (-25%)
    expect(result[1].finalFeeOere).toBe(75000);
    expect(result[1].hasSiblingDiscount).toBe(true);
    expect(result[1].siblingDiscountOere).toBe(25000);

    // 3rd child: 75,000 øre (-25%)
    expect(result[2].finalFeeOere).toBe(75000);
    expect(result[2].hasSiblingDiscount).toBe(true);
    expect(result[2].siblingDiscountOere).toBe(25000);
  });

  it("respects explicit Treasurer manual discount overrides", () => {
    const withOverride: YouthSubscriptionCandidate[] = [
      {
        id: "sub-1",
        memberProfileId: "youth-1",
        memberName: "Lucas Hansen",
        planId: "plan-u15",
        planName: "Youth U15",
        baseFeeOere: 100000,
        siblingDiscountPercent: 25,
      },
      {
        id: "sub-2",
        memberProfileId: "youth-2",
        memberName: "Emma Hansen",
        planId: "plan-u15",
        planName: "Youth U15",
        baseFeeOere: 100000,
        siblingDiscountPercent: 25,
        manualDiscountOere: 50000, // 500 DKK manual scholarship discount
        overrideReason: "Club scholarship hardship fund",
      },
    ];

    const result = calculateHouseholdYouthFees(withOverride);
    expect(result[0].finalFeeOere).toBe(100000);

    // Emma gets manual override of 50,000 øre instead of standard 25,000 øre
    expect(result[1].isManualOverride).toBe(true);
    expect(result[1].manualDiscountOere).toBe(50000);
    expect(result[1].finalFeeOere).toBe(50000);
    expect(result[1].overrideReason).toBe("Club scholarship hardship fund");
  });

  it("handles empty candidate arrays safely", () => {
    expect(calculateHouseholdYouthFees([])).toEqual([]);
  });
});
