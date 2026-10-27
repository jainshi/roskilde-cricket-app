"use client";

import React, { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Users,
  Shield,
  Star,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Car,
  AlertTriangle,
  Send,
  Save,
  ArrowUp,
  ArrowDown,
  UserCheck,
} from "lucide-react";
import {
  saveMatchLineupDraftAction,
  publishMatchLineupAction,
} from "@/modules/teams-matches/actions/selection.actions";
import {
  LineupSlot,
  MatchTacticalRole,
  SelectionPublicationStatus,
} from "@prisma/client";
import { validateMatchLineup } from "@/modules/teams-matches/domain/lineup-validator";

export interface RosterCandidate {
  id: string; // memberProfileId
  firstName: string;
  lastName: string;
  jerseyNumber?: number | null;
  battingPosition?: string | null;
  bowlingStyle?: string | null;
  rsvpStatus: "AVAILABLE" | "UNAVAILABLE" | "MAYBE" | "NO_RESPONSE";
  transportNote?: string | null;
  hasDispensation?: boolean;
  hasOverdueFees?: boolean;
}

export interface SelectedSlot {
  memberProfileId: string;
  selectionRole: LineupSlot;
  tacticalRole: MatchTacticalRole;
  battingOrderPosition?: number | null;
}

interface MatchSelectionConsoleProps {
  scheduledEventId: string;
  eventTitle: string;
  squadName: string;
  defaultLineupSize: number;
  roster: RosterCandidate[];
  initialSelection?: {
    id: string;
    selectionStatus: SelectionPublicationStatus;
    targetLineupSize: number;
    notes?: string | null;
    publishedAt?: Date | string | null;
    publishedByName?: string | null;
    selectedPlayers: SelectedSlot[];
  } | null;
}

export function MatchSelectionConsole({
  scheduledEventId,
  eventTitle,
  squadName,
  defaultLineupSize,
  roster,
  initialSelection,
}: MatchSelectionConsoleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [targetLineupSize, setTargetLineupSize] = useState<number>(
    initialSelection?.targetLineupSize || defaultLineupSize || 11
  );
  const [notes, setNotes] = useState<string>(initialSelection?.notes || "");
  const [selectionStatus, setSelectionStatus] = useState<SelectionPublicationStatus>(
    initialSelection?.selectionStatus || "DRAFT"
  );

  // Selected player slots
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>(
    initialSelection?.selectedPlayers || []
  );

  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [isConfirmPublishOpen, setIsConfirmPublishOpen] = useState(false);

  // Split players into Starting, Subs/Reserves, and Remaining Pool
  const startingPlayers = useMemo(
    () => selectedSlots.filter((s) => s.selectionRole === "STARTING"),
    [selectedSlots]
  );
  const subPlayers = useMemo(
    () => selectedSlots.filter((s) => s.selectionRole !== "STARTING"),
    [selectedSlots]
  );

  const selectedMemberIds = useMemo(
    () => new Set(selectedSlots.map((s) => s.memberProfileId)),
    [selectedSlots]
  );

  const unselectedPool = useMemo(() => {
    return roster.filter((p) => {
      if (selectedMemberIds.has(p.id)) return false;
      if (activeFilter === "AVAILABLE" && p.rsvpStatus !== "AVAILABLE") return false;
      if (activeFilter === "MAYBE" && p.rsvpStatus !== "MAYBE") return false;
      if (activeFilter === "NO_RESPONSE" && p.rsvpStatus !== "NO_RESPONSE") return false;
      return true;
    });
  }, [roster, selectedMemberIds, activeFilter]);

  // Live Domain Invariant Validation
  const validation = useMemo(() => {
    return validateMatchLineup({
      targetLineupSize,
      players: selectedSlots.map((s) => ({
        memberProfileId: s.memberProfileId,
        selectionRole: s.selectionRole,
        tacticalRole: s.tacticalRole,
        battingOrderPosition: s.battingOrderPosition ?? undefined,
      })),
    });
  }, [targetLineupSize, selectedSlots]);

  // Handlers for slot moves
  function addToStarting(player: RosterCandidate) {
    if (startingPlayers.length >= targetLineupSize) {
      setErrorMsg(`Starting lineup is full (${targetLineupSize}/${targetLineupSize}). Add as a Substitute instead.`);
      return;
    }
    setErrorMsg("");
    const newSlot: SelectedSlot = {
      memberProfileId: player.id,
      selectionRole: "STARTING",
      tacticalRole: "PLAYER",
      battingOrderPosition: startingPlayers.length + 1,
    };
    setSelectedSlots([...selectedSlots, newSlot]);
  }

  function addToSubstitute(player: RosterCandidate) {
    setErrorMsg("");
    const newSlot: SelectedSlot = {
      memberProfileId: player.id,
      selectionRole: "SUBSTITUTE",
      tacticalRole: "PLAYER",
      battingOrderPosition: null,
    };
    setSelectedSlots([...selectedSlots, newSlot]);
  }

  function removeFromLineup(memberProfileId: string) {
    setErrorMsg("");
    const updated = selectedSlots.filter((s) => s.memberProfileId !== memberProfileId);
    // Recalculate batting order for starting players
    let order = 1;
    for (const slot of updated) {
      if (slot.selectionRole === "STARTING") {
        slot.battingOrderPosition = order++;
      }
    }
    setSelectedSlots(updated);
  }

  function changeTacticalRole(memberProfileId: string, tacticalRole: MatchTacticalRole) {
    setSelectedSlots(
      selectedSlots.map((s) =>
        s.memberProfileId === memberProfileId ? { ...s, tacticalRole } : s
      )
    );
  }

  function moveBattingOrder(index: number, direction: "UP" | "DOWN") {
    const starters = [...startingPlayers];
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= starters.length) return;

    const temp = starters[index];
    starters[index] = starters[targetIdx];
    starters[targetIdx] = temp;

    // Re-index
    starters.forEach((s, idx) => {
      s.battingOrderPosition = idx + 1;
    });

    const otherSlots = selectedSlots.filter((s) => s.selectionRole !== "STARTING");
    setSelectedSlots([...starters, ...otherSlots]);
  }

  // Save Draft
  function handleSaveDraft() {
    setErrorMsg("");
    setSuccessMsg("");

    startTransition(async () => {
      const res = await saveMatchLineupDraftAction({
        scheduledEventId,
        targetLineupSize,
        notes: notes.trim() || null,
        players: selectedSlots,
      });

      if (res.success) {
        setSelectionStatus("DRAFT");
        setSuccessMsg("Draft lineup saved successfully.");
      } else {
        setErrorMsg(res.error || "Failed to save draft.");
      }
    });
  }

  // Publish Lineup
  function handleConfirmPublish() {
    setIsConfirmPublishOpen(false);
    setErrorMsg("");
    setSuccessMsg("");

    if (!validation.isValid) {
      setErrorMsg(`Cannot publish lineup: ${validation.errors.join("; ")}`);
      return;
    }

    startTransition(async () => {
      const res = await publishMatchLineupAction({
        scheduledEventId,
        targetLineupSize,
        notes: notes.trim() || null,
        players: selectedSlots,
      });

      if (res.success) {
        setSelectionStatus("PUBLISHED");
        setSuccessMsg(
          `Lineup published! Sent simultaneous notifications to ${res.notifiedPlayerCount} selected players & parents.`
        );
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to publish lineup.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header Status & Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                selectionStatus === "PUBLISHED"
                  ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
                  : "bg-amber-950/80 border-amber-800 text-amber-300"
              }`}
            >
              {selectionStatus} LINEUP
            </span>
            <span className="text-xs text-slate-400 font-semibold">{squadName}</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">{eventTitle}</h2>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save Draft
          </button>

          <button
            type="button"
            onClick={() => setIsConfirmPublishOpen(true)}
            disabled={isPending || !validation.isValid}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            Publish Lineup &amp; Alert Parents
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Lineup Issue</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Success</p>
            <p className="mt-0.5">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Validation Checks Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Size target */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between ${
            startingPlayers.length === targetLineupSize
              ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-300"
              : "bg-slate-900 border-slate-800 text-slate-300"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Starting XI / Squad
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold font-mono">
              {startingPlayers.length} / {targetLineupSize}
            </span>
            <div className="flex items-center gap-1 text-[10px]">
              <label className="text-slate-400">Target:</label>
              <input
                type="number"
                min={6}
                max={15}
                value={targetLineupSize}
                onChange={(e) => setTargetLineupSize(Number(e.target.value))}
                className="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center text-xs font-bold text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. Captain */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between ${
            startingPlayers.filter((s) => s.tacticalRole === "CAPTAIN").length === 1
              ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-300"
              : "bg-amber-950/30 border-amber-800/60 text-amber-300"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Team Captain
          </span>
          <p className="text-xs font-bold mt-1">
            {startingPlayers.find((s) => s.tacticalRole === "CAPTAIN")
              ? roster.find(
                  (p) =>
                    p.id ===
                    startingPlayers.find((s) => s.tacticalRole === "CAPTAIN")
                      ?.memberProfileId
                )?.firstName || "1 Assigned (✓)"
              : "⚠️ Needs 1 Captain"}
          </p>
        </div>

        {/* 3. Wicketkeeper */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between ${
            startingPlayers.filter((s) => s.tacticalRole === "WICKETKEEPER").length ===
            1
              ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-300"
              : "bg-amber-950/30 border-amber-800/60 text-amber-300"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Wicketkeeper (WK)
          </span>
          <p className="text-xs font-bold mt-1">
            {startingPlayers.find((s) => s.tacticalRole === "WICKETKEEPER")
              ? roster.find(
                  (p) =>
                    p.id ===
                    startingPlayers.find((s) => s.tacticalRole === "WICKETKEEPER")
                      ?.memberProfileId
                )?.firstName || "1 Assigned (✓)"
              : "⚠️ Needs 1 WK"}
          </p>
        </div>

        {/* 4. Substitutes */}
        <div className="p-3 rounded-xl border bg-slate-900 border-slate-800 text-slate-300 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Substitutes
          </span>
          <p className="text-xl font-bold font-mono mt-1 text-sky-400">
            {subPlayers.length}
          </p>
        </div>
      </div>

      {/* Main 2-Column Console Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Starting Lineup & Substitutes */}
        <div className="lg:col-span-7 space-y-6">
          {/* Starting Lineup List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-400" />
                Starting Lineup ({startingPlayers.length}/{targetLineupSize})
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                Order &amp; Tactical Roles
              </span>
            </div>

            {startingPlayers.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs italic">
                No starting players selected. Tap players from the Available pool on the right to add them to the starting lineup.
              </div>
            ) : (
              <div className="space-y-2">
                {startingPlayers.map((slot, index) => {
                  const player = roster.find((p) => p.id === slot.memberProfileId);
                  if (!player) return null;

                  return (
                    <div
                      key={slot.memberProfileId}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      {/* Batting order index & arrows */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {slot.battingOrderPosition || index + 1}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveBattingOrder(index, "UP")}
                            disabled={index === 0}
                            className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20"
                            title="Move up batting order"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBattingOrder(index, "DOWN")}
                            disabled={index === startingPlayers.length - 1}
                            className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20"
                            title="Move down batting order"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Name & Player Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-white truncate">
                            {player.firstName} {player.lastName}
                          </p>
                          {player.jerseyNumber && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              #{player.jerseyNumber}
                            </span>
                          )}
                          {player.hasOverdueFees && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0"
                              title="Member has club fees overdue by more than 14 days"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              Fees Overdue (&gt;14d)
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {player.battingPosition || "RHB"} • {player.bowlingStyle || "Pace"}
                        </p>
                      </div>

                      {/* Tactical Role Selector */}
                      <div className="shrink-0 flex items-center gap-2">
                        <select
                          value={slot.tacticalRole}
                          onChange={(e) =>
                            changeTacticalRole(
                              slot.memberProfileId,
                              e.target.value as MatchTacticalRole
                            )
                          }
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-semibold text-sky-300 focus:outline-none"
                        >
                          <option value="PLAYER">Player</option>
                          <option value="CAPTAIN">Captain (C)</option>
                          <option value="VICE_CAPTAIN">Vice-Captain (VC)</option>
                          <option value="WICKETKEEPER">Wicketkeeper (WK)</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => removeFromLineup(slot.memberProfileId)}
                          className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                          title="Remove from starting XI"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Substitutes & Reserves */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 pb-2 border-b border-slate-800">
              <Users className="w-4 h-4 text-sky-400" />
              Substitutes &amp; Reserves ({subPlayers.length})
            </h3>

            {subPlayers.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 text-center">
                No substitutes selected.
              </p>
            ) : (
              <div className="space-y-2">
                {subPlayers.map((slot) => {
                  const player = roster.find((p) => p.id === slot.memberProfileId);
                  if (!player) return null;

                  return (
                    <div
                      key={slot.memberProfileId}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-white">
                            {player.firstName} {player.lastName}
                          </p>
                          {player.hasOverdueFees && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0"
                              title="Member has club fees overdue by more than 14 days"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              Fees Overdue (&gt;14d)
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {player.battingPosition || "RHB"} • {player.bowlingStyle || "Pace"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromLineup(slot.memberProfileId)}
                        className="p-1 text-slate-500 hover:text-red-400"
                        title="Remove substitute"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Available Squad Pool */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Squad Pool ({unselectedPool.length})
              </h3>

              {/* Filter Pills */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveFilter("ALL")}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    activeFilter === "ALL"
                      ? "bg-sky-500 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("AVAILABLE")}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    activeFilter === "AVAILABLE"
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Available
                </button>
              </div>
            </div>

            {unselectedPool.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-6 text-center">
                All players matching this filter have been selected.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {unselectedPool.map((player) => {
                  const rsvpColor =
                    player.rsvpStatus === "AVAILABLE"
                      ? "text-emerald-400 bg-emerald-950/60 border-emerald-800/80"
                      : player.rsvpStatus === "MAYBE"
                      ? "text-amber-400 bg-amber-950/60 border-amber-800/80"
                      : player.rsvpStatus === "UNAVAILABLE"
                      ? "text-rose-400 bg-rose-950/60 border-rose-800/80"
                      : "text-slate-400 bg-slate-800 border-slate-700";

                  return (
                    <div
                      key={player.id}
                      className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 hover:border-slate-700 space-y-2 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold text-white truncate">
                              {player.firstName} {player.lastName}
                            </p>
                            {player.hasOverdueFees && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0"
                                title="Member has club fees overdue by more than 14 days"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                Fees Overdue (&gt;14d)
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {player.battingPosition || "RHB"} • {player.bowlingStyle || "Pace"}
                          </p>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase shrink-0 ${rsvpColor}`}
                        >
                          {player.rsvpStatus.replace("_", " ")}
                        </span>
                      </div>

                      {player.transportNote && (
                        <p className="text-[10px] text-slate-400 italic flex items-center gap-1 truncate">
                          <Car className="w-3 h-3 text-sky-400 shrink-0" />
                          <span>&ldquo;{player.transportNote}&rdquo;</span>
                        </p>
                      )}

                      {/* 1-Tap Action buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900">
                        <button
                          type="button"
                          onClick={() => addToStarting(player)}
                          disabled={startingPlayers.length >= targetLineupSize}
                          className="py-1 px-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/80 text-emerald-300 text-[11px] font-bold transition-colors disabled:opacity-40"
                        >
                          + Starting XI
                        </button>
                        <button
                          type="button"
                          onClick={() => addToSubstitute(player)}
                          className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors"
                        >
                          + Substitute
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Publishing & Parent Alerts */}
      {isConfirmPublishOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-400" />
              Publish Match Lineup
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to publish the official starting lineup for <strong>{eventTitle}</strong> ({startingPlayers.length} starters, {subPlayers.length} substitutes).
            </p>

            <div className="p-3.5 rounded-xl bg-sky-950/60 border border-sky-800/80 text-xs text-sky-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-sky-300">
                <UserCheck className="w-4 h-4" />
                Simultaneous Dual-Parent Notification
              </p>
              <p className="text-[11px] text-sky-300/90 leading-tight">
                All selected adult players and parents of linked minor players will immediately receive official selection notifications with match details and venue instructions.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmPublishOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={isPending}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg"
              >
                {isPending ? "Publishing & Alerting..." : "Confirm & Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
