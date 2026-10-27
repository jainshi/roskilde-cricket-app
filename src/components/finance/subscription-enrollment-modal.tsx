"use client";

import React, { useState, useTransition } from "react";
import { formatDanishKroner, dkkToOere } from "@/modules/finance/domain/money-oere";
import { MembershipPlanWithStats } from "@/modules/finance/services/plan.service";
import {
  enrollMemberSubscriptionAction,
  overrideSubscriptionDiscountAction,
} from "@/modules/finance/actions/subscription.actions";
import {
  Sparkles,
  User,
  Shield,
  CreditCard,
  Percent,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export interface MemberOption {
  id: string;
  name: string;
  isMinor: boolean;
  parentName?: string;
}

interface SubscriptionEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: MembershipPlanWithStats[];
  members: MemberOption[];
  isAdmin: boolean;
  onSuccess?: () => void;
}

export function SubscriptionEnrollmentModal({
  isOpen,
  onClose,
  plans,
  members,
  isAdmin,
  onSuccess,
}: SubscriptionEnrollmentModalProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id ?? "");
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id ?? "");
  const [seasonYear, setSeasonYear] = useState<number>(new Date().getFullYear());
  const [applyOverride, setApplyOverride] = useState(false);
  const [manualDiscountDkk, setManualDiscountDkk] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const selectedMember = members.find((m) => m.id === selectedMemberId);

  // Computed preview
  const basePriceOere = selectedPlan?.amountOere ?? 0;
  let estimatedDiscountOere = 0;
  let discountNote = "";

  if (applyOverride && manualDiscountDkk) {
    const overrideDkk = parseFloat(manualDiscountDkk);
    if (!isNaN(overrideDkk) && overrideDkk > 0) {
      estimatedDiscountOere = Math.min(basePriceOere, dkkToOere(overrideDkk));
      discountNote = "Treasurer Custom Override";
    }
  } else if (selectedMember?.isMinor && (selectedPlan?.siblingDiscountPercent ?? 0) > 0) {
    discountNote = `Eligible for automatic ${selectedPlan?.siblingDiscountPercent}% sibling discount if linked sibling is enrolled`;
  }

  const finalEstimatedOere = Math.max(0, basePriceOere - estimatedDiscountOere);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    let manualDiscountOere: number | undefined = undefined;
    if (applyOverride && manualDiscountDkk) {
      const dkkVal = parseFloat(manualDiscountDkk);
      if (isNaN(dkkVal) || dkkVal < 0) {
        setErrorMsg("Please specify a valid discount amount in DKK.");
        return;
      }
      manualDiscountOere = dkkToOere(dkkVal);
      if (!overrideReason.trim()) {
        setErrorMsg("A documented reason is mandatory when applying a fee discount override.");
        return;
      }
    }

    startTransition(async () => {
      const res = await enrollMemberSubscriptionAction({
        memberProfileId: selectedMemberId,
        planId: selectedPlanId,
        seasonYear,
        manualDiscountOere,
        overrideReason: overrideReason.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to enroll subscription.");
      } else {
        setSuccessMsg("Subscription enrolled successfully!");
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 800);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-400" />
            <span>Enroll Member Subscription</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* Member Selection */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Beneficiary Member <span className="text-sky-400">*</span>
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.isMinor ? `(Youth · ${m.parentName ? `Parent: ${m.parentName}` : "Minor"})` : "(Adult Player)"}
                </option>
              ))}
            </select>
          </div>

          {/* Plan Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Membership Plan <span className="text-sky-400">*</span>
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatDanishKroner(p.amountOere)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Season Year <span className="text-sky-400">*</span>
              </label>
              <select
                value={seasonYear}
                onChange={(e) => setSeasonYear(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
              >
                <option value={2026}>2026 Season</option>
                <option value={2027}>2027 Season</option>
                <option value={2025}>2025 Season</option>
              </select>
            </div>
          </div>

          {/* Pricing & Sibling Breakdown Preview */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>Standard Tier Fee:</span>
              <span className="font-mono text-slate-200">
                {formatDanishKroner(basePriceOere)}
              </span>
            </div>

            {discountNote && (
              <div className="flex items-center justify-between text-emerald-400 text-xs">
                <span className="flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5" />
                  {discountNote}
                </span>
                {estimatedDiscountOere > 0 && (
                  <span className="font-mono font-bold">
                    -{formatDanishKroner(estimatedDiscountOere)}
                  </span>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-white">
              <span>Estimated Seasonal Fee:</span>
              <span className="text-lg font-black text-sky-400 font-mono">
                {formatDanishKroner(finalEstimatedOere)}
              </span>
            </div>
          </div>

          {/* Admin Override Section */}
          {isAdmin && (
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyOverride}
                  onChange={(e) => setApplyOverride(e.target.checked)}
                  className="rounded border-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <span className="text-xs font-semibold text-indigo-300">
                  Treasurer / Admin Manual Fee Override
                </span>
              </label>

              {applyOverride && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      Manual Discount Amount (DKK)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 500.00"
                      value={manualDiscountDkk}
                      onChange={(e) => setManualDiscountDkk(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">
                      Documented Override Reason <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Club volunteer subsidy / hardship scholarship"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white font-medium text-xs sm:text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm shadow-lg shadow-sky-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isPending ? "Enrolling..." : "Confirm Enrollment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
