import { z } from "zod";

export const createSquadSchema = z.object({
  name: z.string().trim().min(2, "Squad name must be at least 2 characters").max(100),
  category: z.enum(["SENIOR", "YOUTH", "SOCIAL"]),
  ageGroupRule: z.string().trim().max(20).default("OPEN"),
  defaultLineupSize: z.coerce.number().int().min(6, "Minimum lineup size is 6").max(15, "Maximum lineup size is 15").default(11),
  genderGroup: z.enum(["MENS", "WOMENS", "MIXED"]).default("MIXED"),
  description: z.string().trim().max(500).optional().nullable(),
});

export const updateSquadSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(100).optional(),
  category: z.enum(["SENIOR", "YOUTH", "SOCIAL"]).optional(),
  ageGroupRule: z.string().trim().max(20).optional(),
  defaultLineupSize: z.coerce.number().int().min(6).max(15).optional(),
  genderGroup: z.enum(["MENS", "WOMENS", "MIXED"]).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const assignRosterMemberSchema = z.object({
  teamSquadId: z.string().min(1),
  memberProfileId: z.string().min(1),
  rosterRole: z.enum(["PLAYER", "CAPTAIN", "VICE_CAPTAIN"]).default("PLAYER"),
  jerseyNumber: z.coerce.number().int().min(1).max(99).optional().nullable(),
  hasDispensation: z.boolean().default(false),
  dispensationNotes: z.string().trim().max(500).optional().nullable(),
});

export const removeRosterMemberSchema = z.object({
  teamSquadId: z.string().min(1),
  memberProfileId: z.string().min(1),
});

export const assignSquadCoachSchema = z.object({
  teamSquadId: z.string().min(1),
  coachProfileId: z.string().min(1),
  role: z.enum(["HEAD_COACH", "ASSISTANT_COACH", "AD_HOC_COACH"]).default("HEAD_COACH"),
});

export const removeSquadCoachSchema = z.object({
  teamSquadId: z.string().min(1),
  coachProfileId: z.string().min(1),
});

export type CreateSquadInput = z.infer<typeof createSquadSchema>;
export type UpdateSquadInput = z.infer<typeof updateSquadSchema>;
export type AssignRosterMemberInput = z.infer<typeof assignRosterMemberSchema>;
export type AssignSquadCoachInput = z.infer<typeof assignSquadCoachSchema>;
