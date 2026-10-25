import { z } from "zod";
import {
  TrackingType,
  EquipmentCategory,
  AgeGroup,
  ItemCondition,
  ItemStatus,
} from "@prisma/client";

export const createEquipmentItemSchema = z.object({
  assetTag: z
    .string()
    .trim()
    .min(2, "Asset tag must be at least 2 characters")
    .max(50, "Asset tag cannot exceed 50 characters")
    .nullable()
    .optional(),
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  description: z.string().trim().max(500, "Description cannot exceed 500 characters").optional(),
  trackingType: z.nativeEnum(TrackingType),
  category: z.nativeEnum(EquipmentCategory),
  ageGroup: z.nativeEnum(AgeGroup).default(AgeGroup.UNIVERSAL),
  condition: z.nativeEnum(ItemCondition).default(ItemCondition.GOOD),
  storageLocation: z
    .string()
    .trim()
    .min(2, "Storage location must be at least 2 characters")
    .max(100, "Storage location cannot exceed 100 characters"),
  totalQuantity: z.coerce.number().int().min(1, "Total quantity must be at least 1").default(1),
  lowStockThreshold: z.coerce
    .number()
    .int()
    .min(0, "Threshold must be non-negative")
    .nullable()
    .optional(),
  purchasePriceMinorUnits: z.coerce
    .number()
    .int()
    .min(0, "Purchase price cannot be negative")
    .nullable()
    .optional(), // Stored in integer øre (1 DKK = 100 øre)
  acquisitionDate: z.coerce.date().nullable().optional(),
  warrantyExpiresAt: z.coerce.date().nullable().optional(),
}).refine(
  (data) => {
    // For serialized items, total quantity must be 1 and asset tag is recommended
    if (data.trackingType === TrackingType.SERIALIZED) {
      return data.totalQuantity === 1;
    }
    return true;
  },
  {
    message: "Serialized items must have total quantity equal to 1.",
    path: ["totalQuantity"],
  }
);

export type CreateEquipmentItemInput = z.infer<typeof createEquipmentItemSchema>;

export const updateEquipmentItemSchema = z.object({
  id: z.string().uuid("Invalid equipment ID"),
  assetTag: z.string().trim().min(2).max(50).nullable().optional(),
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  category: z.nativeEnum(EquipmentCategory).optional(),
  ageGroup: z.nativeEnum(AgeGroup).optional(),
  condition: z.nativeEnum(ItemCondition).optional(),
  status: z.nativeEnum(ItemStatus).optional(),
  storageLocation: z.string().trim().min(2).max(100).optional(),
  totalQuantity: z.coerce.number().int().min(1).optional(),
  availableQuantity: z.coerce.number().int().min(0).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).nullable().optional(),
  purchasePriceMinorUnits: z.coerce.number().int().min(0).nullable().optional(),
  acquisitionDate: z.coerce.date().nullable().optional(),
  warrantyExpiresAt: z.coerce.date().nullable().optional(),
  retiredReason: z.string().trim().max(250).optional(),
});

export type UpdateEquipmentItemInput = z.infer<typeof updateEquipmentItemSchema>;

export const catalogFilterSchema = z.object({
  category: z.nativeEnum(EquipmentCategory).optional(),
  ageGroup: z.nativeEnum(AgeGroup).optional(),
  condition: z.nativeEnum(ItemCondition).optional(),
  status: z.nativeEnum(ItemStatus).optional(),
  trackingType: z.nativeEnum(TrackingType).optional(),
  storageLocation: z.string().optional(),
  search: z.string().optional(),
  onlyLowStock: z.boolean().optional(),
});

export type CatalogFilterInput = z.infer<typeof catalogFilterSchema>;
