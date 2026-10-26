import { prisma } from "@/lib/db";
import { AttendanceStatus, LineupSlot, MatchTacticalRole } from "@prisma/client";
import {
  RecordPitchSideAttendanceInput,
  recordPitchSideAttendanceSchema,
  LockAttendanceSessionInput,
  lockAttendanceSessionSchema,
} from "../contracts/attendance.contract";

export interface AttendanceCandidate {
  memberProfileId: string;
  name: string;
  jerseyNumber: number | null;
  battingPosition: string | null;
  bowlingStyle: string | null;
  dateOfBirth: Date | null;
  isMinor: boolean;
  isGuest: boolean;
  selectionRole?: LineupSlot | null;
  tacticalRole?: MatchTacticalRole | null;
  battingOrderPosition?: number | null;
  rsvpStatus: "AVAILABLE" | "UNAVAILABLE" | "MAYBE" | "NO_RESPONSE";
  transportNote?: string | null;
  attendanceStatus: AttendanceStatus;
  arrivalTime?: string | null;
  notes?: string | null;
  isLocked: boolean;
  lockedAt?: Date | null;
  recordedBy?: { id: string; name: string } | null;
}

export interface AttendanceSessionData {
  event: {
    id: string;
    title: string;
    eventType: string;
    date: Date;
    startAt: Date;
    endAt: Date;
    lifecycleStatus: string;
    squadName: string;
    squadId: string;
    facilityName: string;
  };
  isLocked: boolean;
  lockedAt: Date | null;
  lockedBy: { id: string; name: string } | null;
  candidates: AttendanceCandidate[];
}

/**
 * Retrieves the full pitch-side attendance session for an event,
 * compiling all squad roster members, match selections, RSVP respondents, and guest call-ups.
 */
export async function getPitchSideAttendanceSession(
  eventId: string,
  _callerProfileId: string
): Promise<AttendanceSessionData> {
  const event = await prisma.scheduledEvent.findUnique({
    where: { id: eventId },
    include: {
      teamSquad: {
        include: {
          roster: {
            include: {
              memberProfile: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  battingPosition: true,
                  bowlingStyle: true,
                  dateOfBirth: true,
                  isAnonymized: true,
                },
              },
            },
          },
        },
      },
      facility: {
        select: { id: true, name: true },
      },
      matchSelection: {
        include: {
          selectedPlayers: {
            include: {
              memberProfile: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  battingPosition: true,
                  bowlingStyle: true,
                  dateOfBirth: true,
                  isAnonymized: true,
                },
              },
            },
          },
        },
      },
      rsvps: {
        include: {
          memberProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              battingPosition: true,
              bowlingStyle: true,
              dateOfBirth: true,
              isAnonymized: true,
            },
          },
        },
      },
      attendances: {
        include: {
          memberProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              battingPosition: true,
              bowlingStyle: true,
              dateOfBirth: true,
              isAnonymized: true,
            },
          },
          recordedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!event) {
    throw new Error("Event not found.");
  }

  const squadMemberIds = new Set(event.teamSquad.roster.map((r) => r.memberProfileId));

  // Determine if session is locked
  const lockedRecord = event.attendances.find((a) => a.isLocked);
  const isLocked = Boolean(lockedRecord);
  const lockedAt = lockedRecord?.lockedAt || null;
  const lockedBy = lockedRecord?.recordedBy
    ? {
        id: lockedRecord.recordedBy.id,
        name: `${lockedRecord.recordedBy.firstName} ${lockedRecord.recordedBy.lastName}`.trim(),
      }
    : null;

  // Build candidate map
  const candidateMap = new Map<string, AttendanceCandidate>();

  // 1. Add squad roster members
  for (const roster of event.teamSquad.roster) {
    const profile = roster.memberProfile;
    if (profile.isAnonymized) continue;

    const isMinor = profile.dateOfBirth
      ? new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear() < 18
      : false;

    candidateMap.set(profile.id, {
      memberProfileId: profile.id,
      name: `${profile.firstName} ${profile.lastName}`.trim(),
      jerseyNumber: roster.jerseyNumber,
      battingPosition: profile.battingPosition,
      bowlingStyle: profile.bowlingStyle,
      dateOfBirth: profile.dateOfBirth,
      isMinor,
      isGuest: false,
      rsvpStatus: "NO_RESPONSE",
      attendanceStatus: AttendanceStatus.PRESENT,
      isLocked: false,
    });
  }

  // 2. Overlay RSVP records (covers cross-squad guest call-ups as well!)
  for (const rsvp of event.rsvps) {
    const profile = rsvp.memberProfile;
    if (profile.isAnonymized) continue;

    let candidate = candidateMap.get(profile.id);
    if (!candidate) {
      const isMinor = profile.dateOfBirth
        ? new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear() < 18
        : false;

      candidate = {
        memberProfileId: profile.id,
        name: `${profile.firstName} ${profile.lastName}`.trim(),
        jerseyNumber: null,
        battingPosition: profile.battingPosition,
        bowlingStyle: profile.bowlingStyle,
        dateOfBirth: profile.dateOfBirth,
        isMinor,
        isGuest: !squadMemberIds.has(profile.id),
        rsvpStatus: rsvp.status as any,
        transportNote: rsvp.transportNote,
        attendanceStatus:
          rsvp.status === "UNAVAILABLE"
            ? AttendanceStatus.ABSENT_EXCUSED
            : AttendanceStatus.PRESENT,
        isLocked: false,
      };
      candidateMap.set(profile.id, candidate);
    } else {
      candidate.rsvpStatus = rsvp.status as any;
      candidate.transportNote = rsvp.transportNote;
      if (rsvp.status === "UNAVAILABLE") {
        candidate.attendanceStatus = AttendanceStatus.ABSENT_EXCUSED;
      }
    }
  }

  // 3. Overlay MatchSelection lineup roles
  if (event.matchSelection) {
    for (const selPlayer of event.matchSelection.selectedPlayers) {
      const profile = selPlayer.memberProfile;
      if (profile.isAnonymized) continue;

      let candidate = candidateMap.get(profile.id);
      if (!candidate) {
        const isMinor = profile.dateOfBirth
          ? new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear() < 18
          : false;

        candidate = {
          memberProfileId: profile.id,
          name: `${profile.firstName} ${profile.lastName}`.trim(),
          jerseyNumber: null,
          battingPosition: profile.battingPosition,
          bowlingStyle: profile.bowlingStyle,
          dateOfBirth: profile.dateOfBirth,
          isMinor,
          isGuest: !squadMemberIds.has(profile.id),
          rsvpStatus: "NO_RESPONSE",
          attendanceStatus: AttendanceStatus.PRESENT,
          isLocked: false,
        };
        candidateMap.set(profile.id, candidate);
      }

      candidate.selectionRole = selPlayer.selectionRole;
      candidate.tacticalRole = selPlayer.tacticalRole;
      candidate.battingOrderPosition = selPlayer.battingOrderPosition;

      // Starting players default to PRESENT
      if (selPlayer.selectionRole === "STARTING") {
        candidate.attendanceStatus = AttendanceStatus.PRESENT;
      }
    }
  }

  // 4. Overlay saved EventAttendance records
  for (const att of event.attendances) {
    const profile = att.memberProfile;
    if (profile.isAnonymized) continue;

    let candidate = candidateMap.get(profile.id);
    if (!candidate) {
      const isMinor = profile.dateOfBirth
        ? new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear() < 18
        : false;

      candidate = {
        memberProfileId: profile.id,
        name: `${profile.firstName} ${profile.lastName}`.trim(),
        jerseyNumber: null,
        battingPosition: profile.battingPosition,
        bowlingStyle: profile.bowlingStyle,
        dateOfBirth: profile.dateOfBirth,
        isMinor,
        isGuest: !squadMemberIds.has(profile.id),
        rsvpStatus: "NO_RESPONSE",
        attendanceStatus: att.status,
        arrivalTime: att.arrivalTime ? att.arrivalTime.toISOString().substring(11, 16) : null,
        notes: att.notes,
        isLocked: att.isLocked,
        lockedAt: att.lockedAt,
        recordedBy: att.recordedBy
          ? {
              id: att.recordedBy.id,
              name: `${att.recordedBy.firstName} ${att.recordedBy.lastName}`.trim(),
            }
          : null,
      };
      candidateMap.set(profile.id, candidate);
    } else {
      candidate.attendanceStatus = att.status;
      candidate.arrivalTime = att.arrivalTime
        ? att.arrivalTime.toISOString().substring(11, 16)
        : null;
      candidate.notes = att.notes;
      candidate.isLocked = att.isLocked;
      candidate.lockedAt = att.lockedAt;
      candidate.recordedBy = att.recordedBy
        ? {
            id: att.recordedBy.id,
            name: `${att.recordedBy.firstName} ${att.recordedBy.lastName}`.trim(),
          }
        : null;
    }
  }

  // Sort candidates:
  // 1. Match Selection: STARTING first (by batting order if set)
  // 2. Match Selection: SUBSTITUTE
  // 3. RSVP: AVAILABLE
  // 4. Others alphabetically by name
  const candidates = Array.from(candidateMap.values()).sort((a, b) => {
    const roleRank = (c: AttendanceCandidate) => {
      if (c.selectionRole === "STARTING") return 1;
      if (c.selectionRole === "SUBSTITUTE") return 2;
      if (c.rsvpStatus === "AVAILABLE") return 3;
      if (c.selectionRole === "RESERVE") return 4;
      return 5;
    };

    const rankA = roleRank(a);
    const rankB = roleRank(b);

    if (rankA !== rankB) return rankA - rankB;

    if (a.selectionRole === "STARTING" && b.selectionRole === "STARTING") {
      const orderA = a.battingOrderPosition ?? 999;
      const orderB = b.battingOrderPosition ?? 999;
      if (orderA !== orderB) return orderA - orderB;
    }

    return a.name.localeCompare(b.name);
  });

  return {
    event: {
      id: event.id,
      title: event.title,
      eventType: event.eventType,
      date: event.date,
      startAt: event.startAt,
      endAt: event.endAt,
      lifecycleStatus: event.lifecycleStatus,
      squadName: event.teamSquad.name,
      squadId: event.teamSquad.id,
      facilityName: event.facility ? event.facility.name : "Away / External Venue",
    },
    isLocked,
    lockedAt,
    lockedBy,
    candidates,
  };
}

/**
 * Records pitch-side attendance checklist in bulk.
 * Enforces immutable lock: rejected if already locked.
 */
export async function recordPitchSideAttendance(
  input: RecordPitchSideAttendanceInput,
  callerProfileId: string
) {
  const validated = recordPitchSideAttendanceSchema.parse(input);

  const event = await prisma.scheduledEvent.findUnique({
    where: { id: validated.scheduledEventId },
    include: {
      attendances: {
        select: { isLocked: true },
      },
    },
  });

  if (!event) {
    throw new Error("Event not found.");
  }

  if (event.attendances.some((a) => a.isLocked)) {
    throw new Error("Attendance for this event is locked and cannot be modified.");
  }

  return await prisma.$transaction(async (tx) => {
    for (const record of validated.records) {
      let arrivalDateTime: Date | null = null;
      if (record.arrivalTime && record.arrivalTime.trim()) {
        const timeStr = record.arrivalTime.trim();
        if (timeStr.includes("T")) {
          arrivalDateTime = new Date(timeStr);
        } else if (timeStr.includes(":")) {
          const [hh, mm] = timeStr.split(":").map(Number);
          arrivalDateTime = new Date(event.date);
          arrivalDateTime.setHours(hh || 0, mm || 0, 0, 0);
        }
      }

      await tx.eventAttendance.upsert({
        where: {
          scheduledEventId_memberProfileId: {
            scheduledEventId: validated.scheduledEventId,
            memberProfileId: record.memberProfileId,
          },
        },
        create: {
          scheduledEventId: validated.scheduledEventId,
          memberProfileId: record.memberProfileId,
          status: record.status as AttendanceStatus,
          arrivalTime: arrivalDateTime,
          notes: record.notes?.trim() || null,
          recordedById: callerProfileId,
          isLocked: false,
        },
        update: {
          status: record.status as AttendanceStatus,
          arrivalTime: arrivalDateTime,
          notes: record.notes?.trim() || null,
          recordedById: callerProfileId,
          recordedAt: new Date(),
        },
      });
    }

    // Auto-advance lifecycleStatus to PLAYED if currently SCHEDULED
    if (event.lifecycleStatus === "SCHEDULED") {
      await tx.scheduledEvent.update({
        where: { id: validated.scheduledEventId },
        data: { lifecycleStatus: "PLAYED" },
      });
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        actorProfileId: callerProfileId,
        action: "EVENT_ATTENDANCE_RECORDED",
        metadata: {
          scheduledEventId: validated.scheduledEventId,
          recordsCount: validated.records.length,
        },
      },
    });

    return { success: true, count: validated.records.length };
  });
}

/**
 * Locks the attendance session immutably for official municipal auditing.
 */
export async function lockAttendanceSession(
  input: LockAttendanceSessionInput,
  callerProfileId: string
) {
  const validated = lockAttendanceSessionSchema.parse(input);

  const event = await prisma.scheduledEvent.findUnique({
    where: { id: validated.scheduledEventId },
    include: { attendances: true },
  });

  if (!event) {
    throw new Error("Event not found.");
  }

  if (event.attendances.length === 0) {
    throw new Error("Cannot lock attendance: no attendance records have been recorded yet.");
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.eventAttendance.updateMany({
      where: { scheduledEventId: validated.scheduledEventId },
      data: {
        isLocked: true,
        lockedAt: now,
      },
    });

    await tx.auditLog.create({
      data: {
        actorProfileId: callerProfileId,
        action: "EVENT_ATTENDANCE_LOCKED",
        metadata: {
          scheduledEventId: validated.scheduledEventId,
          lockedCount: updated.count,
          lockedAt: now.toISOString(),
        },
      },
    });

    return updated;
  });

  return { success: true, count: result.count, lockedAt: now };
}
