import { describe, it, expect } from "vitest";
import {
  calculateAgeOnCutoff,
  parseAgeCap,
  evaluateAgeEligibility,
} from "@/modules/teams-matches/domain/age-eligibility";

describe("Age Eligibility Evaluator (DCF Rules)", () => {
  const SEASON_2026 = 2026;

  describe("calculateAgeOnCutoff", () => {
    it("calculates age correctly on Jan 1st of the season year", () => {
      // Born 2012-05-15 -> on 2026-01-01, is 13 years old
      const age1 = calculateAgeOnCutoff("2012-05-15", SEASON_2026);
      expect(age1).toBe(13);

      // Born 2011-12-31 -> on 2026-01-01, is 14 years old
      const age2 = calculateAgeOnCutoff("2011-12-31", SEASON_2026);
      expect(age2).toBe(14);

      // Born 2012-01-01 -> on 2026-01-01, is 14 years old
      const age3 = calculateAgeOnCutoff("2012-01-01", SEASON_2026);
      expect(age3).toBe(14);

      // Born 2012-01-02 -> on 2026-01-01, is 13 years old
      const age4 = calculateAgeOnCutoff("2012-01-02", SEASON_2026);
      expect(age4).toBe(13);
    });

    it("throws error on invalid date", () => {
      expect(() => calculateAgeOnCutoff("not-a-date", SEASON_2026)).toThrow(
        "Invalid date of birth provided"
      );
    });
  });

  describe("parseAgeCap", () => {
    it("extracts integer cap from rule strings", () => {
      expect(parseAgeCap("U13")).toBe(13);
      expect(parseAgeCap("U15")).toBe(15);
      expect(parseAgeCap("u17")).toBe(17);
      expect(parseAgeCap("OPEN")).toBeNull();
      expect(parseAgeCap(null)).toBeNull();
    });
  });

  describe("evaluateAgeEligibility - Youth Squads", () => {
    it("permits player strictly under age cap as ELIGIBLE", () => {
      // Age 14 on cutoff for U15 squad
      const result = evaluateAgeEligibility({
        dateOfBirth: "2011-06-10", // 14 on 2026-01-01
        ageGroupRule: "U15",
        squadCategory: "YOUTH",
        seasonYear: SEASON_2026,
      });

      expect(result.status).toBe("ELIGIBLE");
      expect(result.isAllowed).toBe(true);
      expect(result.ageOnCutoff).toBe(14);
    });

    it("blocks overage player without dispensation", () => {
      // Age 15 on cutoff for U15 squad -> Over-age
      const result = evaluateAgeEligibility({
        dateOfBirth: "2010-08-20", // 15 on 2026-01-01
        ageGroupRule: "U15",
        squadCategory: "YOUTH",
        seasonYear: SEASON_2026,
      });

      expect(result.status).toBe("OVERAGE_BLOCKED");
      expect(result.isAllowed).toBe(false);
      expect(result.ageOnCutoff).toBe(15);
    });

    it("allows overage player with approved dispensation", () => {
      const result = evaluateAgeEligibility({
        dateOfBirth: "2010-08-20",
        ageGroupRule: "U15",
        squadCategory: "YOUTH",
        seasonYear: SEASON_2026,
        hasDispensation: true,
      });

      expect(result.status).toBe("DISPENSATION_APPROVED");
      expect(result.isAllowed).toBe(true);
      expect(result.warning).toBeDefined();
    });

    it("marks younger youth player playing up with PLAYING_UP status", () => {
      // Age 11 on cutoff playing in U15 squad
      const result = evaluateAgeEligibility({
        dateOfBirth: "2014-04-10", // 11 on 2026-01-01
        ageGroupRule: "U15",
        squadCategory: "YOUTH",
        seasonYear: SEASON_2026,
      });

      expect(result.status).toBe("PLAYING_UP");
      expect(result.isAllowed).toBe(true);
      expect(result.warning).toContain("playing up");
    });
  });

  describe("evaluateAgeEligibility - Senior & Social Squads", () => {
    it("permits adult players aged 15+ as ELIGIBLE", () => {
      const result = evaluateAgeEligibility({
        dateOfBirth: "1995-03-20", // 30 on 2026-01-01
        ageGroupRule: "OPEN",
        squadCategory: "SENIOR",
        seasonYear: SEASON_2026,
      });

      expect(result.status).toBe("ELIGIBLE");
      expect(result.isAllowed).toBe(true);
    });

    it("permits minor aged 13-14 as PLAYING_UP with parental delegation notice", () => {
      const result = evaluateAgeEligibility({
        dateOfBirth: "2012-05-10", // 13 on 2026-01-01
        ageGroupRule: "OPEN",
        squadCategory: "SENIOR",
        seasonYear: SEASON_2026,
      });

      expect(result.status).toBe("PLAYING_UP");
      expect(result.isAllowed).toBe(true);
      expect(result.warning).toContain("Dual-parent notification applies");
    });

    it("blocks players under 13 from senior play without dispensation", () => {
      const result = evaluateAgeEligibility({
        dateOfBirth: "2014-07-15", // 11 on 2026-01-01
        ageGroupRule: "OPEN",
        squadCategory: "SENIOR",
        seasonYear: SEASON_2026,
        hasDispensation: false,
      });

      expect(result.status).toBe("UNDERAGE_BLOCKED");
      expect(result.isAllowed).toBe(false);
    });

    it("allows under-13 player in senior squad with explicit dispensation", () => {
      const result = evaluateAgeEligibility({
        dateOfBirth: "2014-07-15",
        ageGroupRule: "OPEN",
        squadCategory: "SENIOR",
        seasonYear: SEASON_2026,
        hasDispensation: true,
      });

      expect(result.status).toBe("DISPENSATION_APPROVED");
      expect(result.isAllowed).toBe(true);
    });

    it("returns INVALID_DOB when date of birth is missing", () => {
      const result = evaluateAgeEligibility({
        dateOfBirth: null,
        ageGroupRule: "OPEN",
        squadCategory: "SENIOR",
      });

      expect(result.status).toBe("INVALID_DOB");
      expect(result.isAllowed).toBe(false);
    });
  });
});
