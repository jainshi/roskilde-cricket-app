import { z } from "zod";

export const exportBogfoeringslovenLedgerSchema = z.object({
  fiscalYear: z.number().int().min(2020).max(2050).default(new Date().getFullYear()),
  category: z
    .enum(["ALL", "MEMBERSHIP_DUES", "EVENT_FEE", "EQUIPMENT_CHARGE", "AD_HOC"])
    .default("ALL"),
  includeUnpaid: z.boolean().default(true),
  delimiter: z.enum([";", ","]).default(";"),
});

export type ExportBogfoeringslovenLedgerInput = z.infer<typeof exportBogfoeringslovenLedgerSchema>;
