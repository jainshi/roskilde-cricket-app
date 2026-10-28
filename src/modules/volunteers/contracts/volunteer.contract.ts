import { z } from "zod";
import { VolunteerDutyType, VolunteerSlotStatus } from "@prisma/client";

export const VolunteerDutyTypeEnum = z.nativeEnum(VolunteerDutyType);
export const VolunteerSlotStatusEnum = z.nativeEnum(VolunteerSlotStatus);

export const createVolunteerDutySlotSchema = z.object({
  eventId: z.string().uuid("Event ID is required"),
  dutyType: VolunteerDutyTypeEnum,
  title: z.string().min(3, "Title must be at least 3 characters").max(80),
  description: z.string().max(300).optional().nullable(),
  carpoolSeats: z.number().int().min(1).max(10).optional().nullable(),
  assignedProfileId: z.string().uuid().optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
});

export type CreateVolunteerDutySlotInput = z.infer<typeof createVolunteerDutySlotSchema>;

export const assignVolunteerDutySlotSchema = z.object({
  slotId: z.string().uuid(),
  memberProfileId: z.string().uuid("Target volunteer member is required"),
  notes: z.string().max(300).optional().nullable(),
});

export type AssignVolunteerDutySlotInput = z.infer<typeof assignVolunteerDutySlotSchema>;

export const claimVolunteerDutySlotSchema = z.object({
  slotId: z.string().uuid(),
  carpoolSeatsOffered: z.number().int().min(1).max(9).optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
});

export type ClaimVolunteerDutySlotInput = z.infer<typeof claimVolunteerDutySlotSchema>;

export const requestVolunteerSwapSchema = z.object({
  slotId: z.string().uuid(),
  swapReason: z.string().min(3, "Please provide a reason for the swap request").max(200),
});

export type RequestVolunteerSwapInput = z.infer<typeof requestVolunteerSwapSchema>;

export const acceptVolunteerSwapSchema = z.object({
  slotId: z.string().uuid(),
});

export type AcceptVolunteerSwapInput = z.infer<typeof acceptVolunteerSwapSchema>;

export const unassignVolunteerDutySlotSchema = z.object({
  slotId: z.string().uuid(),
});

export type UnassignVolunteerDutySlotInput = z.infer<typeof unassignVolunteerDutySlotSchema>;
