import { describe, it, expect } from "vitest";
import { EquipmentCategory } from "@prisma/client";
import {
  calculateDefaultReturnDeadline,
  getEndOfLocalDay,
  addLocalDays,
} from "@/modules/inventory/domain/return-deadline";

describe("return-deadline (Intelligent Category Defaults)", () => {
  const baseTime = new Date("2026-05-10T10:30:00.000Z");

  describe("Same-Day Loans (FACILITY_KEYS, BOWLING_BALLS)", () => {
    it("returns end of same day (23:59:59) for FACILITY_KEYS", () => {
      const deadline = calculateDefaultReturnDeadline({
        category: EquipmentCategory.FACILITY_KEYS,
        now: baseTime,
      });

      expect(deadline.getFullYear()).toBe(baseTime.getFullYear());
      expect(deadline.getMonth()).toBe(baseTime.getMonth());
      expect(deadline.getDate()).toBe(baseTime.getDate());
      expect(deadline.getHours()).toBe(23);
      expect(deadline.getMinutes()).toBe(59);
      expect(deadline.getSeconds()).toBe(59);
    });

    it("returns end of same day (23:59:59) for BOWLING_BALLS", () => {
      const deadline = calculateDefaultReturnDeadline({
        category: EquipmentCategory.BOWLING_BALLS,
        now: baseTime,
      });

      expect(deadline.getDate()).toBe(baseTime.getDate());
      expect(deadline.getHours()).toBe(23);
      expect(deadline.getMinutes()).toBe(59);
    });
  });

  describe("Standard 7-Day Loans (BATTING, PROTECTIVE, TRAINING_GROUND)", () => {
    it("returns exactly 7 days later at 23:59:59 for BATTING gear", () => {
      const deadline = calculateDefaultReturnDeadline({
        category: EquipmentCategory.BATTING,
        now: baseTime,
      });

      const expectedDate = new Date(baseTime);
      expectedDate.setDate(expectedDate.getDate() + 7);

      expect(deadline.getDate()).toBe(expectedDate.getDate());
      expect(deadline.getHours()).toBe(23);
      expect(deadline.getMinutes()).toBe(59);
    });

    it("returns exactly 7 days later for PROTECTIVE gear", () => {
      const deadline = calculateDefaultReturnDeadline({
        category: EquipmentCategory.PROTECTIVE,
        now: baseTime,
      });

      const expectedDate = new Date(baseTime);
      expectedDate.setDate(expectedDate.getDate() + 7);

      expect(deadline.getDate()).toBe(expectedDate.getDate());
    });

    it("returns exactly 7 days later for TRAINING_GROUND gear", () => {
      const deadline = calculateDefaultReturnDeadline({
        category: EquipmentCategory.TRAINING_GROUND,
        now: baseTime,
      });

      const expectedDate = new Date(baseTime);
      expectedDate.setDate(expectedDate.getDate() + 7);

      expect(deadline.getDate()).toBe(expectedDate.getDate());
    });
  });

  describe("Season-Long Loans (APPAREL_KIT)", () => {
    it("returns explicit seasonEndDate when provided and in the future", () => {
      const seasonEnd = new Date("2026-09-30T12:00:00.000Z");
      const deadline = calculateDefaultReturnDeadline({
        category: EquipmentCategory.APPAREL_KIT,
        now: baseTime,
        seasonEndDate: seasonEnd,
      });

      expect(deadline.getFullYear()).toBe(2026);
      expect(deadline.getMonth()).toBe(8); // September (0-indexed)
      expect(deadline.getDate()).toBe(30);
      expect(deadline.getHours()).toBe(23);
    });

    it("falls back to +180 days when seasonEndDate is omitted or in the past", () => {
      const deadline = calculateDefaultReturnDeadline({
        category: EquipmentCategory.APPAREL_KIT,
        now: baseTime,
        seasonEndDate: null,
      });

      const expectedDate = new Date(baseTime);
      expectedDate.setDate(expectedDate.getDate() + 180);

      expect(deadline.getDate()).toBe(expectedDate.getDate());
      expect(deadline.getMonth()).toBe(expectedDate.getMonth());
    });
  });

  describe("helper functions", () => {
    it("getEndOfLocalDay sets hours to 23:59:59.999", () => {
      const endOfDay = getEndOfLocalDay(baseTime);
      expect(endOfDay.getHours()).toBe(23);
      expect(endOfDay.getMinutes()).toBe(59);
      expect(endOfDay.getSeconds()).toBe(59);
      expect(endOfDay.getMilliseconds()).toBe(999);
    });

    it("addLocalDays correctly rolls over month boundaries", () => {
      const endOfMay = new Date("2026-05-30T10:00:00.000Z");
      const nextWeek = addLocalDays(endOfMay, 5);

      expect(nextWeek.getMonth()).toBe(5); // June
      expect(nextWeek.getDate()).toBe(4);
      expect(nextWeek.getHours()).toBe(23);
    });
  });
});
