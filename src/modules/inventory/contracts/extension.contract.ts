import { z } from "zod";
import { ExtensionStatus } from "@prisma/client";

export const requestLoanExtensionSchema = z.object({
  loanId: z.string().min(1, "Invalid loan ID"),
  proposedReturnAt: z.coerce.date(),
  reason: z
    .string()
    .trim()
    .min(5, "Reason must be at least 5 characters")
    .max(300, "Reason cannot exceed 300 characters"),
});

export type RequestLoanExtensionInput = z.infer<typeof requestLoanExtensionSchema>;

export const reviewLoanExtensionSchema = z.object({
  extensionId: z.string().min(1, "Invalid extension ID"),
  decision: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z
    .string()
    .trim()
    .max(300, "Rejection reason cannot exceed 300 characters")
    .optional(),
});

export type ReviewLoanExtensionInput = z.infer<typeof reviewLoanExtensionSchema>;
