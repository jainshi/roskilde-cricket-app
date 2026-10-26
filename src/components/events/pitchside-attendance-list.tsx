"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  recordPitchSideAttendanceAction,
  lockAttendanceSessionAction,
} from "@/modules/teams-matches/actions/attendance.actions";
import {
  AttendanceSessionData,
  AttendanceCandidate,
} from "@/modules/teams-matches/services/attendance.service";

interface PitchsideAttendanceListProps {
  initialData: AttendanceSessionData;
}

type AttendanceStatusOption = "PRESENT" | "LATE" | "ABSENT_EXCUSED" | "NO_SHOW";

export function PitchsideAttendanceList({ initialData }: PitchsideAttendanceListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [candidates, setCandidates] = useState<AttendanceCandidate[]>(
    initialData.candidates
  );
  const [isLocked, setIsLocked] = useState(initialData.isLocked);
  const [lockedAt, setLockedAt] = useState<Date | null>(initialData.lockedAt);
  const [lockedBy, setLockedBy] = useState(initialData.lockedBy);

  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);

  // Stats calculation
  const presentCount = candidates.filter((c) => c.attendanceStatus === "PRESENT").length;
  const lateCount = candidates.filter((c) => c.attendanceStatus === "LATE").length;
  const excusedCount = candidates.filter((c) => c.attendanceStatus === "ABSENT_EXCUSED").length;
  const noShowCount = candidates.filter((c) => c.attendanceStatus === "NO_SHOW").length;

  const handleStatusChange = (memberProfileId: string, status: AttendanceStatusOption) => {
    if (isLocked) return;
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.memberProfileId === memberProfileId) {
          return {
            ...c,
            attendanceStatus: status,
            // If switched to LATE and no arrival time, default to current HH:MM
            arrivalTime:
              status === "LATE" && !c.arrivalTime
                ? new Date().toTimeString().substring(0, 5)
                : c.arrivalTime,
          };
        }
        return c;
      })
    );
  };

  const handleArrivalTimeChange = (memberProfileId: string, timeStr: string) => {
    if (isLocked) return;
    setCandidates((prev) =>
      prev.map((c) =>
        c.memberProfileId === memberProfileId ? { ...c, arrivalTime: timeStr } : c
      )
    );
  };

  const handleNotesChange = (memberProfileId: string, notes: string) => {
    if (isLocked) return;
    setCandidates((prev) =>
      prev.map((c) =>
        c.memberProfileId === memberProfileId ? { ...c, notes } : c
      )
    );
  };

  const handleMarkAllSelectedAsPresent = () => {
    if (isLocked) return;
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.selectionRole === "STARTING" || c.rsvpStatus === "AVAILABLE") {
          return { ...c, attendanceStatus: "PRESENT" };
        }
        return c;
      })
    );
    setFeedback({
      type: "success",
      text: "Marked all selected & available players as PRESENT.",
    });
  };

  const handleSaveAttendance = () => {
    if (isLocked) return;
    setFeedback(null);

    startTransition(async () => {
      const records = candidates.map((c) => ({
        memberProfileId: c.memberProfileId,
        status: c.attendanceStatus,
        arrivalTime: c.arrivalTime || null,
        notes: c.notes || null,
      }));

      const res = await recordPitchSideAttendanceAction({
        scheduledEventId: initialData.event.id,
        records,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          text: `Attendance saved for ${res.data?.count} players!`,
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          text: res.error || "Failed to save attendance.",
        });
      }
    });
  };

  const handleConfirmLock = () => {
    setShowLockModal(false);
    setFeedback(null);

    startTransition(async () => {
      // 1. Save first to ensure latest state is persisted
      const records = candidates.map((c) => ({
        memberProfileId: c.memberProfileId,
        status: c.attendanceStatus,
        arrivalTime: c.arrivalTime || null,
        notes: c.notes || null,
      }));

      await recordPitchSideAttendanceAction({
        scheduledEventId: initialData.event.id,
        records,
      });

      // 2. Lock session
      const res = await lockAttendanceSessionAction({
        scheduledEventId: initialData.event.id,
      });

      if (res.success) {
        setIsLocked(true);
        setLockedAt(res.data?.lockedAt ? new Date(res.data.lockedAt) : new Date());
        setFeedback({
          type: "success",
          text: "Attendance session is now officially locked and sealed for municipal audit.",
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          text: res.error || "Failed to lock attendance session.",
        });
      }
    });
  };

  const filteredCandidates = candidates.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.jerseyNumber && String(c.jerseyNumber).includes(q))
    );
  });

  return (
    <div className="space-y-4 pb-28">
      {/* Event Overview Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {initialData.event.squadName}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {initialData.event.eventType.replace("_", " ")}
              </span>
              {isLocked ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                  🔒 Locked & Signed Off
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  ⚡ Pitch-Side Active (&lt;30s)
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {initialData.event.title}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              📍 {initialData.event.facilityName} • 🕒{" "}
              {new Date(initialData.event.startAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              -{" "}
              {new Date(initialData.event.endAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {isLocked && lockedAt && (
            <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <p className="font-semibold text-slate-700">Sealed Municipal Record</p>
              <p>
                Locked on {new Date(lockedAt).toLocaleString()}
                {lockedBy ? ` by ${lockedBy.name}` : ""}
              </p>
            </div>
          )}
        </div>

        {/* Real-Time Attendance Tally Counters */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-emerald-50 rounded-xl p-2.5 text-center border border-emerald-100">
            <span className="block text-xl font-bold text-emerald-700">{presentCount}</span>
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
              Present
            </span>
          </div>
          <div className="bg-amber-50 rounded-xl p-2.5 text-center border border-amber-100">
            <span className="block text-xl font-bold text-amber-700">{lateCount}</span>
            <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
              Late
            </span>
          </div>
          <div className="bg-blue-50 rounded-xl p-2.5 text-center border border-blue-100">
            <span className="block text-xl font-bold text-blue-700">{excusedCount}</span>
            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
              Excused
            </span>
          </div>
          <div className="bg-rose-50 rounded-xl p-2.5 text-center border border-rose-100">
            <span className="block text-xl font-bold text-rose-700">{noShowCount}</span>
            <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">
              No-Show
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-sm font-medium border flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quick Actions & Search */}
      {!isLocked && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleMarkAllSelectedAsPresent}
            disabled={isPending}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition active:scale-[0.98] flex items-center justify-center gap-2"
          >
            ✓ Mark All Selected/Available as Present
          </button>

          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              placeholder="Search player or #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[44px] pl-3 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pitch-Side Player List (<30s optimized) */}
      <div className="space-y-3">
        {filteredCandidates.map((candidate) => {
          const isSelected = candidate.selectionRole === "STARTING";
          const isSubstitute = candidate.selectionRole === "SUBSTITUTE";

          return (
            <div
              key={candidate.memberProfileId}
              className={`bg-white rounded-2xl p-3.5 sm:p-4 border transition-all ${
                candidate.attendanceStatus === "PRESENT"
                  ? "border-emerald-200 shadow-sm"
                  : candidate.attendanceStatus === "LATE"
                  ? "border-amber-200 bg-amber-50/20"
                  : candidate.attendanceStatus === "NO_SHOW"
                  ? "border-rose-200 bg-rose-50/20"
                  : "border-slate-200"
              }`}
            >
              {/* Header: Name, Tags, Roles, RSVP */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-base">
                      {candidate.name}
                    </span>
                    {candidate.jerseyNumber !== null && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        #{candidate.jerseyNumber}
                      </span>
                    )}
                    {candidate.isMinor && (
                      <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                        Youth
                      </span>
                    )}
                    {candidate.isGuest && (
                      <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                        Call-Up
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap mt-1 text-xs">
                    {/* Match Selection Role */}
                    {isSelected && (
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        ⭐ Selected XI {candidate.battingOrderPosition ? `(#${candidate.battingOrderPosition})` : ""}
                      </span>
                    )}
                    {isSubstitute && (
                      <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        Sub
                      </span>
                    )}

                    {/* Tactical Roles */}
                    {candidate.tacticalRole === "CAPTAIN" && (
                      <span className="font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-[11px]">
                        (C)
                      </span>
                    )}
                    {candidate.tacticalRole === "VICE_CAPTAIN" && (
                      <span className="font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-[11px]">
                        (VC)
                      </span>
                    )}
                    {candidate.tacticalRole === "WICKETKEEPER" && (
                      <span className="font-bold text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded text-[11px]">
                        (WK)
                      </span>
                    )}

                    {/* RSVP Indicator */}
                    <span
                      className={`px-2 py-0.5 rounded-md font-medium text-[11px] ${
                        candidate.rsvpStatus === "AVAILABLE"
                          ? "bg-emerald-50 text-emerald-700"
                          : candidate.rsvpStatus === "UNAVAILABLE"
                          ? "bg-rose-50 text-rose-700"
                          : candidate.rsvpStatus === "MAYBE"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      RSVP: {candidate.rsvpStatus.replace("_", " ")}
                    </span>
                  </div>

                  {/* Transport / Carpool note if provided */}
                  {candidate.transportNote && (
                    <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-1.5 mt-1.5 border border-slate-100 italic">
                      🚗 Note: &quot;{candidate.transportNote}&quot;
                    </p>
                  )}
                </div>
              </div>

              {/* 1-Tap 4-Way Segmented Touch Bar (>=44px touch targets) */}
              <div className="grid grid-cols-4 gap-1.5 mt-3">
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleStatusChange(candidate.memberProfileId, "PRESENT")}
                  className={`min-h-[44px] px-2 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center active:scale-[0.97] ${
                    candidate.attendanceStatus === "PRESENT"
                      ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/50"
                      : "bg-slate-50 hover:bg-emerald-50 text-slate-700 border border-slate-200"
                  }`}
                >
                  ✓ Present
                </button>

                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleStatusChange(candidate.memberProfileId, "LATE")}
                  className={`min-h-[44px] px-2 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center active:scale-[0.97] ${
                    candidate.attendanceStatus === "LATE"
                      ? "bg-amber-500 text-white shadow-sm ring-2 ring-amber-300"
                      : "bg-slate-50 hover:bg-amber-50 text-slate-700 border border-slate-200"
                  }`}
                >
                  ⏱ Late
                </button>

                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleStatusChange(candidate.memberProfileId, "ABSENT_EXCUSED")}
                  className={`min-h-[44px] px-2 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center active:scale-[0.97] ${
                    candidate.attendanceStatus === "ABSENT_EXCUSED"
                      ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-300"
                      : "bg-slate-50 hover:bg-blue-50 text-slate-700 border border-slate-200"
                  }`}
                >
                  Excused
                </button>

                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleStatusChange(candidate.memberProfileId, "NO_SHOW")}
                  className={`min-h-[44px] px-2 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center active:scale-[0.97] ${
                    candidate.attendanceStatus === "NO_SHOW"
                      ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-300"
                      : "bg-slate-50 hover:bg-rose-50 text-slate-700 border border-slate-200"
                  }`}
                >
                  ✕ No-Show
                </button>
              </div>

              {/* Late arrival time & quick note row */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                {candidate.attendanceStatus === "LATE" && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-600">Arrived:</span>
                    <input
                      type="time"
                      disabled={isLocked}
                      value={candidate.arrivalTime || ""}
                      onChange={(e) =>
                        handleArrivalTimeChange(candidate.memberProfileId, e.target.value)
                      }
                      className="min-h-[36px] px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                    />
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Pitch-side note (e.g. slight ankle strain)..."
                  disabled={isLocked}
                  value={candidate.notes || ""}
                  onChange={(e) =>
                    handleNotesChange(candidate.memberProfileId, e.target.value)
                  }
                  className="flex-1 min-h-[36px] px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          );
        })}

        {filteredCandidates.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-sm text-slate-500">No players match your search filter.</p>
          </div>
        )}
      </div>

      {/* Floating Pitch-Side Action Bar (Sticky Mobile Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="hidden sm:block text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{presentCount + lateCount}</span> attending /{" "}
            {candidates.length} total
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!isLocked && (
              <>
                <button
                  type="button"
                  onClick={() => setShowLockModal(true)}
                  disabled={isPending}
                  className="min-h-[48px] px-4 py-2.5 rounded-xl border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold text-sm transition active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  🔒 Lock & Sign Off
                </button>

                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={isPending}
                  className="flex-1 sm:flex-initial min-h-[48px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isPending ? "Saving..." : "💾 Save Attendance (<30s)"}
                </button>
              </>
            )}

            {isLocked && (
              <div className="w-full text-center py-2 px-4 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm">
                🔒 Attendance Report is Officially Locked & Sealed
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lock Confirmation Modal */}
      {showLockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl mx-auto">
              🔒
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">
                Lock & Sign Off Attendance?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Locking converts this attendance checklist into an immutable municipal record for
                Roskilde Kommune Folkeoplysning audit. Once locked, attendance cannot be modified.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-600">Present:</span>
                <span className="font-bold text-emerald-700">{presentCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Late:</span>
                <span className="font-bold text-amber-700">{lateCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Excused:</span>
                <span className="font-bold text-blue-700">{excusedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">No-Show:</span>
                <span className="font-bold text-rose-700">{noShowCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLockModal(false)}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLock}
                disabled={isPending}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition"
              >
                {isPending ? "Locking..." : "Confirm & Sign Off"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
