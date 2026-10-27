import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

export const verifyPaymentTransactionSchema = z.object({
  transactionId: z.string().uuid("Invalid transaction ID"),
  action: z.enum(["VERIFY", "REJECT"]),
  rejectionReason: z.string().trim().max(300).optional(),
}).refine(
  (data) => {
    if (data.action === "REJECT" && (!data.rejectionReason || data.rejectionReason.trim().length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: "A rejection reason is required when rejecting a payment report",
    path: ["rejectionReason"],
  }
);

export type VerifyPaymentTransactionInput = z.infer<typeof verifyPaymentTransactionSchema>;

export const recordPartialPaymentSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID"),
  amountOere: z.number().int().positive("Payment amount must be greater than 0"),
  paymentMethod: z.nativeEnum(PaymentMethod),
  transactionReference: z.string().trim().max(100).optional(),
  settlementDate: z.coerce.date().optional(),
  notes: z.string().trim().max(300).optional(),
});

export type RecordPartialPaymentInput = z.infer<typeof recordPartialPaymentSchema>;

export const waiveInvoiceSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID"),
  reason: z
    .string()
    .trim()
    .min(3, "Mandatory justification note is required to waive an invoice")
    .max(300),
});

export type WaiveInvoiceInput = z.infer<typeof waiveInvoiceSchema>;

export const sendOverdueReminderSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID"),
});

export type SendOverdueReminderInput = z.infer<typeof sendOverdueReminderSchema>;

export const batchSendOverdueRemindersSchema = z.object({
  invoiceIds: z.array(z.string().uuid()).optional(),
  minDaysOverdue: z.number().int().min(1).default(1),
});

export type BatchSendOverdueRemindersInput = z.infer<typeof batchSendOverdueRemindersSchema>;
