"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  UserMinus,
  Search,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CreditCard,
  Save,
} from "lucide-react";
import { formatDanishKroner } from "@/modules/finance/domain/money-oere";
import {
  assignPlanToMembersAction,
  unassignPlayerFromPlanAction,
} from "@/modules/finance/actions/subscription.actions";

export interface CandidateMemberForPlan {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  dateOfBirth: Date | null;
  isMinor: boolean;
  parentName?: string;
  roles: string[];
  activeSubscriptions?: {
    planId: string;
    planName: string;
    seasonYear: number;
  }[];
}

interface AssignPlanMembersModalProps {
  plan: {
    id: string;
    name: string;
    category: string;
    amountOere: number;
    billingCycle: string;
    siblingDiscountPercent: number;
  };
  candidateMembers: CandidateMemberForPlan[];
  isOpen: boolean;
  onClose: () => void;
}

export function AssignPlanMembersModal({
  plan,
  candidateMembers,
  isOpen,
  onClose,
}: AssignPlanMembersModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filterPreset, setFilterPreset] = useState<
    "ALL" | "ENROLLED" | "YOUTH" | "ADULT" | "UNASSIGNED"
  >("ALL");
  const [seasonYear, setSeasonYear] = useState(2026);
  const [generateInvoices, setGenerateInvoices] = useState(true);
  const [dueDateDays, setDueDateDays] = useState(30);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Helper to determine who is currently enrolled in this plan for the given season
  const getEnrolledIds = (year: number) => {
    return candidateMembers
      .filter((m) =>
        m.activeSubscriptions?.some(
          (s) => s.planId === plan.id && s.seasonYear === year
        )
      )
      .map((m) => m.id);
  };

  const [selectedIds, setSelectedIds] = useState<string[]>(() => getEnrolledIds(2026));
  const [initialEnrolledIds, setInitialEnrolledIds] = useState<string[]>(() =>
    getEnrolledIds(2026)
  );

  // Sync state whenever modal opens or candidates/season change
  useEffect(() => {
    if (isOpen) {
      const current = getEnrolledIds(seasonYear);
      setInitialEnrolledIds(current);
      setSelectedIds(current);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, plan.id, seasonYear, candidateMembers]);

  if (!isOpen) return null;

  const newlyAssigned = selectedIds.filter((id) => !initialEnrolledIds.includes(id));
  const newlyUnassigned = initialEnrolledIds.filter((id) => !selectedIds.includes(id));
  const hasChanges = newlyAssigned.length > 0 || newlyUnassigned.length > 0;

  // Filter candidates
  const filteredCandidates = candidateMembers.filter((m) => {
    const isChecked = selectedIds.includes(m.id);
    const wasOriginallyEnrolled = initialEnrolledIds.includes(m.id);

    if (filterPreset === "ENROLLED" && !isChecked) return false;
    if (filterPreset === "YOUTH" && !m.isMinor) return false;
    if (filterPreset === "ADULT" && m.isMinor) return false;
    if (filterPreset === "UNASSIGNED" && (isChecked || wasOriginallyEnrolled)) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = `${m.firstName} ${m.lastName}`.toLowerCase().includes(q);
      const matchEmail = m.email?.toLowerCase().includes(q);
      const matchParent = m.parentName?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchParent) return false;
    }

    return true;
  });

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredCandidates.map((c) => c.id);
    const allSelected = filteredIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const summaryParts: string[] = [];

      // 1. Process unassignments first if any
      if (newlyUnassigned.length > 0) {
        const unassignRes = await unassignPlayerFromPlanAction({
          memberProfileIds: newlyUnassigned,
          planId: plan.id,
          seasonYear,
        });

        if (!unassignRes.success) {
          setErrorMsg(unassignRes.error || "Failed to unassign players.");
          return;
        }
        summaryParts.push(`${newlyUnassigned.length} player(s) unassigned`);
      }

      // 2. Process assignments if any
      if (newlyAssigned.length > 0) {
        const assignRes = await assignPlanToMembersAction({
          planId: plan.id,
          memberProfileIds: newlyAssigned,
          seasonYear,
          generateInvoices,
          dueDateDays,
        });

        if (!assignRes.success) {
          setErrorMsg(assignRes.error || "Failed to assign players.");
          return;
        }
        const data = assignRes.data as { enrolledCount: number; invoiceCount: number };
        summaryParts.push(
          `${data.enrolledCount} player(s) assigned (${data.invoiceCount} invoice(s) generated)`
        );
      }

      setInitialEnrolledIds(selectedIds);
      setSuccessMsg(`Plan updated successfully: ${summaryParts.join(", ")}.`);
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Manage Plan Members</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {formatDanishKroner(plan.amountOere)}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Check to assign or uncheck to unassign players from{" "}
                <strong className="text-slate-300">{plan.name}</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto">
            {/* Success and Error Banners */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Invoicing & Season Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Season Year</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <select
                    value={seasonYear}
                    onChange={(e) => setSeasonYear(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono cursor-pointer"
                  >
                    <option value={2026}>Season 2026</option>
                    <option value={2027}>Season 2027</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Billing &amp; Invoice</label>
                <label className="flex items-center gap-2 cursor-pointer mt-1.5">
                  <input
                    type="checkbox"
                    checked={generateInvoices}
                    onChange={(e) => setGenerateInvoices(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 w-4 h-4"
                  />
                  <span className="text-slate-300">Auto-issue invoice for new assignments</span>
                </label>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by player name, email, or guardian..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
                >
                  {filteredCandidates.every((c) => selectedIds.includes(c.id)) &&
                  filteredCandidates.length > 0
                    ? "Deselect All Filtered"
                    : `Select All (${filteredCandidates.length})`}
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 pt-1 text-xs overflow-x-auto">
                {(["ALL", "ENROLLED", "YOUTH", "ADULT", "UNASSIGNED"] as const).map(
                  (preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFilterPreset(preset)}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        filterPreset === preset
                          ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          : "text-slate-400 hover:text-white bg-slate-800/40"
                      }`}
                    >
                      {preset === "ALL" && "All Players"}
                      {preset === "ENROLLED" && `Enrolled (${selectedIds.length})`}
                      {preset === "YOUTH" && "Youth Players"}
                      {preset === "ADULT" && "Adult Players"}
                      {preset === "UNASSIGNED" && "Not Enrolled"}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Candidates List with Checkbox Assignment */}
            <div className="border border-slate-800 rounded-2xl divide-y divide-slate-800/60 max-h-72 overflow-y-auto bg-slate-950/40">
              {filteredCandidates.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No players match your search or filter.
                </div>
              ) : (
                filteredCandidates.map((m) => {
                  const isChecked = selectedIds.includes(m.id);
                  const wasOriginallyEnrolled = initialEnrolledIds.includes(m.id);

                  // Pending change badges
                  const isPendingAssign = isChecked && !wasOriginallyEnrolled;
                  const isPendingUnassign = !isChecked && wasOriginallyEnrolled;

                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleMember(m.id)}
                      className={`p-3 flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-slate-800/50 transition-colors ${
                        isPendingUnassign
                          ? "bg-rose-500/10"
                          : isPendingAssign
                          ? "bg-emerald-500/10"
                          : isChecked
                          ? "bg-sky-500/10"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isPendingUnassign
                              ? "border-rose-500/60 bg-slate-900"
                              : isPendingAssign
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : isChecked
                              ? "bg-sky-500 border-sky-500 text-white"
                              : "border-slate-700 bg-slate-900"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <span>
                              {m.firstName} {m.lastName}
                            </span>
                            {m.isMinor && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Youth Player
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {m.email || "No direct email"}
                            {m.parentName && (
                              <span className="text-slate-500 ml-1.5">
                                · Guardian:{" "}
                                <strong className="text-slate-300">{m.parentName}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isPendingUnassign ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-lg">
                            <UserMinus className="w-3 h-3" />
                            Will be unassigned
                          </span>
                        ) : isPendingAssign ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                            <UserPlus className="w-3 h-3" />
                            Will be assigned
                          </span>
                        ) : wasOriginallyEnrolled && isChecked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Enrolled
                          </span>
                        ) : m.activeSubscriptions && m.activeSubscriptions.length > 0 ? (
                          <span className="text-[10px] text-slate-400">
                            Subscribed: {m.activeSubscriptions[0].planName}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">No active plan</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-400">
                <strong className="text-white">{selectedIds.length}</strong> player(s) enrolled
              </span>
              {newlyAssigned.length > 0 && (
                <span className="text-emerald-400 font-semibold">
                  +{newlyAssigned.length} new
                </span>
              )}
              {newlyUnassigned.length > 0 && (
                <span className="text-rose-400 font-semibold">
                  -{newlyUnassigned.length} removed
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !hasChanges}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  hasChanges
                    ? "bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {isPending ? (
                  <span>Saving Changes...</span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>
                      {newlyAssigned.length > 0 && newlyUnassigned.length > 0
                        ? `Save Changes (+${newlyAssigned.length}, -${newlyUnassigned.length})`
                        : newlyAssigned.length > 0
                        ? `Assign ${newlyAssigned.length} Player(s)`
                        : newlyUnassigned.length > 0
                        ? `Unassign ${newlyUnassigned.length} Player(s)`
                        : "Save Changes"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
