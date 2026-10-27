import { describe, it, expect } from "vitest";
import { BillingCycle } from "@prisma/client";
import {
  getSeasonDateRange,
  resolveCurrentSeason,
  isEligibleForSeasonBatch,
} from "../../../src/modules/finance/domain/season-billing";

describe("season-billing domain rules", () => {
  describe("getSeasonDateRange", () => {
    it("resolves SUMMER_OUTDOOR season from April 1 to September 30", () => {
      const range = getSeasonDateRange(BillingCycle.SUMMER_OUTDOOR, 2026);
      expect(range.startDate.toISOString()).toBe("2026-04-01T00:00:00.000Z");
      expect(range.endDate.toISOString()).toBe("2026-09-30T23:59:59.999Z");
      expect(range.label).toBe("Summer Outdoor 2026");
    });

    it("resolves WINTER_INDOOR season from October 1 to March 31 next year", () => {
      const range = getSeasonDateRange(BillingCycle.WINTER_INDOOR, 2026);
      expect(range.startDate.toISOString()).toBe("2026-10-01T00:00:00.000Z");
      expect(range.endDate.toISOString()).toBe("2027-03-31T23:59:59.999Z");
      expect(range.label).toBe("Winter Indoor 2026/2027");
    });

    it("resolves ANNUAL season from April 1 to March 31 next year", () => {
      const range = getSeasonDateRange(BillingCycle.ANNUAL, 2026);
      expect(range.startDate.toISOString()).toBe("2026-04-01T00:00:00.000Z");
      expect(range.endDate.toISOString()).toBe("2027-03-31T23:59:59.999Z");
      expect(range.label).toBe("Annual Season 2026/2027");
    });

    it("throws on invalid season year", () => {
      expect(() => getSeasonDateRange(BillingCycle.ANNUAL, 1999)).toThrow(RangeError);
      expect(() => getSeasonDateRange(BillingCycle.ANNUAL, 2105)).toThrow(RangeError);
    });
  });

  describe("resolveCurrentSeason", () => {
    it("detects summer outdoor season during June", () => {
      const midJune = new Date("2026-06-15T12:00:00Z");
      const current = resolveCurrentSeason(midJune);
      expect(current.isSummerSeason).toBe(true);
      expect(current.activeCycle).toBe(BillingCycle.SUMMER_OUTDOOR);
      expect(current.seasonYear).toBe(2026);
    });

    it("detects winter indoor season during November", () => {
      const midNov = new Date("2026-11-20T12:00:00Z");
      const current = resolveCurrentSeason(midNov);
      expect(current.isSummerSeason).toBe(false);
      expect(current.activeCycle).toBe(BillingCycle.WINTER_INDOOR);
      expect(current.seasonYear).toBe(2026);
    });

    it("detects winter indoor season during February belonging to previous year season start", () => {
      const midFeb = new Date("2027-02-10T12:00:00Z");
      const current = resolveCurrentSeason(midFeb);
      expect(current.isSummerSeason).toBe(false);
      expect(current.activeCycle).toBe(BillingCycle.WINTER_INDOOR);
      expect(current.seasonYear).toBe(2026); // Started Oct 2026
    });
  });

  describe("isEligibleForSeasonBatch", () => {
    it("returns true for eligible members", () => {
      expect(
        isEligibleForSeasonBatch({
          id: "m-1",
          isAnonymized: false,
          hasActiveSubscriptionForSeason: false,
        })
      ).toBe(true);
    });

    it("disqualifies anonymized members", () => {
      expect(
        isEligibleForSeasonBatch({
          id: "m-2",
          isAnonymized: true,
          hasActiveSubscriptionForSeason: false,
        })
      ).toBe(false);
    });

    it("disqualifies members who already have an active subscription for the season", () => {
      expect(
        isEligibleForSeasonBatch({
          id: "m-3",
          isAnonymized: false,
          hasActiveSubscriptionForSeason: true,
        })
      ).toBe(false);
    });
  });
});
