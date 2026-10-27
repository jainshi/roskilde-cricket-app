"use client";

import React, { useState, useTransition } from "react";
import { formatDanishKroner, dkkToOere, oereToDkk } from "@/modules/finance/domain/money-oere";
import { MembershipPlanWithStats } from "@/modules/finance/services/plan.service";
import {
  createMembershipPlanAction,
  updateMembershipPlanAction,
  toggleMembershipPlanActiveAction,
} from "@/modules/finance/actions/plan.actions";
import {
  CreditCard,
  Plus,
  Edit2,
  Users,
  CheckCircle2,
  AlertCircle,
  Tag,
  Calendar,
  Sparkles,
  Percent,
} from "lucide-react";

interface PlanManagerProps {
  initialPlans: MembershipPlanWithStats[];
}

export function PlanManager({ initialPlans }: PlanManagerProps) {
  const [plans, setPlans] = useState<MembershipPlanWithStats[]>(initialPlans);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlanWithStats | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<
    "SENIOR_COMPETITIVE" | "YOUTH_U15_U13" | "SOCIAL_PASSIVE" | "INDOOR_WINTER_ADDON"
  >("SENIOR_COMPETITIVE");
  const [billingCycle, setBillingCycle] = useState<"ANNUAL" | "SUMMER_OUTDOOR" | "WINTER_INDOOR">(
    "ANNUAL"
  );
  const [amountDkk, setAmountDkk] = useState("1800");
  const [siblingDiscountPercent, setSiblingDiscountPercent] = useState(25);
  const [description, setDescription] = useState("");

  const resetForm = () => {
    setCode("");
    setName("");
    setCategory("SENIOR_COMPETITIVE");
    setBillingCycle("ANNUAL");
    setAmountDkk("1800");
    setSiblingDiscountPercent(25);
    setDescription("");
    setEditingPlan(null);
    setErrorMsg(null);
  };

  const handleOpenEdit = (plan: MembershipPlanWithStats) => {
    setEditingPlan(plan);
    setName(plan.name);
    setAmountDkk((plan.amountOere / 100).toString());
    setSiblingDiscountPercent(plan.siblingDiscountPercent);
    setDescription(plan.description ?? "");
    setIsCreateOpen(true);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const dkkNum = parseFloat(amountDkk);
    if (isNaN(dkkNum) || dkkNum <= 0) {
      setErrorMsg("Please enter a valid price in Danish Kroner (DKK).");
      return;
    }
    const oere = dkkToOere(dkkNum);

    startTransition(async () => {
      if (editingPlan) {
        const res = await updateMembershipPlanAction({
          id: editingPlan.id,
          name,
          amountOere: oere,
          siblingDiscountPercent,
          description: description || undefined,
        });

        if (!res.success) {
          setErrorMsg(res.error || "Failed to update plan.");
        } else {
          setSuccessMsg(`Plan "${name}" updated successfully.`);
          setIsCreateOpen(false);
          resetForm();
          // Update local state
          setPlans((prev) =>
            prev.map((p) =>
              p.id === editingPlan.id
                ? {
                    ...p,
                    name,
                    amountOere: oere,
                    siblingDiscountPercent,
                    description,
                  }
                : p
            )
          );
        }
      } else {
        const res = await createMembershipPlanAction({
          code: code.trim().toUpperCase(),
          name,
          category,
          billingCycle,
          amountOere: oere,
          siblingDiscountPercent,
          description: description || undefined,
        });

        if (!res.success) {
          setErrorMsg(res.error || "Failed to create plan.");
        } else {
          setSuccessMsg(`Membership Plan "${name}" created successfully.`);
          setIsCreateOpen(false);
          resetForm();
          if (res.data) {
            setPlans((prev) => [...prev, { ...(res.data as any), _count: { subscriptions: 0 } }]);
          }
        }
      }
    });
  };

  const handleToggleActive = (plan: MembershipPlanWithStats) => {
    const nextStatus = !plan.isActive;
    startTransition(async () => {
      const res = await toggleMembershipPlanActiveAction(plan.id, nextStatus);
      if (res.success) {
        setPlans((prev) =>
          prev.map((p) => (p.id === plan.id ? { ...p, isActive: nextStatus } : p))
        );
      } else {
        setErrorMsg(res.error || "Failed to toggle status.");
      }
    });
  };

  const categoryLabels: Record<string, { label: string; badge: string }> = {
    SENIOR_COMPETITIVE: {
      label: "Senior Competitive",
      badge: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    },
    YOUTH_U15_U13: {
      label: "Youth Junior",
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
    SOCIAL_PASSIVE: {
      label: "Social & Supporter",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    },
    INDOOR_WINTER_ADDON: {
      label: "Winter Indoor Add-On",
      badge: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    },
  };

  const cycleLabels: Record<string, string> = {
    ANNUAL: "Full Year (Apr 1 – Mar 31)",
    SUMMER_OUTDOOR: "Summer Outdoor (Apr 1 – Sep 30)",
    WINTER_INDOOR: "Winter Indoor (Oct 1 – Mar 31)",
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
              Membership Plans &amp; Rates
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure club subscription tiers, integer øre rates, and automated sibling discounts.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Membership Plan</span>
        </button>
      </div>

      {/* Alerts */}
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

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((plan) => {
          const catInfo = categoryLabels[plan.category] ?? {
            label: plan.category,
            badge: "bg-slate-800 text-slate-300 border-slate-700",
          };

          return (
            <div
              key={plan.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                plan.isActive
                  ? "bg-slate-900/80 border-slate-800 hover:border-slate-700/80 shadow-lg shadow-slate-950/40"
                  : "bg-slate-950/40 border-slate-900 opacity-60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${catInfo.badge}`}
                  >
                    {catInfo.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        plan.isActive ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
                      }`}
                    />
                    <span className="text-[11px] font-medium text-slate-400">
                      {plan.isActive ? "Active" : "Archived"}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {plan.name}
                  </h3>
                  <div className="text-right shrink-0">
                    <span className="text-xl sm:text-2xl font-black text-sky-400 font-mono">
                      {formatDanishKroner(plan.amountOere)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-2 line-clamp-2 min-h-[32px]">
                  {plan.description || "Standard club seasonal membership tier."}
                </p>

                {/* Metadata pills */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Cycle:
                    </span>
                    <span className="font-medium text-slate-200">
                      {cycleLabels[plan.billingCycle] || plan.billingCycle}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-slate-500" />
                      Sibling Discount:
                    </span>
                    <span className="font-semibold text-emerald-400">
                      {plan.siblingDiscountPercent > 0
                        ? `${plan.siblingDiscountPercent}% on 2nd+ child`
                        : "None (0%)"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      Enrolled:
                    </span>
                    <span className="font-mono text-slate-200 font-bold">
                      {plan._count.subscriptions} members
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-500" />
                      Code:
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">{plan.code}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleToggleActive(plan)}
                  disabled={isPending}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-medium transition-colors cursor-pointer"
                >
                  {plan.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => handleOpenEdit(plan)}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-sky-400 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Rate</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Plan Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                <span>{editingPlan ? "Edit Membership Plan" : "Create Membership Plan"}</span>
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
              {!editingPlan && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Plan Code <span className="text-sky-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. YOUTH_U11_2026"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Unique uppercase identifier for billing imports and seasonal batches.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Plan Display Title <span className="text-sky-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Youth U11 Micro Cricket"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {!editingPlan && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="SENIOR_COMPETITIVE">Senior Competitive</option>
                      <option value="YOUTH_U15_U13">Youth U15 / U13</option>
                      <option value="SOCIAL_PASSIVE">Social &amp; Passive</option>
                      <option value="INDOOR_WINTER_ADDON">Indoor Winter Add-On</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Billing Cycle</label>
                    <select
                      value={billingCycle}
                      onChange={(e) => setBillingCycle(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="ANNUAL">Annual (Apr 1 – Mar 31)</option>
                      <option value="SUMMER_OUTDOOR">Summer (Apr 1 – Sep 30)</option>
                      <option value="WINTER_INDOOR">Winter (Oct 1 – Mar 31)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Standard Fee (DKK) <span className="text-sky-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amountDkk}
                      onChange={(e) => setAmountDkk(e.target.value)}
                      placeholder="1800.00"
                      className="w-full pl-3.5 pr-12 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                    <span className="absolute right-3.5 top-2.5 text-slate-400 text-xs font-bold">
                      kr.
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Converted automatically to integer øre (zero floating-point).
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-medium">Sibling Discount</label>
                    <span className="text-emerald-400 font-bold">{siblingDiscountPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={siblingDiscountPercent}
                    onChange={(e) => setSiblingDiscountPercent(parseInt(e.target.value, 10))}
                    className="w-full accent-sky-500 mt-2 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Default 25% discount applied on 2nd and subsequent youth.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Included benefits, venue access, match balls, jersey loans..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white font-medium text-xs sm:text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm shadow-lg shadow-sky-500/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPending ? "Saving..." : editingPlan ? "Save Changes" : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
