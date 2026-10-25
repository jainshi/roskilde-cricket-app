"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Shield,
  Dumbbell,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Repeat,
  Sparkles,
} from "lucide-react";
import { createRecurringTrainingScheduleAction } from "@/modules/teams-matches/actions/event.actions";
import { TrainingType } from "@prisma/client";

interface SquadItem {
  id: string;
  name: string;
  category: string;
}

interface FacilityItem {
  id: string;
  name: string;
  facilityType: string;
  location?: string | null;
}

interface RecurringTrainingFormProps {
  squads: SquadItem[];
  facilities: FacilityItem[];
  isAdmin: boolean;
}

const DAYS_OF_WEEK = [
  { day: 0, label: "Sun", fullName: "Sunday" },
  { day: 1, label: "Mon", fullName: "Monday" },
  { day: 2, label: "Tue", fullName: "Tuesday" },
  { day: 3, label: "Wed", fullName: "Wednesday" },
  { day: 4, label: "Thu", fullName: "Thursday" },
  { day: 5, label: "Fri", fullName: "Friday" },
  { day: 6, label: "Sat", fullName: "Saturday" },
];

export function RecurringTrainingForm({
  squads,
  facilities,
  isAdmin,
}: RecurringTrainingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Selected squads
  const [selectedSquadIds, setSelectedSquadIds] = useState<string[]>(
    squads.length >= 2 ? [squads[0].id, squads[1].id] : squads.map((s) => s.id)
  );

  const [trainingType, setTrainingType] = useState<TrainingType>("INDOOR_WINTER");
  const [titlePrefix, setTitlePrefix] = useState<string>("Indoor Winter Training");
  const [facilityId, setFacilityId] = useState<string>(
    facilities.find((f) => f.name.toLowerCase().includes("indoor"))?.id ||
      facilities[0]?.id ||
      ""
  );

  // Default range: 12 weeks from today
  const today = new Date();
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + ((7 - today.getDay()) % 7 || 7));
  const twelveWeeksLater = new Date(nextSunday);
  twelveWeeksLater.setDate(nextSunday.getDate() + 12 * 7);

  const [startDateStr, setStartDateStr] = useState<string>(
    nextSunday.toISOString().split("T")[0]
  );
  const [endDateStr, setEndDateStr] = useState<string>(
    twelveWeeksLater.toISOString().split("T")[0]
  );

  // Selected days: defaults to Sunday (0)
  const [selectedDays, setSelectedDays] = useState<number[]>([0]);

  const [startTime, setStartTime] = useState<string>("08:00");
  const [endTime, setEndTime] = useState<string>("10:00");
  const [meetTime, setMeetTime] = useState<string>("07:45");
  const [rsvpHoursBefore, setRsvpHoursBefore] = useState<number>(24);

  const [skipConflictingDates, setSkipConflictingDates] = useState<boolean>(true);
  const [collisionOverrideReason, setCollisionOverrideReason] = useState<string>("");

  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Quick Preset Handlers
  function applyPreset(presetType: "JUNIOR_SUNDAY" | "SENIOR_SATURDAY") {
    if (presetType === "JUNIOR_SUNDAY") {
      const juniorSquads = squads.filter((s) => s.category === "YOUTH");
      if (juniorSquads.length > 0) {
        setSelectedSquadIds(juniorSquads.map((s) => s.id));
      }
      setSelectedDays([0]); // Sunday
      setStartTime("08:00");
      setEndTime("10:00");
      setMeetTime("07:45");
      setTrainingType("INDOOR_WINTER");
      setTitlePrefix("Junior Indoor Training");
      const indoor = facilities.find((f) => f.name.toLowerCase().includes("indoor"));
      if (indoor) setFacilityId(indoor.id);
    } else if (presetType === "SENIOR_SATURDAY") {
      const seniorSquads = squads.filter((s) => s.category === "SENIOR");
      if (seniorSquads.length > 0) {
        setSelectedSquadIds(seniorSquads.map((s) => s.id));
      }
      setSelectedDays([6]); // Saturday
      setStartTime("10:00");
      setEndTime("12:00");
      setMeetTime("09:45");
      setTrainingType("INDOOR_WINTER");
      setTitlePrefix("Senior Indoor Training");
      const indoor = facilities.find((f) => f.name.toLowerCase().includes("indoor"));
      if (indoor) setFacilityId(indoor.id);
    }
  }

  function toggleDay(day: number) {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  }

  function toggleSquad(squadId: string) {
    if (selectedSquadIds.includes(squadId)) {
      if (selectedSquadIds.length > 1) {
        setSelectedSquadIds(selectedSquadIds.filter((id) => id !== squadId));
      }
    } else {
      setSelectedSquadIds([...selectedSquadIds, squadId]);
    }
  }

  // Calculate estimated total sessions
  const estimatedDatesCount = React.useMemo(() => {
    try {
      const s = new Date(startDateStr);
      const e = new Date(endDateStr);
      s.setHours(12, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
      if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return 0;
      let count = 0;
      const curr = new Date(s);
      while (curr <= e) {
        if (selectedDays.includes(curr.getDay())) count++;
        curr.setDate(curr.getDate() + 1);
      }
      return count;
    } catch {
      return 0;
    }
  }, [startDateStr, endDateStr, selectedDays]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (selectedSquadIds.length === 0) {
      setErrorMsg("Please select at least one squad.");
      return;
    }

    if (selectedDays.length === 0) {
      setErrorMsg("Please select at least one day of the week.");
      return;
    }

    startTransition(async () => {
      const res = await createRecurringTrainingScheduleAction({
        teamSquadIds: selectedSquadIds,
        facilityId: facilityId || null,
        trainingType,
        titlePrefix: titlePrefix.trim() || null,
        startDate: startDateStr,
        endDate: endDateStr,
        daysOfWeek: selectedDays,
        startTime,
        endTime,
        meetTime: meetTime || null,
        rsvpHoursBefore,
        skipConflictingDates,
        collisionOverrideReason:
          isAdmin && collisionOverrideReason.trim().length >= 5
            ? collisionOverrideReason.trim()
            : null,
      });

      if (res.success && res.data) {
        const d = res.data as any;
        setSuccessMsg(
          `Successfully scheduled ${d.createdCount} training sessions across ${d.totalDatesEvaluated} weekly dates! ${
            d.skippedCount > 0 ? `(${d.skippedCount} conflicting dates skipped)` : ""
          }`
        );
        setTimeout(() => {
          router.push("/events");
        }, 1200);
      } else {
        setErrorMsg(res.error || "Failed to schedule recurring training.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Quick Presets Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/60 via-slate-900 to-indigo-950/60 border border-sky-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
          <div>
            <p className="text-xs font-bold text-white">Club Training Presets</p>
            <p className="text-[11px] text-slate-400">
              One-click setup for common recurring junior and senior training slots.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset("JUNIOR_SUNDAY")}
            className="px-3 py-1.5 rounded-xl bg-sky-900/60 hover:bg-sky-800 border border-sky-700/60 text-sky-200 text-xs font-semibold transition-all active:scale-[0.98]"
          >
            Junior U13 &amp; U15 (Sun 08-10)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("SENIOR_SATURDAY")}
            className="px-3 py-1.5 rounded-xl bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700/60 text-indigo-200 text-xs font-semibold transition-all active:scale-[0.98]"
          >
            Seniors (Sat 10-12)
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-sm flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Cannot schedule recurring training</p>
            <p className="text-xs text-red-300 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Schedule Generated!</p>
            <p className="text-xs text-emerald-300 mt-0.5">{successMsg}</p>
          </div>
        </div>
      )}

      {/* 1. Participating Squads */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Shield className="w-4 h-4 text-sky-400" />
          Participating Squads (Multi-Squad Training Supported)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {squads.map((squad) => {
            const isSelected = selectedSquadIds.includes(squad.id);
            return (
              <button
                key={squad.id}
                type="button"
                onClick={() => toggleSquad(squad.id)}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                  isSelected
                    ? "bg-sky-500/15 border-sky-500/50 text-white shadow-sm"
                    : "bg-slate-950/80 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <div>
                  <p className="text-xs font-bold">{squad.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{squad.category}</p>
                </div>
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] font-bold ${
                    isSelected
                      ? "bg-sky-500 border-sky-400 text-slate-950"
                      : "border-slate-700 bg-slate-900"
                  }`}
                >
                  {isSelected ? "✓" : ""}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Days of the Week & Timing */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          Weekly Rhythm &amp; Time Slot
        </h3>

        <div>
          <label className="text-xs font-medium text-slate-300 block mb-2">
            Weekly Training Days <span className="text-red-400">*</span>
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {DAYS_OF_WEEK.map((item) => {
              const isSelected = selectedDays.includes(item.day);
              return (
                <button
                  key={item.day}
                  type="button"
                  onClick={() => toggleDay(item.day)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    isSelected
                      ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-md shadow-emerald-950/40"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {item.fullName}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Meet Time (Optional)
            </label>
            <input
              type="time"
              value={meetTime}
              onChange={(e) => setMeetTime(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Start Time <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              End Time <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>
        </div>
      </div>

      {/* 3. Season Date Range & Facility */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-400" />
          Date Span &amp; Facility Allocation
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              First Session Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Last Session Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Reserved Club Facility
            </label>
            <select
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">No facility reserved</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.facilityType})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Training Session Title
            </label>
            <input
              type="text"
              value={titlePrefix}
              onChange={(e) => setTitlePrefix(e.target.value)}
              placeholder="e.g. Junior Indoor Training"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              Training Focus
            </label>
            <select
              value={trainingType}
              onChange={(e) => setTrainingType(e.target.value as TrainingType)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="INDOOR_WINTER">Indoor Winter Training</option>
              <option value="NET_PRACTICE">Net Practice</option>
              <option value="FIELDING_FITNESS">Fielding &amp; Fitness</option>
              <option value="OPEN_NETS">Open Net Session</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Conflict Handling & Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Repeat className="w-4 h-4 text-teal-400" />
          Generation Summary &amp; Conflict Policy
        </h3>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">
              Generating for <span className="font-bold text-white">{selectedSquadIds.length} squads</span> over{" "}
              <span className="font-bold text-emerald-400 font-mono">{estimatedDatesCount} weeks</span>:
            </span>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-bold font-mono text-xs">
            {estimatedDatesCount * selectedSquadIds.length} Total Sessions
          </span>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="skipConflicting"
            checked={skipConflictingDates}
            onChange={(e) => setSkipConflictingDates(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0"
          />
          <label htmlFor="skipConflicting" className="text-xs text-slate-300">
            Automatically skip any specific dates that have an existing facility collision
          </label>
        </div>

        {isAdmin && !skipConflictingDates && (
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
              Admin Conflict Override Rationale (Optional)
            </label>
            <input
              type="text"
              value={collisionOverrideReason}
              onChange={(e) => setCollisionOverrideReason(e.target.value)}
              placeholder="Rationale if double-booking any date..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>
        )}
      </div>

      {/* Submit Action */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isPending || estimatedDatesCount === 0}
          className="px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isPending
            ? "Generating Sessions..."
            : `Schedule ${estimatedDatesCount * selectedSquadIds.length} Recurring Sessions`}
        </button>
      </div>
    </form>
  );
}
