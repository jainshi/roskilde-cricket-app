import { z } from "zod";
import { RsvpStatus } from "@prisma/client";

export const rsvpStatusEnum = z.nativeEnum(RsvpStatus);

/**
 * Schema for submitting or updating a 1-tap event RSVP
 */
export const submitEventRsvpSchema = z.object({
  scheduledEventId: z.string().uuid("Invalid event ID"),
  memberProfileId: z.string().uuid("Invalid member profile ID"),
  status: z.enum(["AVAILABLE", "UNAVAILABLE", "MAYBE"]),
  transportNote: z.string().trim().max(300, "Transport note must be 300 characters or less").optional().nullable(),
});

export type SubmitEventRsvpInput = z.infer<typeof submitEventRsvpSchema>;

/**
 * Schema for updating only the transport/carpooling note
 */
export const updateTransportNoteSchema = z.object({
  scheduledEventId: z.string().uuid("Invalid event ID"),
  memberProfileId: z.string().uuid("Invalid member profile ID"),
  transportNote: z.string().trim().max(300, "Transport note must be 300 characters or less").optional().nullable(),
});

export type UpdateTransportNoteInput = z.infer<typeof updateTransportNoteSchema>;
