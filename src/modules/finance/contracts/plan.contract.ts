import { z } from "zod";

export const createMembershipPlanSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "Code must be at least 3 characters")
    .max(50, "Code cannot exceed 50 characters")
    .toUpperCase(),
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(100),
  category: z.enum([
    "SENIOR_COMPETITIVE",
    "YOUTH_U15_U13",
    "SOCIAL_PASSIVE",
    "INDOOR_WINTER_ADDON",
  ]),
  billingCycle: z.enum(["ANNUAL", "SUMMER_OUTDOOR", "WINTER_INDOOR"]),
  amountOere: z
    .number()
    .int("Amount must be an integer in øre")
    .positive("Plan fee must be a positive integer in øre"),
  siblingDiscountPercent: z
    .number()
    .int()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%")
    .default(25),
  description: z.string().trim().max(500).optional(),
});

export type CreateMembershipPlanInput = z.infer<typeof createMembershipPlanSchema>;

export const updateMembershipPlanSchema = z.object({
  id: z.string().uuid("Invalid plan ID"),
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(100).optional(),
  amountOere: z.number().int().positive("Amount must be a positive integer in øre").optional(),
  siblingDiscountPercent: z
    .number()
    .int()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%")
    .optional(),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateMembershipPlanInput = z.infer<typeof updateMembershipPlanSchema>;
