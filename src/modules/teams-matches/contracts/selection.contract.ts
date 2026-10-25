import { z } from "zod";
import {
  LineupSlot,
  MatchTacticalRole,
  SelectionPublicationStatus,
} from "@prisma/client";

export const lineupSlotEnum = z.nativeEnum(LineupSlot);
export const matchTacticalRoleEnum = z.nativeEnum(MatchTacticalRole);
export const selectionPublicationStatusEnum = z.nativeEnum(
  SelectionPublicationStatus
);

export const matchSelectionPlayerInputSchema = z.object({
  memberProfileId: z.string().min(1, "Invalid player profile ID"),
  selectionRole: lineupSlotEnum,
  tacticalRole: matchTacticalRoleEnum.default("PLAYER"),
  battingOrderPosition: z.coerce.number().int().min(1).max(15).optional().nullable(),
});

export type MatchSelectionPlayerInput = z.infer<
  typeof matchSelectionPlayerInputSchema
>;

/**
 * Schema for saving a draft match squad lineup
 */
export const saveMatchLineupDraftSchema = z.object({
  scheduledEventId: z.string().min(1, "Invalid event ID"),
  targetLineupSize: z.coerce.number().int().min(6).max(15).default(11),
  players: z.array(matchSelectionPlayerInputSchema),
  notes: z.string().trim().max(500, "Notes cannot exceed 500 characters").optional().nullable(),
});

export type SaveMatchLineupDraftInput = z.infer<
  typeof saveMatchLineupDraftSchema
>;

/**
 * Schema for validating and publishing the final match squad lineup
 */
export const publishMatchLineupSchema = z.object({
  scheduledEventId: z.string().min(1, "Invalid event ID"),
  targetLineupSize: z.coerce.number().int().min(6).max(15).default(11),
  players: z
    .array(matchSelectionPlayerInputSchema)
    .min(6, "At least 6 players must be selected in the squad"),
  notes: z.string().trim().max(500, "Notes cannot exceed 500 characters").optional().nullable(),
});

export type PublishMatchLineupInput = z.infer<typeof publishMatchLineupSchema>;
