import { z } from "zod";

export const generateSeasonalInvoicesSchema = z.object({
  seasonYear: z.number().int().min(2025).max(2050),
  seasonCycle: z.enum(["ANNUAL", "SUMMER_OUTDOOR", "WINTER_INDOOR"]),
  planId: z.string().uuid().optional(),
  teamSquadId: z.string().uuid().optional(),
  dueDateDays: z.number().int().min(7).max(90).default(30),
});

export type GenerateSeasonalInvoicesInput = z.infer<
  typeof generateSeasonalInvoicesSchema
>;

export const createAdHocInvoiceSchema = z.object({
  memberProfileId: z.string().uuid("Invalid beneficiary member profile ID"),
  category: z.enum(["EVENT_FEE", "EQUIPMENT_CHARGE", "AD_HOC"]),
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(150),
  lineItems: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(200),
        quantity: z.number().int().min(1).default(1),
        unitPriceOere: z
          .number()
          .int()
          .positive("Unit price must be a positive integer in øre"),
      })
    )
    .min(1, "At least one line item is required"),
  dueDate: z.string().or(z.date()),
  notes: z.string().trim().max(500).optional(),
  linkedEquipmentLoanId: z.string().uuid().optional(),
  linkedDamageReportId: z.string().uuid().optional(),
  linkedScheduledEventId: z.string().uuid().optional(),
});

export type CreateAdHocInvoiceInput = z.infer<typeof createAdHocInvoiceSchema>;
