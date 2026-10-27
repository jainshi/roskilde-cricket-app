"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Search,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CreditCard,
  FileText,
  Filter,
} from "lucide-react";
import { formatDanishKroner } from "@/modules/finance/domain/money-oere";
import { assignPlanToMembersAction } from "@/modules/finance/actions/subscription.actions";

export interface CandidateMemberForPlan {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  dateOfBirth: Date | null;
  isMinor: boolean;
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
  const [filterPreset, setFilterPreset] = useState<"ALL" | "YOUTH" | "ADULT" | "UNASSIGNED">("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [seasonYear, setSeasonYear] = useState(2026);
  const [generateInvoices, setGenerateInvoices] = useState(true);
  const [dueDateDays, setDueDateDays] = useState(30);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter candidates
  const filteredCandidates = candidateMembers.filter((m) => {
    const hasActiveSub = m.activeSubscriptions?.some(
      (s) => s.planId === plan.id && s.seasonYear === seasonYear
    );

    if (filterPreset === "YOUTH" && !m.isMinor) return false;
    if (filterPreset === "ADULT" && m.isMinor) return false;
    if (filterPreset === "UNASSIGNED" && hasActiveSub) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = `${m.firstName} ${m.lastName}`.toLowerCase().includes(q);
      const matchEmail = m.email?.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
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
    setErrorMsg(null);
    setSuccessMsg(null);

    if (selectedIds.length === 0) {
      setErrorMsg("Please select at least one member to assign to this plan.");
      return;
    }

    startTransition(async () => {
      const res = await assignPlanToMembersAction({
        planId: plan.id,
        memberProfileIds: selectedIds,
        seasonYear,
        generateInvoices,
        dueDateDays,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to assign plan to selected members.");
      } else {
        const data = res.data as { enrolledCount: number; invoiceCount: number };
        setSuccessMsg(
          `Successfully assigned ${data.enrolledCount} member(s) to ${plan.name} and generated ${data.invoiceCount} invoice(s)!`
        );
        setSelectedIds([]);
        router.refresh();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Assign Plan to Members</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {formatDanishKroner(plan.amountOere)}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Enroll members into <strong className="text-slate-300">{plan.name}</strong> and issue invoices.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
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
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono"
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
                  <span className="text-slate-300">Auto-issue invoice (RCC-INV-YYYY-####)</span>
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
                    placeholder="Search by member name or email..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  {filteredCandidates.every((c) => selectedIds.includes(c.id)) && filteredCandidates.length > 0
                    ? "Deselect All Filtered"
                    : `Select All (${filteredCandidates.length})`}
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 pt-1 text-xs">
                {(["ALL", "YOUTH", "ADULT", "UNASSIGNED"] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFilterPreset(preset)}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      filterPreset === preset
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                        : "text-slate-400 hover:text-white bg-slate-800/40"
                    }`}
                  >
                    {preset === "ALL" && "All Members"}
                    {preset === "YOUTH" && "Youth Minor"}
                    {preset === "ADULT" && "Adult"}
                    {preset === "UNASSIGNED" && "Not Enrolled"}
                  </button>
                ))}
              </div>
            </div>

            {/* Candidates List */}
            <div className="border border-slate-800 rounded-2xl divide-y divide-slate-800/60 max-h-64 overflow-y-auto bg-slate-950/40">
              {filteredCandidates.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No members match your search or filter.
                </div>
              ) : (
                filteredCandidates.map((m) => {
                  const isSelected = selectedIds.includes(m.id);
                  const isEnrolledInPlan = m.activeSubscriptions?.some(
                    (s) => s.planId === plan.id && s.seasonYear === seasonYear
                  );

                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleMember(m.id)}
                      className={`p-3 flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-slate-800/50 transition-colors ${
                        isSelected ? "bg-sky-500/10" : ""
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
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <span>{m.firstName} {m.lastName}</span>
                            {m.isMinor && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Youth
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {m.email || "No email"}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isEnrolledInPlan ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Already Enrolled
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
            <span className="text-xs text-slate-400 font-mono">
              <strong className="text-white">{selectedIds.length}</strong> member(s) selected
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || selectedIds.length === 0}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/20 cursor-pointer flex items-center gap-1.5"
              >
                {isPending ? (
                  <span>Applying...</span>
                ) : (
                  <>
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Apply Plan ({selectedIds.length})</span>
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
