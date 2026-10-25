import { z } from "zod";
import { ItemCondition } from "@prisma/client";

export const checkoutEquipmentSchema = z.object({
  equipmentItemId: z.string().min(1, "Invalid equipment ID"),
  borrowerProfileId: z.string().min(1, "Invalid borrower profile ID"),
  quantity: z.coerce.number().int().min(1, "Checkout quantity must be at least 1").default(1),
  teamOrSquadName: z.string().trim().max(100, "Team/Squad name too long").optional(),
  expectedReturnAt: z.coerce.date().optional(),
  checkoutCondition: z.nativeEnum(ItemCondition).default(ItemCondition.GOOD),
  checkoutNotes: z.string().trim().max(500, "Notes cannot exceed 500 characters").optional(),
});

export type CheckoutEquipmentInput = z.infer<typeof checkoutEquipmentSchema>;

export const checkinEquipmentSchema = z.object({
  loanId: z.string().min(1, "Invalid loan ID"),
  returnCondition: z.nativeEnum(ItemCondition),
  returnNotes: z.string().trim().max(500, "Notes cannot exceed 500 characters").optional(),
  returnedQuantity: z.coerce.number().int().min(0, "Returned quantity cannot be negative").optional(),
  lostQuantity: z.coerce.number().int().min(0, "Lost quantity cannot be negative").default(0),
});

export type CheckinEquipmentInput = z.infer<typeof checkinEquipmentSchema>;
