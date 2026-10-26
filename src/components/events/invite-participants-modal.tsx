"use client";

import React, { useState, useTransition } from "react";
import {
  Users,
  UserPlus,
  Mail,
  Search,
  Sparkles,
  Dumbbell,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { inviteEventParticipantsAction } from "@/modules/teams-matches/actions/event.actions";

export interface CandidatePlayer {
  id: string;
  firstName: string;
  lastName: string;
  battingPosition?: string | null;
  bowlingStyle?: string | null;
  secondaryRoles?: string[];
  squadName?: string;
  isRosteredInSquad?: boolean;
}

interface InviteParticipantsModalProps {
  scheduledEventId: string;
  eventTitle: string;
  squadName: string;
  alreadyInvitedMemberIds: string[];
  candidatePlayers: CandidatePlayer[];
}

export function InviteParticipantsModal({
  scheduledEventId,
  eventTitle,
  squadName,
  alreadyInvitedMemberIds,
  candidatePlayers,
}: InviteParticipantsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filterPreset, setFilterPreset] = useState<
    "ALL" | "BATSMEN" | "BOWLERS" | "WICKETKEEPERS" | "SQUAD_ONLY"
  >("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notifyParticipants, setNotifyParticipants] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const alreadyInvitedSet = new Set(alreadyInvitedMemberIds);

  // Uninvited candidates
  const uninvitedCandidates = candidatePlayers.filter(
    (p) => !alreadyInvitedSet.has(p.id)
  );

  function isBatsman(p: CandidatePlayer): boolean {
    if (p.battingPosition && p.battingPosition !== "TAILENDER") return true;
    if (p.secondaryRoles?.includes("ALL_ROUNDER")) return true;
    return false;
  }

  function isBowler(p: CandidatePlayer): boolean {
    if (p.bowlingStyle && p.bowlingStyle !== "DOES_NOT_BOWL") return true;
    if (p.secondaryRoles?.includes("ALL_ROUNDER")) return true;
    return false;
  }

  function isWicketkeeper(p: CandidatePlayer): boolean {
    return Boolean(p.secondaryRoles?.includes("WICKETKEEPER"));
  }

  // Filter uninvited candidates
  const filteredCandidates = uninvitedCandidates.filter((p) => {
    if (filterPreset === "BATSMEN" && !isBatsman(p)) return false;
    if (filterPreset === "BOWLERS" && !isBowler(p)) return false;
    if (filterPreset === "WICKETKEEPERS" && !isWicketkeeper(p)) return false;
    if (filterPreset === "SQUAD_ONLY" && !p.isRosteredInSquad) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = `${p.firstName} ${p.lastName}`.toLowerCase().includes(q);
      const matchSquad = p.squadName?.toLowerCase().includes(q);
      if (!matchName && !matchSquad) return false;
    }

    return true;
  });

  function togglePlayer(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  }

  function handleSelectFiltered() {
    const ids = filteredCandidates.map((p) => p.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
  }

  function handleClear() {
    setSelectedIds([]);
  }

  function handleOpen() {
    setIsOpen(true);
    setErrorMsg("");
    setSuccessMsg("");
    setSelectedIds([]);
    setSearch("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setErrorMsg("Please select at least one player to invite.");
      return;
    }

    setErrorMsg("");
    startTransition(async () => {
      const res = await inviteEventParticipantsAction({
        scheduledEventId,
        memberProfileIds: selectedIds,
        notifyParticipants,
      });

      if (res.success) {
        setSuccessMsg(
          `Successfully invited ${selectedIds.length} participant(s) to this event!`
        );
        setTimeout(() => {
          setIsOpen(false);
        }, 1200);
      } else {
        setErrorMsg(res.error || "Failed to invite participants.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold transition-colors"
      >
        <UserPlus className="w-3.5 h-3.5" />
        Invite Participants
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                  <UserPlus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white font-serif">
                    Invite Eligible Participants
                  </h3>
                  <p className="text-xs text-slate-400 truncate max-w-xs">
                    {eventTitle} ({squadName})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Quick Filter Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setFilterPreset("ALL")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filterPreset === "ALL"
                    ? "bg-sky-500 text-white"
                    : "bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                All Available
              </button>
              <button
                type="button"
                onClick={() => setFilterPreset("BATSMEN")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  filterPreset === "BATSMEN"
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                Batsmen
              </button>
              <button
                type="button"
                onClick={() => setFilterPreset("BOWLERS")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  filterPreset === "BOWLERS"
                    ? "bg-indigo-500 text-white"
                    : "bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                <Dumbbell className="w-3 h-3" />
                Bowlers
              </button>
              <button
                type="button"
                onClick={() => setFilterPreset("WICKETKEEPERS")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filterPreset === "WICKETKEEPERS"
                    ? "bg-amber-500 text-white"
                    : "bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                🧤 Keepers
              </button>
              <button
                type="button"
                onClick={() => setFilterPreset("SQUAD_ONLY")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filterPreset === "SQUAD_ONLY"
                    ? "bg-slate-700 text-white"
                    : "bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                Squad Only
              </button>
            </div>

            {/* Search Input & Select All bar */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search player or squad..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectFiltered}
                  className="font-semibold text-sky-400 hover:text-sky-300"
                >
                  Select All
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="font-semibold text-slate-400 hover:text-slate-300"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Player Checklist List */}
            <div className="flex-1 overflow-y-auto max-h-60 space-y-1.5 pr-1">
              {filteredCandidates.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  {uninvitedCandidates.length === 0
                    ? "All eligible squad and club players have already been invited to this event."
                    : "No players match the current filter or search criteria."}
                </p>
              ) : (
                filteredCandidates.map((player) => {
                  const isSelected = selectedIds.includes(player.id);
                  return (
                    <div
                      key={player.id}
                      onClick={() => togglePlayer(player.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-sky-500/10 border-sky-500/40 text-white"
                          : "bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-sky-500 border-sky-500 text-white"
                              : "border-slate-700 bg-slate-900"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">
                              {player.firstName} {player.lastName}
                            </span>
                            {player.squadName && (
                              <span className="text-[10px] text-slate-400">
                                • {player.squadName}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 flex-wrap mt-0.5">
                            {player.battingPosition && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                                {player.battingPosition}
                              </span>
                            )}
                            {player.bowlingStyle && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/60">
                                {player.bowlingStyle}
                              </span>
                            )}
                            {player.secondaryRoles?.map((sr) => (
                              <span
                                key={sr}
                                className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-400 border border-purple-800/60"
                              >
                                {sr}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-slate-500">
                        {player.isRosteredInSquad ? "Squad Member" : "Guest"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Notification Checkbox */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <input
                type="checkbox"
                id="modalNotify"
                checked={notifyParticipants}
                onChange={(e) => setNotifyParticipants(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-sky-500"
              />
              <label
                htmlFor="modalNotify"
                className="text-xs text-slate-300 cursor-pointer flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                Send RSVP email notifications immediately
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-medium">
                {selectedIds.length} player(s) selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending || selectedIds.length === 0}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-sky-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending
                    ? "Inviting..."
                    : `Invite ${selectedIds.length} Player${
                        selectedIds.length === 1 ? "" : "s"
                      }`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
