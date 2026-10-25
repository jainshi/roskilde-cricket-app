import { z } from "zod";

export const DAMAGE_SEVERITY_VALUES = ["MINOR", "MAJOR", "BEYOND_REPAIR", "LOST"] as const;
export type DamageSeverity = (typeof DAMAGE_SEVERITY_VALUES)[number];

export const reportDamageSchema = z.object({
  equipmentItemId: z.string().min(1, "Invalid equipment ID"),
  loanId: z.string().min(1).optional().nullable(),
  severity: z.enum(DAMAGE_SEVERITY_VALUES),
  description: z
    .string()
    .trim()
    .min(5, "Description must be at least 5 characters")
    .max(1000, "Description cannot exceed 1000 characters"),
});

export type ReportDamageInput = z.infer<typeof reportDamageSchema>;

export const DAMAGE_RESOLUTION_VALUES = [
  "REPAIRED",
  "RETIRED_WRITTEN_OFF",
  "DISMISSED",
] as const;
export type DamageResolution = (typeof DAMAGE_RESOLUTION_VALUES)[number];

export const resolveDamageReportSchema = z.object({
  reportId: z.string().min(1, "Invalid report ID"),
  resolution: z.enum(DAMAGE_RESOLUTION_VALUES),
  resolutionNotes: z
    .string()
    .trim()
    .min(3, "Resolution notes must be at least 3 characters")
    .max(500, "Resolution notes cannot exceed 500 characters"),
});

export type ResolveDamageReportInput = z.infer<typeof resolveDamageReportSchema>;
