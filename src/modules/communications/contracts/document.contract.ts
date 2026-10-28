import { z } from "zod";
import { DocumentCategory, Role } from "@prisma/client";

export const DocumentCategoryEnum = z.nativeEnum(DocumentCategory);
export const TargetRoleEnum = z.nativeEnum(Role);

export const createClubDocumentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120),
  slug: z.string().min(3).max(140).optional(),
  category: DocumentCategoryEnum,
  version: z.string().min(1, "Version is required").default("2026.1"),
  fileUrl: z.string().url("Must be a valid URL").optional().nullable(),
  contentMarkdown: z.string().min(10, "Document content is required (min 10 characters)"),
  requiresSignOff: z.boolean().default(false),
  targetRole: TargetRoleEnum.optional().nullable(),
  isActive: z.boolean().default(true),
});

export type CreateClubDocumentInput = z.infer<typeof createClubDocumentSchema>;

export const updateClubDocumentSchema = z.object({
  documentId: z.string().uuid("Invalid document ID"),
  title: z.string().min(3).max(120).optional(),
  version: z.string().min(1).optional(),
  fileUrl: z.string().url().optional().nullable(),
  contentMarkdown: z.string().min(10).optional(),
  requiresSignOff: z.boolean().optional(),
  targetRole: TargetRoleEnum.optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateClubDocumentInput = z.infer<typeof updateClubDocumentSchema>;

export const signOffDocumentSchema = z.object({
  documentId: z.string().uuid("Invalid document ID"),
  versionSigned: z.string().min(1, "Version signed is required"),
  targetProfileId: z.string().uuid().optional(),
});

export type SignOffDocumentInput = z.infer<typeof signOffDocumentSchema>;

export const sendPolicyReminderSchema = z.object({
  documentId: z.string().uuid("Invalid document ID"),
});

export type SendPolicyReminderInput = z.infer<typeof sendPolicyReminderSchema>;
