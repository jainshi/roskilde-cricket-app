"use client";

import { useState, useTransition } from "react";
import { UserPlus, AlertTriangle, CheckCircle, XCircle, ShieldCheck } from "lucide-react";
import { assignRosterMemberAction } from "@/modules/teams-matches/actions/squad.actions";

interface CandidateMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  dateOfBirth: Date | string | null;
  isAlreadyRostered: boolean;
  eligibility: {
    status: string;
    isAllowed: boolean;
    ageOnCutoff: number | null;
    reason: string;
    warning?: string;
  };
}

interface AddRosterMemberDialogProps {
  teamSquadId: string;
  squadName: string;
  candidates: CandidateMember[];
}

export function AddRosterMemberDialog({
  teamSquadId,
  squadName,
  candidates,
}: AddRosterMemberDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [rosterRole, setRosterRole] = useState<"PLAYER" | "CAPTAIN" | "VICE_CAPTAIN">("PLAYER");
  const [jerseyNumber, setJerseyNumber] = useState<string>("");
  const [hasDispensation, setHasDispensation] = useState(false);
  const [dispensationNotes, setDispensationNotes] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedCandidate = candidates.find((c) => c.id === selectedMemberId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) return;

    startTransition(async () => {
      setFeedback(null);
      const res = await assignRosterMemberAction({
        teamSquadId,
        memberProfileId: selectedMemberId,
        rosterRole,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber, 10) : null,
        hasDispensation,
        dispensationNotes: hasDispensation ? dispensationNotes : null,
      });

      if (res.success) {
        setFeedback({ type: "success", message: `Player added to ${squadName} successfully!` });
        setTimeout(() => {
          setIsOpen(false);
          setSelectedMemberId("");
          setJerseyNumber("");
          setHasDispensation(false);
          setDispensationNotes("");
          setFeedback(null);
        }, 1200);
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to add player." });
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <UserPlus className="h-4 w-4" /> Add Player
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">Add Player to Roster</h2>
                <p className="text-xs text-muted-foreground">{squadName}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {feedback && (
              <div
                className={`rounded-lg p-3 text-sm ${
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200"
                    : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200"
                }`}
              >
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              {/* Member Picker */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Select Club Member <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">-- Choose Member --</option>
                  {candidates.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      disabled={c.isAlreadyRostered}
                    >
                      {c.firstName} {c.lastName} {c.isAlreadyRostered ? "(Already on Roster)" : `(Age ${c.eligibility.ageOnCutoff ?? "?"})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Age Eligibility Assessment Banner */}
              {selectedCandidate && (
                <div
                  className={`rounded-xl border p-3.5 space-y-1.5 text-xs ${
                    selectedCandidate.eligibility.status === "ELIGIBLE"
                      ? "border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                      : selectedCandidate.eligibility.status === "PLAYING_UP"
                      ? "border-amber-300 bg-amber-50/70 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                      : "border-red-300 bg-red-50/70 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    {selectedCandidate.eligibility.status === "ELIGIBLE" && (
                      <>
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <span>DCF Age Eligible</span>
                      </>
                    )}
                    {selectedCandidate.eligibility.status === "PLAYING_UP" && (
                      <>
                        <ShieldCheck className="h-4 w-4 text-amber-600" />
                        <span>Playing Up Permitted</span>
                      </>
                    )}
                    {(selectedCandidate.eligibility.status === "OVERAGE_BLOCKED" ||
                      selectedCandidate.eligibility.status === "UNDERAGE_BLOCKED") && (
                      <>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span>Age Boundary Warning</span>
                      </>
                    )}
                  </div>
                  <p>{selectedCandidate.eligibility.reason}</p>
                  {selectedCandidate.eligibility.warning && (
                    <p className="font-medium text-amber-800 dark:text-amber-300">
                      ⚠️ {selectedCandidate.eligibility.warning}
                    </p>
                  )}
                </div>
              )}

              {/* Roster Role & Jersey Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Roster Role
                  </label>
                  <select
                    value={rosterRole}
                    onChange={(e) => setRosterRole(e.target.value as any)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="PLAYER">Regular Player</option>
                    <option value="CAPTAIN">Team Captain</option>
                    <option value="VICE_CAPTAIN">Vice-Captain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Jersey Number (optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    placeholder="e.g. 7"
                    value={jerseyNumber}
                    onChange={(e) => setJerseyNumber(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dispensation Checkbox */}
              {selectedCandidate && !selectedCandidate.eligibility.isAllowed && (
                <div className="rounded-lg border border-amber-300 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/20 space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasDispensation}
                      onChange={(e) => setHasDispensation(e.target.checked)}
                      className="mt-0.5 rounded border-input text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-medium text-foreground">
                      Grant approved DCF dispensation for this player
                    </span>
                  </label>

                  {hasDispensation && (
                    <div>
                      <input
                        type="text"
                        placeholder="Dispensation rationale / DCF approval ref..."
                        value={dispensationNotes}
                        onChange={(e) => setDispensationNotes(e.target.value)}
                        required
                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-input bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isPending ||
                    !selectedMemberId ||
                    (selectedCandidate && !selectedCandidate.eligibility.isAllowed && !hasDispensation)
                  }
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? "Adding..." : "Confirm & Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
