import { z } from "zod";

export const attendanceStatusEnum = z.enum([
  "PRESENT",
  "LATE",
  "ABSENT_EXCUSED",
  "NO_SHOW",
]);

export type AttendanceStatusType = z.infer<typeof attendanceStatusEnum>;

export const attendanceRecordItemSchema = z.object({
  memberProfileId: z.string().min(1, "Member Profile ID is required"),
  status: attendanceStatusEnum.default("PRESENT"),
  arrivalTime: z.string().optional().nullable(),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional().nullable(),
});

export type AttendanceRecordItemInput = z.infer<typeof attendanceRecordItemSchema>;

export const recordPitchSideAttendanceSchema = z.object({
  scheduledEventId: z.string().min(1, "Scheduled Event ID is required"),
  records: z.array(attendanceRecordItemSchema).min(1, "At least one attendance record must be provided"),
});

export type RecordPitchSideAttendanceInput = z.infer<typeof recordPitchSideAttendanceSchema>;

export const lockAttendanceSessionSchema = z.object({
  scheduledEventId: z.string().min(1, "Scheduled Event ID is required"),
});

export type LockAttendanceSessionInput = z.infer<typeof lockAttendanceSessionSchema>;

export const exportFolkeoplysningFilterSchema = z.object({
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  squadId: z.string().optional().nullable(),
  facilityId: z.string().optional().nullable(),
});

export type ExportFolkeoplysningFilter = z.infer<typeof exportFolkeoplysningFilterSchema>;
