import { z } from "zod";

export const recordStockConsumptionSchema = z.object({
  equipmentItemId: z.string().uuid("Invalid equipment ID"),
  quantity: z.coerce.number().int().min(1, "Consumed quantity must be at least 1"),
  recipientProfileId: z.string().uuid("Invalid recipient profile ID").optional(),
  teamOrSquadName: z.string().trim().max(100, "Team/Squad name too long").optional(),
  reason: z
    .string()
    .trim()
    .min(3, "Reason must be at least 3 characters")
    .max(250, "Reason cannot exceed 250 characters"),
});

export type RecordStockConsumptionInput = z.infer<typeof recordStockConsumptionSchema>;

export const restockBulkEquipmentSchema = z.object({
  equipmentItemId: z.string().uuid("Invalid equipment ID"),
  quantityToAdd: z.coerce.number().int().min(1, "Restock quantity must be at least 1"),
  reason: z
    .string()
    .trim()
    .max(250, "Reason cannot exceed 250 characters")
    .default("Club inventory restocking purchase"),
});

export type RestockBulkEquipmentInput = z.infer<typeof restockBulkEquipmentSchema>;
