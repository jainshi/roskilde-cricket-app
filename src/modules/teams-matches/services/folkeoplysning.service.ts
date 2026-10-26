import { prisma } from "@/lib/db";
import {
  ExportFolkeoplysningFilter,
  exportFolkeoplysningFilterSchema,
} from "../contracts/attendance.contract";
import {
  FolkeoplysningAttendanceRow,
  generateFolkeoplysningCsv,
  calculateAgeAtDate,
  resolveAgeBracket,
} from "../domain/folkeoplysning-export";

export interface FolkeoplysningSummaryStats {
  totalAttendanceRecords: number;
  attendingSessions: number; // PRESENT + LATE
  uniqueParticipants: number;
  under18Sessions: number;
  youngAdultSessions: number; // 18-24
  adultSessions: number; // 25+
  unknownAgeSessions: number;
}

export interface FolkeoplysningReportData {
  summary: FolkeoplysningSummaryStats;
  rows: FolkeoplysningAttendanceRow[];
  csv: string;
}

/**
 * Builds and streams the Danish Folkeoplysning municipal attendance report
 * for Roskilde Kommune subsidies. Covers all attending club members.
 */
export async function getFolkeoplysningReport(
  filter: ExportFolkeoplysningFilter
): Promise<FolkeoplysningReportData> {
  const validated = exportFolkeoplysningFilterSchema.parse(filter);

  const whereClause: any = {};

  if (validated.startDate || validated.endDate) {
    whereClause.scheduledEvent = {
      ...(whereClause.scheduledEvent || {}),
      date: {
        ...(validated.startDate ? { gte: new Date(validated.startDate) } : {}),
        ...(validated.endDate ? { lte: new Date(validated.endDate) } : {}),
      },
    };
  }

  if (validated.squadId) {
    whereClause.scheduledEvent = {
      ...(whereClause.scheduledEvent || {}),
      teamSquadId: validated.squadId,
    };
  }

  if (validated.facilityId) {
    whereClause.scheduledEvent = {
      ...(whereClause.scheduledEvent || {}),
      facilityId: validated.facilityId,
    };
  }

  const attendances = await prisma.eventAttendance.findMany({
    where: whereClause,
    include: {
      scheduledEvent: {
        include: {
          teamSquad: { select: { id: true, name: true } },
          facility: { select: { id: true, name: true } },
        },
      },
      memberProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          isAnonymized: true,
        },
      },
      recordedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: [
      { scheduledEvent: { date: "desc" } },
      { scheduledEvent: { teamSquad: { name: "asc" } } },
    ],
  });

  const uniqueParticipantIds = new Set<string>();
  let under18Count = 0;
  let youngAdultCount = 0;
  let adultCount = 0;
  let unknownAgeCount = 0;
  let attendingCount = 0;

  const rows: FolkeoplysningAttendanceRow[] = [];

  for (const att of attendances) {
    const isAttending = att.status === "PRESENT" || att.status === "LATE";
    if (isAttending) {
      attendingCount++;
      uniqueParticipantIds.add(att.memberProfileId);

      const age = calculateAgeAtDate(
        att.memberProfile.dateOfBirth,
        att.scheduledEvent.date
      );
      const bracket = resolveAgeBracket(age);

      if (bracket === "UNDER_18") under18Count++;
      else if (bracket === "18_TO_24") youngAdultCount++;
      else if (bracket === "25_AND_OVER") adultCount++;
      else unknownAgeCount++;
    }

    const memberDisplayName = att.memberProfile.isAnonymized
      ? "Former Member (Anonymized)"
      : `${att.memberProfile.firstName} ${att.memberProfile.lastName}`.trim();

    rows.push({
      sessionDate: att.scheduledEvent.date,
      sessionType: att.scheduledEvent.eventType,
      squadName: att.scheduledEvent.teamSquad.name,
      facilityName: att.scheduledEvent.facility
        ? att.scheduledEvent.facility.name
        : "External / Away Ground",
      memberId: att.memberProfile.id,
      memberName: memberDisplayName,
      dateOfBirth: att.memberProfile.dateOfBirth,
      attendanceStatus: att.status as any,
      arrivalTime: att.arrivalTime,
      recordedByName: `${att.recordedBy.firstName} ${att.recordedBy.lastName}`.trim(),
    });
  }

  const summary: FolkeoplysningSummaryStats = {
    totalAttendanceRecords: attendances.length,
    attendingSessions: attendingCount,
    uniqueParticipants: uniqueParticipantIds.size,
    under18Sessions: under18Count,
    youngAdultSessions: youngAdultCount,
    adultSessions: adultCount,
    unknownAgeSessions: unknownAgeCount,
  };

  const csv = generateFolkeoplysningCsv(rows);

  return {
    summary,
    rows,
    csv,
  };
}
