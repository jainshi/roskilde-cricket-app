import { describe, it, expect } from "vitest";
import {
  oereToDkk,
  dkkToOere,
  formatDanishKroner,
  calculatePercentageDiscount,
  calculateRemainingBalanceOere,
  sumOere,
} from "../../../src/modules/finance/domain/money-oere";

describe("money-oere domain rules", () => {
  describe("oereToDkk and dkkToOere conversions", () => {
    it("converts integer øre to DKK correctly", () => {
      expect(oereToDkk(180000)).toBe(1800);
      expect(oereToDkk(100000)).toBe(1000);
      expect(oereToDkk(75000)).toBe(750);
      expect(oereToDkk(99)).toBe(0.99);
      expect(oereToDkk(0)).toBe(0);
    });

    it("throws when converting non-integer øre", () => {
      expect(() => oereToDkk(1800.5)).toThrow(TypeError);
    });

    it("converts DKK to integer øre using deterministic rounding", () => {
      expect(dkkToOere(1800)).toBe(180000);
      expect(dkkToOere(750.25)).toBe(75025);
      expect(dkkToOere(750.254)).toBe(75025);
      expect(dkkToOere(750.256)).toBe(75026);
      expect(dkkToOere(0)).toBe(0);
    });
  });

  describe("formatDanishKroner", () => {
    it("formats amounts in Danish currency representation with dot thousand separators and comma decimals", () => {
      expect(formatDanishKroner(180000)).toBe("1.800,00 kr.");
      expect(formatDanishKroner(75000)).toBe("750,00 kr.");
      expect(formatDanishKroner(125050)).toBe("1.250,50 kr.");
      expect(formatDanishKroner(0)).toBe("0,00 kr.");
      expect(formatDanishKroner(50)).toBe("0,50 kr.");
      expect(formatDanishKroner(10000000)).toBe("100.000,00 kr.");
    });

    it("formats negative amounts with a leading minus sign", () => {
      expect(formatDanishKroner(-25000)).toBe("-250,00 kr.");
      expect(formatDanishKroner(-180000)).toBe("-1.800,00 kr.");
    });

    it("respects formatting options", () => {
      expect(formatDanishKroner(180000, { includeSuffix: false })).toBe("1.800,00");
      expect(formatDanishKroner(25000, { showPlusSign: true })).toBe("+250,00 kr.");
    });
  });

  describe("calculatePercentageDiscount", () => {
    it("calculates 25% sibling discount deterministically", () => {
      // 1,000.00 DKK (100,000 øre) * 25% = 25,000 øre
      expect(calculatePercentageDiscount(100000, 25)).toBe(25000);
    });

    it("handles rounding for non-divisible integer øre amounts", () => {
      // 333 øre * 25% = 83.25 -> 83 øre
      expect(calculatePercentageDiscount(333, 25)).toBe(83);
      // 335 øre * 25% = 83.75 -> 84 øre
      expect(calculatePercentageDiscount(335, 25)).toBe(84);
    });

    it("returns 0 for 0% discount or 0 base amount", () => {
      expect(calculatePercentageDiscount(100000, 0)).toBe(0);
      expect(calculatePercentageDiscount(0, 25)).toBe(0);
    });

    it("throws on invalid percentages", () => {
      expect(() => calculatePercentageDiscount(100000, -5)).toThrow(RangeError);
      expect(() => calculatePercentageDiscount(100000, 105)).toThrow(RangeError);
    });
  });

  describe("calculateRemainingBalanceOere", () => {
    it("computes remaining balance correctly", () => {
      expect(calculateRemainingBalanceOere(180000, 100000)).toBe(80000);
      expect(calculateRemainingBalanceOere(180000, 180000)).toBe(0);
      expect(calculateRemainingBalanceOere(180000, 200000)).toBe(0);
    });
  });

  describe("sumOere", () => {
    it("sums an array of øre integers", () => {
      expect(sumOere([180000, 100000, 75000])).toBe(355000);
      expect(sumOere([])).toBe(0);
    });

    it("throws if any item is not an integer", () => {
      expect(() => sumOere([100, 200.5])).toThrow(TypeError);
    });
  });
});
