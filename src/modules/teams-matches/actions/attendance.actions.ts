"use server";

import { revalidatePath } from "next/cache";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import {
  RecordPitchSideAttendanceInput,
  LockAttendanceSessionInput,
  ExportFolkeoplysningFilter,
} from "../contracts/attendance.contract";
import {
  recordPitchSideAttendance,
  lockAttendanceSession,
} from "../services/attendance.service";
import {
  getFolkeoplysningReport,
  FolkeoplysningReportData,
} from "../services/folkeoplysning.service";

export interface AttendanceActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action: Records pitch-side attendance checklist in bulk.
 */
export async function recordPitchSideAttendanceAction(
  input: RecordPitchSideAttendanceInput
): Promise<AttendanceActionResult<{ count: number }>> {
  try {
    const session = await requireActivatedSession();
    const result = await recordPitchSideAttendance(input, session.memberProfileId);

    revalidatePath(`/events/${input.scheduledEventId}`);
    revalidatePath(`/events/${input.scheduledEventId}/attendance`);
    revalidatePath("/events");
    revalidatePath("/admin/reports/attendance");

    return {
      success: true,
      data: { count: result.count },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to record pitch-side attendance.",
    };
  }
}

/**
 * Server Action: Locks the attendance session immutably for official municipal auditing.
 */
export async function lockAttendanceSessionAction(
  input: LockAttendanceSessionInput
): Promise<AttendanceActionResult<{ count: number; lockedAt: Date }>> {
  try {
    const session = await requireActivatedSession();
    const result = await lockAttendanceSession(input, session.memberProfileId);

    revalidatePath(`/events/${input.scheduledEventId}`);
    revalidatePath(`/events/${input.scheduledEventId}/attendance`);
    revalidatePath("/events");
    revalidatePath("/admin/reports/attendance");

    return {
      success: true,
      data: { count: result.count, lockedAt: result.lockedAt },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to lock attendance session.",
    };
  }
}

/**
 * Server Action: Generates and returns Danish Folkeoplysning municipal CSV and summary.
 */
export async function exportFolkeoplysningCsvAction(
  filter: ExportFolkeoplysningFilter
): Promise<AttendanceActionResult<FolkeoplysningReportData>> {
  try {
    const session = await requireActivatedSession();
    const isStaff = session.roles.some((r) =>
      ["ADMIN", "COACH", "AD_HOC_COACH"].includes(r)
    );

    if (!isStaff) {
      return {
        success: false,
        error: "Only club administrators and coaches can access Folkeoplysning municipal reports.",
      };
    }

    const data = await getFolkeoplysningReport(filter);

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to generate Folkeoplysning report.",
    };
  }
}
