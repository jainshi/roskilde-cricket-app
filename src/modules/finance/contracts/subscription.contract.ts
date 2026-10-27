import { z } from "zod";

export const enrollMemberSubscriptionSchema = z.object({
  memberProfileId: z.string().uuid("Invalid member profile ID"),
  planId: z.string().uuid("Invalid plan ID"),
  seasonYear: z.number().int().min(2025).max(2050),
  manualDiscountOere: z.number().int().min(0, "Discount cannot be negative").optional(),
  overrideReason: z.string().trim().max(300).optional(),
});

export type EnrollMemberSubscriptionInput = z.infer<typeof enrollMemberSubscriptionSchema>;

export const overrideSubscriptionDiscountSchema = z.object({
  subscriptionId: z.string().uuid("Invalid subscription ID"),
  manualDiscountOere: z.number().int().min(0, "Discount cannot be negative"),
  overrideReason: z
    .string()
    .trim()
    .min(3, "A documented justification is required for manual discount overrides")
    .max(300),
});

export type OverrideSubscriptionDiscountInput = z.infer<typeof overrideSubscriptionDiscountSchema>;
