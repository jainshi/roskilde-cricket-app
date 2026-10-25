"use client";

import React, { useState, useTransition } from "react";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Car,
  Lock,
  UserCheck,
  AlertCircle,
  X,
  ShieldAlert,
} from "lucide-react";
import {
  submitEventRsvpAction,
  updateTransportNoteAction,
} from "@/modules/teams-matches/actions/rsvp.actions";
import { RsvpStatusValue } from "@/modules/teams-matches/domain/rsvp-evaluator";

interface RsvpStatusBarProps {
  scheduledEventId: string;
  targetPlayer: {
    id: string;
    firstName: string;
    lastName: string;
  };
  currentStatus: RsvpStatusValue;
  initialTransportNote?: string | null;
  cutoffDeadline: string; // ISO string
  isLocked: boolean;
  canEdit: boolean;
  isDelegated: boolean;
  isStaffOverride: boolean;
}

export function RsvpStatusBar({
  scheduledEventId,
  targetPlayer,
  currentStatus,
  initialTransportNote,
  cutoffDeadline,
  isLocked,
  canEdit,
  isDelegated,
  isStaffOverride,
}: RsvpStatusBarProps) {
  const [status, setStatus] = useState<RsvpStatusValue>(currentStatus);
  const [transportNote, setTransportNote] = useState<string>(
    initialTransportNote || ""
  );
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState<string>(initialTransportNote || "");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string>("");

  const deadlineDate = new Date(cutoffDeadline);
  const deadlineFormatted = deadlineDate.toLocaleDateString("en-DK", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function handleSelectStatus(newStatus: "AVAILABLE" | "UNAVAILABLE" | "MAYBE") {
    if (!canEdit || isPending) return;
    setErrorMsg("");

    const prev = status;
    setStatus(newStatus); // optimistic update

    startTransition(async () => {
      const res = await submitEventRsvpAction({
        scheduledEventId,
        memberProfileId: targetPlayer.id,
        status: newStatus,
        transportNote: transportNote || null,
      });

      if (!res.success) {
        setStatus(prev); // rollback
        setErrorMsg(res.error || "Failed to update RSVP.");
      }
    });
  }

  function handleSaveNote(e: React.FormEvent) {
    e.preventDefault();
    setIsNoteModalOpen(false);
    setTransportNote(noteDraft);

    startTransition(async () => {
      await updateTransportNoteAction({
        scheduledEventId,
        memberProfileId: targetPlayer.id,
        transportNote: noteDraft.trim() || null,
      });
    });
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5">
      {/* Top Banner: Context and Deadline Lock Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {isDelegated ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-300 font-semibold">
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              Responding for: {targetPlayer.firstName} {targetPlayer.lastName}
            </span>
          ) : (
            <span className="font-bold text-white">
              Your Availability RSVP
            </span>
          )}

          {isStaffOverride && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800 text-indigo-300 text-[10px] font-bold">
              <ShieldAlert className="w-3 h-3" />
              Staff Pitch-Side Edit
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          {isLocked && !isStaffOverride ? (
            <span className="flex items-center gap-1 text-rose-400 font-semibold">
              <Lock className="w-3 h-3" />
              Cutoff Passed (Locked)
            </span>
          ) : (
            <span className="flex items-center gap-1 text-slate-400 font-mono">
              <Clock className="w-3 h-3 text-slate-500" />
              Cutoff: {deadlineFormatted}
            </span>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1-Tap Touch RSVP Buttons (>=44px touch targets) */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* AVAILABLE */}
        <button
          type="button"
          onClick={() => handleSelectStatus("AVAILABLE")}
          disabled={!canEdit || isPending}
          className={`min-h-[48px] rounded-xl border font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 py-2 transition-all active:scale-[0.98] ${
            status === "AVAILABLE"
              ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/40"
              : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60"
          } ${!canEdit ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <CheckCircle2
            className={`w-4 h-4 ${
              status === "AVAILABLE" ? "text-emerald-400" : "text-slate-500"
            }`}
          />
          <span>Available</span>
        </button>

        {/* MAYBE */}
        <button
          type="button"
          onClick={() => handleSelectStatus("MAYBE")}
          disabled={!canEdit || isPending}
          className={`min-h-[48px] rounded-xl border font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 py-2 transition-all active:scale-[0.98] ${
            status === "MAYBE"
              ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-950/40"
              : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60"
          } ${!canEdit ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <HelpCircle
            className={`w-4 h-4 ${
              status === "MAYBE" ? "text-amber-400" : "text-slate-500"
            }`}
          />
          <span>Maybe</span>
        </button>

        {/* UNAVAILABLE */}
        <button
          type="button"
          onClick={() => handleSelectStatus("UNAVAILABLE")}
          disabled={!canEdit || isPending}
          className={`min-h-[48px] rounded-xl border font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 py-2 transition-all active:scale-[0.98] ${
            status === "UNAVAILABLE"
              ? "bg-rose-500/20 border-rose-500 text-rose-300 shadow-md shadow-rose-950/40"
              : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60"
          } ${!canEdit ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <XCircle
            className={`w-4 h-4 ${
              status === "UNAVAILABLE" ? "text-rose-400" : "text-slate-500"
            }`}
          />
          <span>Unavailable</span>
        </button>
      </div>

      {/* Transport & Carpooling Note Bar */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Car className="w-4 h-4 text-sky-400 shrink-0" />
          {transportNote ? (
            <p className="text-xs text-slate-300 truncate italic">
              &ldquo;{transportNote}&rdquo;
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              No carpooling or transport note provided.
            </p>
          )}
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setNoteDraft(transportNote);
              setIsNoteModalOpen(true);
            }}
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 shrink-0 hover:underline"
          >
            {transportNote ? "Edit Note" : "+ Add Transport Note"}
          </button>
        )}
      </div>

      {/* Transport Note Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-sky-400" />
                Transport &amp; Carpooling Note
              </h3>
              <button
                onClick={() => setIsNoteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">
                  Let coaches and teammates know if you can offer rides or need transport:
                </label>
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="e.g. Can drive 3 players from Hedehusene Station..."
                  maxLength={300}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <p className="text-[10px] text-slate-500 text-right mt-1">
                  {noteDraft.length}/300
                </p>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
