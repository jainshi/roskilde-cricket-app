import { describe, it, expect } from "vitest";
import { InvoiceStatus } from "@prisma/client";
import {
  formatInvoiceNumber,
  parseInvoiceNumber,
  canTransitionInvoiceStatus,
  isInvoiceImmutable,
  evaluateOverdueBadge,
} from "../../../src/modules/finance/domain/invoice-lifecycle";

describe("invoice-lifecycle domain rules", () => {
  describe("formatInvoiceNumber & parseInvoiceNumber", () => {
    it("formats sequential invoice numbers with padded 4 digits", () => {
      expect(formatInvoiceNumber(2026, 1)).toBe("RCC-INV-2026-0001");
      expect(formatInvoiceNumber(2026, 42)).toBe("RCC-INV-2026-0042");
      expect(formatInvoiceNumber(2026, 999)).toBe("RCC-INV-2026-0999");
      expect(formatInvoiceNumber(2026, 1000)).toBe("RCC-INV-2026-1000");
    });

    it("throws on invalid year or sequence", () => {
      expect(() => formatInvoiceNumber(1990, 1)).toThrow(RangeError);
      expect(() => formatInvoiceNumber(2026, 0)).toThrow(RangeError);
      expect(() => formatInvoiceNumber(2026, -5)).toThrow(RangeError);
    });

    it("parses valid invoice numbers accurately", () => {
      expect(parseInvoiceNumber("RCC-INV-2026-0042")).toEqual({
        year: 2026,
        sequence: 42,
      });
      expect(parseInvoiceNumber("RCC-INV-2027-1234")).toEqual({
        year: 2027,
        sequence: 1234,
      });
    });

    it("returns null for malformed invoice numbers", () => {
      expect(parseInvoiceNumber("INV-2026-0042")).toBeNull();
      expect(parseInvoiceNumber("RCC-2026-0042")).toBeNull();
      expect(parseInvoiceNumber("random-string")).toBeNull();
    });
  });

  describe("canTransitionInvoiceStatus & isInvoiceImmutable", () => {
    it("allows standard payment lifecycle transitions", () => {
      expect(canTransitionInvoiceStatus(InvoiceStatus.DRAFT, InvoiceStatus.OPEN)).toBe(true);
      expect(canTransitionInvoiceStatus(InvoiceStatus.OPEN, InvoiceStatus.PENDING_VERIFICATION)).toBe(true);
      expect(canTransitionInvoiceStatus(InvoiceStatus.PENDING_VERIFICATION, InvoiceStatus.PAID)).toBe(true);
      expect(canTransitionInvoiceStatus(InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID)).toBe(true);
      expect(canTransitionInvoiceStatus(InvoiceStatus.OPEN, InvoiceStatus.OVERDUE)).toBe(true);
      expect(canTransitionInvoiceStatus(InvoiceStatus.OVERDUE, InvoiceStatus.PAID)).toBe(true);
      expect(canTransitionInvoiceStatus(InvoiceStatus.OPEN, InvoiceStatus.WAIVED)).toBe(true);
    });

    it("prohibits transition out of terminal immutable states per Bogføringsloven", () => {
      expect(canTransitionInvoiceStatus(InvoiceStatus.PAID, InvoiceStatus.OPEN)).toBe(false);
      expect(canTransitionInvoiceStatus(InvoiceStatus.PAID, InvoiceStatus.DRAFT)).toBe(false);
      expect(canTransitionInvoiceStatus(InvoiceStatus.WAIVED, InvoiceStatus.OPEN)).toBe(false);
      expect(canTransitionInvoiceStatus(InvoiceStatus.CANCELLED, InvoiceStatus.OPEN)).toBe(false);
    });

    it("identifies immutable terminal statuses", () => {
      expect(isInvoiceImmutable(InvoiceStatus.PAID)).toBe(true);
      expect(isInvoiceImmutable(InvoiceStatus.WAIVED)).toBe(true);
      expect(isInvoiceImmutable(InvoiceStatus.CANCELLED)).toBe(true);
      expect(isInvoiceImmutable(InvoiceStatus.OPEN)).toBe(false);
      expect(isInvoiceImmutable(InvoiceStatus.OVERDUE)).toBe(false);
    });
  });

  describe("evaluateOverdueBadge (Module 3 Match Squad Selection Console)", () => {
    const referenceDate = new Date("2026-06-01T12:00:00Z");

    it("returns no warning badge when invoices are settled or within due date", () => {
      const settled = [
        {
          dueDate: new Date("2026-05-01T00:00:00Z"),
          status: InvoiceStatus.PAID,
          totalOere: 180000,
          paidOere: 180000,
        },
        {
          dueDate: new Date("2026-06-15T00:00:00Z"), // future due date
          status: InvoiceStatus.OPEN,
          totalOere: 100000,
          paidOere: 0,
        },
      ];

      const result = evaluateOverdueBadge(settled, referenceDate);
      expect(result.hasOverdueWarning).toBe(false);
      expect(result.outstandingOere).toBe(0);
    });

    it("triggers amber warning badge when an invoice is overdue by >14 days", () => {
      const overdue = [
        {
          // Due May 10, reference June 1 -> 22 days overdue (>14d)
          dueDate: new Date("2026-05-10T00:00:00Z"),
          status: InvoiceStatus.OVERDUE,
          totalOere: 100000,
          paidOere: 0,
        },
      ];

      const result = evaluateOverdueBadge(overdue, referenceDate);
      expect(result.hasOverdueWarning).toBe(true);
      expect(result.maxDaysOverdue).toBe(22);
      expect(result.outstandingOere).toBe(100000);
      expect(result.overdueInvoiceCount).toBe(1);
    });

    it("does not trigger >14d warning when invoice is only 7 days overdue", () => {
      const slightlyLate = [
        {
          // Due May 25, reference June 1 -> 7 days overdue (<= 14d)
          dueDate: new Date("2026-05-25T00:00:00Z"),
          status: InvoiceStatus.OPEN,
          totalOere: 100000,
          paidOere: 0,
        },
      ];

      const result = evaluateOverdueBadge(slightlyLate, referenceDate);
      expect(result.hasOverdueWarning).toBe(false); // only 7 days
      expect(result.maxDaysOverdue).toBe(7);
      expect(result.outstandingOere).toBe(100000);
      expect(result.overdueInvoiceCount).toBe(0);
    });
  });
});
