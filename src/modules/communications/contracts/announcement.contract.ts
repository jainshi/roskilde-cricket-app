import { z } from "zod";
import { AnnouncementCategory, AnnouncementPriority, AnnouncementAudience, Role } from "@prisma/client";

export const AnnouncementCategoryEnum = z.nativeEnum(AnnouncementCategory);
export const AnnouncementPriorityEnum = z.nativeEnum(AnnouncementPriority);
export const AnnouncementAudienceEnum = z.nativeEnum(AnnouncementAudience);

export const createAnnouncementSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120),
  content: z.string().min(5, "Content must be at least 5 characters"),
  category: AnnouncementCategoryEnum.default(AnnouncementCategory.GENERAL),
  priority: AnnouncementPriorityEnum.default(AnnouncementPriority.NORMAL),
  audience: AnnouncementAudienceEnum.default(AnnouncementAudience.ALL_MEMBERS),
  targetSquadId: z.string().uuid().optional().nullable(),
  targetRole: z.nativeEnum(Role).optional().nullable(),
  linkedEventId: z.string().uuid().optional().nullable(),
  isPinned: z.boolean().default(false),
  expiresAt: z.coerce.date().optional().nullable(),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const publishWeatherCancellationSchema = z.object({
  linkedEventId: z.string().uuid("A valid scheduled event must be selected"),
  title: z.string().min(3).default("Match / Practice Cancelled - Weather / Pitch Unplayable"),
  content: z.string().min(5, "Please provide reason for weather cancellation"),
  notifyParents: z.boolean().default(true),
});

export type PublishWeatherCancellationInput = z.infer<typeof publishWeatherCancellationSchema>;

export const markAnnouncementReadSchema = z.object({
  announcementId: z.string().uuid(),
});

export type MarkAnnouncementReadInput = z.infer<typeof markAnnouncementReadSchema>;
