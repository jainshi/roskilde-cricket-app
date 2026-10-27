import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

export const reportInvoicePaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID or number is required"),
  amountOere: z.number().int().positive("Payment amount must be greater than 0"),
  paymentMethod: z.nativeEnum(PaymentMethod, {
    errorMap: () => ({ message: "Select a valid payment method (MobilePay, Bank Transfer, or Cash)" }),
  }),
  transactionReference: z.string().trim().max(100).optional(),
  settlementDate: z.coerce.date().optional(),
  notes: z.string().trim().max(300).optional(),
});

export type ReportInvoicePaymentInput = z.infer<typeof reportInvoicePaymentSchema>;
