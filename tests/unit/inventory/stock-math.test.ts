import { describe, it, expect } from "vitest";
import {
  applyBulkLoanCheckout,
  applyBulkLoanReturn,
  applyDirectConsumption,
  applyRestock,
  applyWriteOff,
  isLowStock,
} from "@/modules/inventory/domain/stock-math";

describe("stock-math (Bulk Consumables & Loan Math)", () => {
  describe("applyBulkLoanCheckout", () => {
    it("decrements available stock while leaving total unchanged", () => {
      const result = applyBulkLoanCheckout(24, 6);
      expect(result.newAvailable).toBe(18);
    });

    it("allows checking out exact available quantity", () => {
      const result = applyBulkLoanCheckout(6, 6);
      expect(result.newAvailable).toBe(0);
    });

    it("throws an error when checkout quantity exceeds available stock", () => {
      expect(() => applyBulkLoanCheckout(5, 6)).toThrow("Insufficient stock available");
    });

    it("throws an error for non-positive or non-integer quantities", () => {
      expect(() => applyBulkLoanCheckout(10, 0)).toThrow("positive integer");
      expect(() => applyBulkLoanCheckout(10, -3)).toThrow("positive integer");
      expect(() => applyBulkLoanCheckout(10, 2.5)).toThrow("positive integer");
    });
  });

  describe("applyBulkLoanReturn", () => {
    it("restores returned quantity to available stock without modifying total when zero loss", () => {
      const result = applyBulkLoanReturn(24, 18, 6, 0);
      expect(result.newTotal).toBe(24);
      expect(result.newAvailable).toBe(24);
      expect(result.lostCount).toBe(0);
    });

    it("handles partial returns with lost units (e.g., 4 returned, 2 lost)", () => {
      // Out of 6 checked out, 4 returned, 2 lost
      const result = applyBulkLoanReturn(24, 18, 4, 2);
      expect(result.newTotal).toBe(22); // Total drops by 2 lost balls
      expect(result.newAvailable).toBe(22); // Available increases by 4 returned balls (18 + 4 = 22)
      expect(result.lostCount).toBe(2);
    });

    it("rejects returns where available would exceed total", () => {
      expect(() => applyBulkLoanReturn(20, 19, 5, 0)).toThrow("Stock invariant violation");
    });

    it("rejects negative return or lost quantities", () => {
      expect(() => applyBulkLoanReturn(20, 15, -1, 0)).toThrow("non-negative");
      expect(() => applyBulkLoanReturn(20, 15, 2, -1)).toThrow("non-negative");
    });
  });

  describe("applyDirectConsumption (Clarification 1 - No Return Expected)", () => {
    it("decrements both total and available stock for direct league match balls", () => {
      const result = applyDirectConsumption(24, 24, 2);
      expect(result.newTotal).toBe(22);
      expect(result.newAvailable).toBe(22);
    });

    it("throws error when consumption exceeds available stock", () => {
      expect(() => applyDirectConsumption(10, 2, 4)).toThrow("Insufficient stock for consumption");
    });

    it("throws error for non-positive consumption counts", () => {
      expect(() => applyDirectConsumption(10, 10, 0)).toThrow("positive integer");
      expect(() => applyDirectConsumption(10, 10, -2)).toThrow("positive integer");
    });
  });

  describe("applyRestock", () => {
    it("increments both total and available quantities when purchasing new stock", () => {
      const result = applyRestock(24, 18, 24);
      expect(result.newTotal).toBe(48);
      expect(result.newAvailable).toBe(42);
    });

    it("rejects non-positive restock quantities", () => {
      expect(() => applyRestock(20, 10, 0)).toThrow("positive integer");
      expect(() => applyRestock(20, 10, -5)).toThrow("positive integer");
    });
  });

  describe("applyWriteOff", () => {
    it("decrements both total and available when writing off stock from shelf", () => {
      const result = applyWriteOff(20, 15, 3, false);
      expect(result.newTotal).toBe(17);
      expect(result.newAvailable).toBe(12);
    });

    it("decrements only total when writing off an already-loaned item that was lost", () => {
      const result = applyWriteOff(20, 15, 1, true);
      expect(result.newTotal).toBe(19);
      expect(result.newAvailable).toBe(15);
    });
  });

  describe("isLowStock", () => {
    it("returns true when available stock is at or below threshold", () => {
      expect(isLowStock(6, 6)).toBe(true);
      expect(isLowStock(4, 6)).toBe(true);
      expect(isLowStock(0, 6)).toBe(true);
    });

    it("returns false when available stock is above threshold", () => {
      expect(isLowStock(7, 6)).toBe(false);
      expect(isLowStock(24, 6)).toBe(false);
    });

    it("returns false when lowStockThreshold is null or undefined", () => {
      expect(isLowStock(2, null)).toBe(false);
      expect(isLowStock(2, undefined)).toBe(false);
    });
  });
});
