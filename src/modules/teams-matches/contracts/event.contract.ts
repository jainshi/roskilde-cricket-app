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
    teamSquadId: z.string().min(1, "Invalid squad ID"),
    facilityId: z.string().min(1, "Invalid facility ID").optional().nullable(),
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
    linkedEquipmentLoanId: z.string().min(1, "Invalid loan ID").optional().nullable(),
    collisionOverrideReason: z
      .string()
      .trim()
      .min(5, "Override reason must be at least 5 characters")
      .max(300)
      .optional()
      .nullable(),
    participantFilter: z
      .enum(["ALL_SQUAD", "BATSMEN", "BOWLERS", "WICKETKEEPERS", "CUSTOM"])
      .default("ALL_SQUAD")
      .optional(),
    invitedMemberIds: z.array(z.string().min(1)).optional(),
    notifyParticipants: z.boolean().default(true).optional(),
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
    id: z.string().min(1, "Invalid event ID"),
    facilityId: z.string().min(1, "Invalid facility ID").optional().nullable(),
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
    linkedEquipmentLoanId: z.string().min(1).optional().nullable(),
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
  id: z.string().min(1, "Invalid event ID"),
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
  id: z.string().min(1, "Invalid facility ID"),
});

export type UpdateFacilityInput = z.infer<typeof updateFacilitySchema>;

/**
 * Schema for facility collision pre-flight check
 */
export const checkFacilityConflictSchema = z.object({
  facilityId: z.string().min(1, "Invalid facility ID"),
  startAt: z.string().min(1, "Start time is required"),
  endAt: z.string().min(1, "End time is required"),
  excludeEventId: z.string().min(1).optional().nullable(),
});

export type CheckFacilityConflictInput = z.infer<typeof checkFacilityConflictSchema>;

/**
 * Schema for recurring training schedules (e.g. every Sunday 08:00-10:00 for U13 & U15)
 */
export const createRecurringTrainingScheduleSchema = z
  .object({
    teamSquadIds: z
      .array(z.string().min(1, "Invalid squad ID"))
      .min(1, "Select at least one squad"),
    facilityId: z.string().min(1, "Invalid facility ID").optional().nullable(),
    trainingType: trainingTypeEnum.default("INDOOR_WINTER"),
    titlePrefix: z.string().trim().max(100).optional().nullable(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    daysOfWeek: z
      .array(z.coerce.number().int().min(0).max(6))
      .min(1, "Select at least one day of the week"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
    meetTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)")
      .optional()
      .nullable(),
    rsvpHoursBefore: z.coerce.number().int().min(1).max(168).default(24),
    collisionOverrideReason: z
      .string()
      .trim()
      .min(5, "Override reason must be at least 5 characters")
      .max(300)
      .optional()
      .nullable(),
    skipConflictingDates: z.boolean().default(false),
  })
  .refine(
    (data) => {
      const [sh, sm] = data.startTime.split(":").map(Number);
      const [eh, em] = data.endTime.split(":").map(Number);
      return sh * 60 + sm < eh * 60 + em;
    },
    {
      message: "End time must be later than start time",
      path: ["endTime"],
    }
  )
  .refine(
    (data) => {
      return (
        new Date(data.startDate).getTime() <= new Date(data.endDate).getTime()
      );
    },
    {
      message: "End date must be after or equal to start date",
      path: ["endDate"],
    }
  );

export type CreateRecurringTrainingScheduleInput = z.infer<
  typeof createRecurringTrainingScheduleSchema
>;

/**
 * Schema for inviting additional participants to an existing event
 */
export const inviteEventParticipantsSchema = z.object({
  scheduledEventId: z.string().min(1, "Invalid event ID"),
  memberProfileIds: z
    .array(z.string().min(1))
    .min(1, "At least one participant must be selected"),
  notifyParticipants: z.boolean().default(true).optional(),
});

export type InviteEventParticipantsInput = z.infer<
  typeof inviteEventParticipantsSchema
>;
