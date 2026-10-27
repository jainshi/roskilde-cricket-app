import { describe, it, expect } from "vitest";
import { PaymentMethod, InvoiceStatus } from "@prisma/client";
import { reportInvoicePaymentSchema } from "@/modules/finance/contracts/payment.contract";
import {
  verifyPaymentTransactionSchema,
  recordPartialPaymentSchema,
  waiveInvoiceSchema,
} from "@/modules/finance/contracts/reconciliation.contract";
import { evaluateOverdueBadge } from "@/modules/finance/domain/invoice-lifecycle";

describe("Phase 5: Mobile Payment & Reconciliation Contracts & Domain Rules", () => {
  describe("reportInvoicePaymentSchema", () => {
    it("should accept valid payment report payload", () => {
      const valid = {
        invoiceId: "RCC-INV-2026-0001",
        amountOere: 50000,
        paymentMethod: PaymentMethod.MOBILEPAY,
        transactionReference: "MP-98765-ABC",
      };
      const res = reportInvoicePaymentSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it("should reject non-positive amounts", () => {
      const invalid = {
        invoiceId: "RCC-INV-2026-0001",
        amountOere: 0,
        paymentMethod: PaymentMethod.MOBILEPAY,
      };
      const res = reportInvoicePaymentSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });

    it("should reject invalid payment methods", () => {
      const invalid = {
        invoiceId: "RCC-INV-2026-0001",
        amountOere: 50000,
        paymentMethod: "BITCOIN",
      };
      const res = reportInvoicePaymentSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });

  describe("verifyPaymentTransactionSchema", () => {
    it("should accept valid VERIFY action without rejection reason", () => {
      const valid = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        action: "VERIFY",
      };
      const res = verifyPaymentTransactionSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it("should require rejectionReason when action is REJECT", () => {
      const invalid = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        action: "REJECT",
      };
      const res = verifyPaymentTransactionSchema.safeParse(invalid);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("rejection reason is required");
      }
    });

    it("should accept REJECT when reason is provided", () => {
      const valid = {
        transactionId: "123e4567-e89b-12d3-a456-426614174000",
        action: "REJECT",
        rejectionReason: "Bank deposit does not match reference",
      };
      const res = verifyPaymentTransactionSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });
  });

  describe("waiveInvoiceSchema", () => {
    it("should require at least 3 characters for justification note", () => {
      const invalid = {
        invoiceId: "123e4567-e89b-12d3-a456-426614174000",
        reason: "ok",
      };
      const res = waiveInvoiceSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });

    it("should accept valid waiver with documented reason", () => {
      const valid = {
        invoiceId: "123e4567-e89b-12d3-a456-426614174000",
        reason: "Youth municipal grant approved for 2026 season",
      };
      const res = waiveInvoiceSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });
  });

  describe("Module 3 Overdue Badge Evaluation (>14d)", () => {
    it("should return false for invoices less than 14 days overdue", () => {
      const refDate = new Date("2026-05-10T12:00:00Z");
      const dueDate = new Date("2026-05-01T12:00:00Z"); // 9 days overdue

      const result = evaluateOverdueBadge(
        [
          {
            dueDate,
            status: InvoiceStatus.OPEN,
            totalOere: 50000,
            paidOere: 0,
          },
        ],
        refDate
      );

      expect(result.hasOverdueWarning).toBe(false);
      expect(result.maxDaysOverdue).toBe(9);
      expect(result.outstandingOere).toBe(50000);
    });

    it("should trigger amber warning badge when invoice exceeds 14 days overdue", () => {
      const refDate = new Date("2026-05-20T12:00:00Z");
      const dueDate = new Date("2026-05-01T12:00:00Z"); // 19 days overdue

      const result = evaluateOverdueBadge(
        [
          {
            dueDate,
            status: InvoiceStatus.OVERDUE,
            totalOere: 80000,
            paidOere: 0,
          },
        ],
        refDate
      );

      expect(result.hasOverdueWarning).toBe(true);
      expect(result.maxDaysOverdue).toBe(19);
      expect(result.overdueInvoiceCount).toBe(1);
    });

    it("should ignore settled, waived, or cancelled invoices", () => {
      const refDate = new Date("2026-05-20T12:00:00Z");
      const dueDate = new Date("2026-04-01T12:00:00Z"); // 49 days overdue if open

      const result = evaluateOverdueBadge(
        [
          {
            dueDate,
            status: InvoiceStatus.PAID,
            totalOere: 50000,
            paidOere: 50000,
          },
          {
            dueDate,
            status: InvoiceStatus.WAIVED,
            totalOere: 50000,
            paidOere: 0,
          },
        ],
        refDate
      );

      expect(result.hasOverdueWarning).toBe(false);
      expect(result.maxDaysOverdue).toBe(0);
      expect(result.outstandingOere).toBe(0);
    });
  });
});
