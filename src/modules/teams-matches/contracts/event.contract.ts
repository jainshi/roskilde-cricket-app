import { z } from "zod";
import {
  EventType,
  MatchType,
  TrainingType,
  EventLifecycleStatus,
  FacilityType,
} from "@prisma/client";

export const eventTypeEnum = z.nativeEnum(EventType);
export const matchTypeEnum = z.nativeEnum(MatchType);
export const trainingTypeEnum = z.nativeEnum(TrainingType);
export const eventLifecycleStatusEnum = z.nativeEnum(EventLifecycleStatus);
export const facilityTypeEnum = z.nativeEnum(FacilityType);

/**
 * Schema for creating a scheduled event (fixture or training)
 */
export const createScheduledEventSchema = z
  .object({
    teamSquadId: z.string().uuid("Invalid squad ID"),
    facilityId: z.string().uuid("Invalid facility ID").optional().nullable(),
    eventType: eventTypeEnum,
    matchType: matchTypeEnum.optional().nullable(),
    trainingType: trainingTypeEnum.optional().nullable(),
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(150),
    date: z.string().min(1, "Date is required"),
    meetAt: z.string().optional().nullable(),
    startAt: z.string().min(1, "Start time is required"),
    endAt: z.string().min(1, "End time is required"),
    isHome: z.boolean().default(true),
    opponentName: z.string().trim().max(100).optional().nullable(),
    venueName: z.string().trim().max(100).optional().nullable(),
    venueAddress: z.string().trim().max(250).optional().nullable(),
    rsvpDeadlineAt: z.string().min(1, "RSVP deadline is required"),
    targetLineupSize: z.coerce.number().int().min(6).max(15).default(11),
    scorecardUrl: z
      .string()
      .trim()
      .url("Must be a valid URL")
      .max(300)
      .optional()
      .nullable()
      .or(z.literal("")),
    linkedEquipmentLoanId: z.string().uuid("Invalid loan ID").optional().nullable(),
    collisionOverrideReason: z
      .string()
      .trim()
      .min(5, "Override reason must be at least 5 characters")
      .max(300)
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      const s = new Date(data.startAt).getTime();
      const e = new Date(data.endAt).getTime();
      return isNaN(s) || isNaN(e) || s < e;
    },
    {
      message: "Event end time must be after start time",
      path: ["endAt"],
    }
  );

export type CreateScheduledEventInput = z.infer<typeof createScheduledEventSchema>;

/**
 * Schema for updating an existing scheduled event
 */
export const updateScheduledEventSchema = z
  .object({
    id: z.string().uuid("Invalid event ID"),
    facilityId: z.string().uuid("Invalid facility ID").optional().nullable(),
    eventType: eventTypeEnum.optional(),
    matchType: matchTypeEnum.optional().nullable(),
    trainingType: trainingTypeEnum.optional().nullable(),
    title: z.string().trim().min(3).max(150).optional(),
    date: z.string().optional(),
    meetAt: z.string().optional().nullable(),
    startAt: z.string().optional(),
    endAt: z.string().optional(),
    isHome: z.boolean().optional(),
    opponentName: z.string().trim().max(100).optional().nullable(),
    venueName: z.string().trim().max(100).optional().nullable(),
    venueAddress: z.string().trim().max(250).optional().nullable(),
    rsvpDeadlineAt: z.string().optional(),
    targetLineupSize: z.coerce.number().int().min(6).max(15).optional(),
    scorecardUrl: z
      .string()
      .trim()
      .url("Must be a valid URL")
      .max(300)
      .optional()
      .nullable()
      .or(z.literal("")),
    linkedEquipmentLoanId: z.string().uuid().optional().nullable(),
    collisionOverrideReason: z
      .string()
      .trim()
      .min(5)
      .max(300)
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.startAt && data.endAt) {
        const s = new Date(data.startAt).getTime();
        const e = new Date(data.endAt).getTime();
        return isNaN(s) || isNaN(e) || s < e;
      }
      return true;
    },
    {
      message: "Event end time must be after start time",
      path: ["endAt"],
    }
  );

export type UpdateScheduledEventInput = z.infer<typeof updateScheduledEventSchema>;

/**
 * Schema for updating event lifecycle status
 */
export const updateEventLifecycleStatusSchema = z.object({
  id: z.string().uuid("Invalid event ID"),
  lifecycleStatus: eventLifecycleStatusEnum,
  notes: z.string().trim().max(300).optional().nullable(),
});

export type UpdateEventLifecycleStatusInput = z.infer<
  typeof updateEventLifecycleStatusSchema
>;

/**
 * Schema for facility creation and updates
 */
export const createFacilitySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  facilityType: facilityTypeEnum,
  location: z.string().trim().max(150).optional().nullable(),
  capacity: z.coerce.number().int().min(1).max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});

export type CreateFacilityInput = z.infer<typeof createFacilitySchema>;

export const updateFacilitySchema = createFacilitySchema.partial().extend({
  id: z.string().uuid("Invalid facility ID"),
});

export type UpdateFacilityInput = z.infer<typeof updateFacilitySchema>;

/**
 * Schema for facility collision pre-flight check
 */
export const checkFacilityConflictSchema = z.object({
  facilityId: z.string().uuid("Invalid facility ID"),
  startAt: z.string().min(1, "Start time is required"),
  endAt: z.string().min(1, "End time is required"),
  excludeEventId: z.string().uuid().optional().nullable(),
});

export type CheckFacilityConflictInput = z.infer<typeof checkFacilityConflictSchema>;
