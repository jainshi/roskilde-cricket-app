# Interface & Server Action Contracts: Module 5 - Communications & Volunteer Duty Roster

**Feature Branch**: `005-communications-volunteers`  
**Date**: 2026-10-27  
**Module**: Module 5 (`src/modules/communications/` & `src/modules/volunteers/`)

---

## 1. Zod Schemas & TypeScript Contracts

```typescript
import { z } from "zod";

// ==========================================
// 1. Announcements & Weather Alerts
// ==========================================

export const AnnouncementCategoryEnum = z.enum([
  "GENERAL",
  "SQUAD_UPDATE",
  "WEATHER_ALERT",
  "AGM",
  "SOCIAL_EVENT",
]);

export const AnnouncementPriorityEnum = z.enum([
  "NORMAL",
  "PINNED",
  "URGENT_WEATHER_ALERT",
  "AGM_NOTICE",
]);

export const AnnouncementAudienceEnum = z.enum([
  "ALL_MEMBERS",
  "SQUAD_SPECIFIC",
  "ROLE_SPECIFIC",
]);

export const createAnnouncementSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120),
  content: z.string().min(5, "Content must be at least 5 characters"),
  category: AnnouncementCategoryEnum.default("GENERAL"),
  priority: AnnouncementPriorityEnum.default("NORMAL"),
  audience: AnnouncementAudienceEnum.default("ALL_MEMBERS"),
  targetSquadId: z.string().uuid().optional().nullable(),
  targetRole: z.string().optional().nullable(),
  linkedEventId: z.string().uuid().optional().nullable(),
  isPinned: z.boolean().default(false),
  expiresAt: z.coerce.date().optional().nullable(),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const publishWeatherCancellationSchema = z.object({
  linkedEventId: z.string().uuid("A valid scheduled event must be selected"),
  title: z.string().min(3).default("Match / Practice Cancelled - Pitch Unplayable"),
  content: z.string().min(5, "Please provide reason for weather cancellation"),
  notifyParents: z.boolean().default(true),
});

export type PublishWeatherCancellationInput = z.infer<typeof publishWeatherCancellationSchema>;

export const markAnnouncementReadSchema = z.object({
  announcementId: z.string().uuid(),
});

export type MarkAnnouncementReadInput = z.infer<typeof markAnnouncementReadSchema>;

// ==========================================
// 2. Volunteer Duty Roster & Swaps
// ==========================================

export const VolunteerDutyTypeEnum = z.enum([
  "SCORING",
  "UMPIRING",
  "PITCH_PREPARATION",
  "TEA_CATERING",
  "YOUTH_CARPOOL",
  "GENERAL_VOLUNTEER",
]);

export const createVolunteerDutySlotSchema = z.object({
  eventId: z.string().uuid("Event ID is required"),
  dutyType: VolunteerDutyTypeEnum,
  title: z.string().min(3).max(80),
  description: z.string().max(300).optional(),
  carpoolSeats: z.number().int().min(1).max(10).optional().nullable(),
  assignedProfileId: z.string().uuid().optional().nullable(),
});

export type CreateVolunteerDutySlotInput = z.infer<typeof createVolunteerDutySlotSchema>;

export const assignVolunteerDutySlotSchema = z.object({
  slotId: z.string().uuid(),
  memberProfileId: z.string().uuid("Target volunteer member is required"),
  notes: z.string().optional(),
});

export type AssignVolunteerDutySlotInput = z.infer<typeof assignVolunteerDutySlotSchema>;

export const claimVolunteerDutySlotSchema = z.object({
  slotId: z.string().uuid(),
  carpoolSeatsOffered: z.number().int().min(1).max(9).optional(),
  notes: z.string().optional(),
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

// ==========================================
// 3. Club Documents & Policy Sign-Offs
// ==========================================

export const DocumentCategoryEnum = z.enum([
  "BYLAWS",
  "CHILD_SAFETY",
  "CODE_OF_CONDUCT",
  "GENERAL_POLICY",
]);

export const createClubDocumentSchema = z.object({
  title: z.string().min(3).max(120),
  category: DocumentCategoryEnum,
  version: z.string().min(1).default("2026.1"),
  fileUrl: z.string().url().optional().nullable(),
  contentMarkdown: z.string().min(10, "Document body content is required"),
  requiresSignOff: z.boolean().default(false),
  targetRole: z.string().optional().nullable(),
});

export type CreateClubDocumentInput = z.infer<typeof createClubDocumentSchema>;

export const signOffDocumentSchema = z.object({
  documentId: z.string().uuid(),
  versionSigned: z.string().min(1),
});

export type SignOffDocumentInput = z.infer<typeof signOffDocumentSchema>;
```

---

## 2. Server Action Signatures

### Announcements & Notices (`src/modules/communications/actions/announcement.actions.ts`)
- `createAnnouncementAction(input: CreateAnnouncementInput): Promise<ActionResult<ClubAnnouncement>>`
- `publishWeatherCancellationAction(input: PublishWeatherCancellationInput): Promise<ActionResult<{ announcement: ClubAnnouncement; eventCancelled: boolean }>>`
- `markAnnouncementReadAction(input: MarkAnnouncementReadInput): Promise<ActionResult<{ readAt: Date }>>`
- `deleteAnnouncementAction(announcementId: string): Promise<ActionResult<{ success: boolean }>>`

### Volunteer Duty Slots (`src/modules/volunteers/actions/volunteer.actions.ts`)
- `createVolunteerDutySlotAction(input: CreateVolunteerDutySlotInput): Promise<ActionResult<VolunteerDutySlot>>`
- `assignVolunteerDutySlotAction(input: AssignVolunteerDutySlotInput): Promise<ActionResult<VolunteerDutySlot>>`
- `claimVolunteerDutySlotAction(input: ClaimVolunteerDutySlotInput): Promise<ActionResult<VolunteerDutySlot>>`
- `requestVolunteerSwapAction(input: RequestVolunteerSwapInput): Promise<ActionResult<VolunteerDutySlot>>`
- `acceptVolunteerSwapAction(input: AcceptVolunteerSwapInput): Promise<ActionResult<VolunteerDutySlot>>`
- `unassignVolunteerDutySlotAction(slotId: string): Promise<ActionResult<VolunteerDutySlot>>`

### Documents & Sign-Offs (`src/modules/communications/actions/document.actions.ts`)
- `createClubDocumentAction(input: CreateClubDocumentInput): Promise<ActionResult<ClubDocument>>`
- `signOffDocumentAction(input: SignOffDocumentInput): Promise<ActionResult<DocumentSignOff>>`
- `sendPolicyReminderAction(documentId: string): Promise<ActionResult<{ remindersSent: number }>>`
