"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  requestLoanExtensionAction,
} from "@/modules/inventory/actions/extension.actions";
import {
  reportDamageAction,
} from "@/modules/inventory/actions/damage.actions";
import { LoanStatus, ExtensionStatus } from "@prisma/client";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
  Shield,
  Layers,
  ArrowRight,
  Send,
  X,
  FileQuestion,
  HelpCircle,
  AlertCircle,
} from "lucide-react";

export interface MemberLoanData {
  id: string;
  equipmentItemId: string;
  quantity: number;
  status: LoanStatus;
  checkedOutAt: Date;
  expectedReturnAt: Date;
  checkoutCondition: string;
  checkoutNotes: string | null;
  returnedAt: Date | null;
  returnCondition: string | null;
  isOverdue: boolean;
  purchasePriceFormatted: string;
  equipmentItem: {
    id: string;
    name: string;
    assetTag: string | null;
    category: string;
    condition: string;
    trackingType: string;
    storageLocation: string;
  };
  pendingExtension?: {
    id: string;
    proposedReturnAt: Date;
    reason: string;
    status: ExtensionStatus;
  } | null;
}

export function MyGearCard({
  loan,
  isParentViewingChild,
  childName,
}: {
  loan: MemberLoanData;
  isParentViewingChild?: boolean;
  childName?: string;
}) {
  const router = useRouter();

  // Extension Modal State
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [proposedDate, setProposedDate] = useState("");
  const [extensionReason, setExtensionReason] = useState("");
  const [extensionSubmitting, setExtensionSubmitting] = useState(false);
  const [extensionError, setExtensionError] = useState("");

  // Damage Report Modal State
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [severity, setSeverity] = useState<"MINOR" | "MAJOR" | "BEYOND_REPAIR" | "LOST">("MINOR");
  const [damageDescription, setDamageDescription] = useState("");
  const [damageSubmitting, setDamageSubmitting] = useState(false);
  const [damageError, setDamageError] = useState("");
  const [damageSuccess, setDamageSuccess] = useState(false);

  // Handle extension submission
  const handleExtensionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExtensionError("");
    setExtensionSubmitting(true);

    try {
      const res = await requestLoanExtensionAction({
        loanId: loan.id,
        proposedReturnAt: new Date(proposedDate),
        reason: extensionReason,
      });

      if (!res.success) {
        setExtensionError(res.error || "Failed to submit extension request.");
        setExtensionSubmitting(false);
        return;
      }

      setShowExtensionModal(false);
      setProposedDate("");
      setExtensionReason("");
      router.refresh();
    } catch (err: any) {
      setExtensionError(err.message || "An unexpected error occurred.");
    } finally {
      setExtensionSubmitting(false);
    }
  };

  // Handle damage report submission
  const handleDamageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDamageError("");
    setDamageSubmitting(true);

    try {
      const res = await reportDamageAction({
        equipmentItemId: loan.equipmentItemId,
        loanId: loan.id,
        severity,
        description: damageDescription,
      });

      if (!res.success) {
        setDamageError(res.error || "Failed to submit damage report.");
        setDamageSubmitting(false);
        return;
      }

      setDamageSuccess(true);
      setTimeout(() => {
        setShowDamageModal(false);
        setDamageSuccess(false);
        setDamageDescription("");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setDamageError(err.message || "An unexpected error occurred.");
    } finally {
      setDamageSubmitting(false);
    }
  };

  const isClosed = loan.status === LoanStatus.RETURNED || loan.returnedAt !== null;

  return (
    <>
      <div
        className={`p-5 rounded-xl border transition-all ${
          loan.isOverdue
            ? "bg-rose-950/20 border-rose-800/50 shadow-lg shadow-rose-950/20"
            : isClosed
            ? "bg-slate-900/40 border-slate-800/60 opacity-80"
            : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-lg border mt-0.5 ${
                loan.isOverdue
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  : isClosed
                  ? "bg-slate-800 text-slate-400 border-slate-700"
                  : "bg-sky-500/10 border-sky-500/20 text-sky-400"
              }`}
            >
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-white tracking-tight">
                  {loan.equipmentItem.name}
                </h3>
                {loan.equipmentItem.assetTag ? (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {loan.equipmentItem.assetTag}
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Bulk ({loan.quantity} {loan.quantity > 1 ? "units" : "unit"})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Category: <span className="text-slate-300">{loan.equipmentItem.category}</span> • Shed:{" "}
                <span className="text-slate-300">{loan.equipmentItem.storageLocation}</span>
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div>
            {loan.isOverdue ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                Overdue Return
              </span>
            ) : isClosed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Returned ({new Date(loan.returnedAt!).toLocaleDateString("da-DK")})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <Clock className="w-3.5 h-3.5" />
                Active Loan
              </span>
            )}
          </div>
        </div>

        {/* Loan Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Checked Out</span>
            <span className="text-white font-medium">
              {new Date(loan.checkedOutAt).toLocaleDateString("da-DK")}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Expected Return</span>
            <span
              className={`font-medium ${
                loan.isOverdue ? "text-rose-400 font-bold" : "text-white"
              }`}
            >
              {new Date(loan.expectedReturnAt).toLocaleDateString("da-DK")} 23:59
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Initial Condition</span>
            <span className="text-slate-200 capitalize">{loan.checkoutCondition.toLowerCase()}</span>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Club Value Ref</span>
            <span className="text-slate-300 font-mono">{loan.purchasePriceFormatted}</span>
          </div>
        </div>

        {/* Pending Extension Notice */}
        {loan.pendingExtension && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-950/20 border border-amber-800/30 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Extension Request Pending:</strong> Proposed new return deadline{" "}
                <span className="font-semibold text-white">
                  {new Date(loan.pendingExtension.proposedReturnAt).toLocaleDateString("da-DK")}
                </span>{" "}
                (Awaiting coach review).
              </span>
            </div>
            <span className="px-2 py-0.5 text-[11px] font-mono bg-amber-900/40 rounded border border-amber-700/40 uppercase">
              Pending
            </span>
          </div>
        )}

        {/* Action Buttons (For active loans only) */}
        {!isClosed && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 mt-4 pt-2 border-t border-slate-800/60">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDamageModal(true)}
              className="text-xs border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center justify-center gap-1.5 min-h-[38px]"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Report Damage / Loss</span>
            </Button>

            <Button
              size="sm"
              disabled={Boolean(loan.pendingExtension)}
              onClick={() => setShowExtensionModal(true)}
              className="text-xs bg-sky-600 hover:bg-sky-500 text-white font-medium flex items-center justify-center gap-1.5 min-h-[38px]"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{loan.pendingExtension ? "Extension Requested" : "Request Extension"}</span>
            </Button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 1. Request Extension Modal Dialog */}
      {/* ========================================================= */}
      {showExtensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-sky-500/10 text-sky-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-white">Request Return Extension</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExtensionModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Propose a new return date for <strong>{loan.equipmentItem.name}</strong>. Coaches will
              review your request within 24 hours.
            </p>

            {extensionError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{extensionError}</span>
              </div>
            )}

            <form onSubmit={handleExtensionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Proposed New Return Date *
                </label>
                <Input
                  type="date"
                  required
                  min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Reason for Extension *
                </label>
                <textarea
                  rows={3}
                  required
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="e.g. Scheduled for upcoming weekend away match or weekend net practice..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowExtensionModal(false)}
                  className="border-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={extensionSubmitting}
                  className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium"
                >
                  {extensionSubmitting ? "Submitting..." : "Submit Extension Request"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. Report Damage / Loss Modal Dialog */}
      {/* ========================================================= */}
      {showDamageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-white">Report Equipment Damage / Loss</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDamageModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Notify club coaches of wear, broken parts, or gear lost during cricket activities.
            </p>

            {damageSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Damage report logged successfully. Coaches have been notified.</span>
              </div>
            )}

            {damageError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{damageError}</span>
              </div>
            )}

            <form onSubmit={handleDamageSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Damage Severity *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "MINOR", label: "Minor", desc: "Surface wear / light tears" },
                    { value: "MAJOR", label: "Major", desc: "Handle crack / strap torn" },
                    { value: "BEYOND_REPAIR", label: "Irreparable", desc: "Bat broken / destroyed" },
                    { value: "LOST", label: "Lost Gear", desc: "Left at pitch / missing" },
                  ].map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSeverity(s.value as any)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        severity === s.value
                          ? "bg-amber-950/40 border-amber-600 text-amber-200"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <span className="font-semibold block text-white">{s.label}</span>
                      <span className="text-[10px] text-slate-400 block">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Incident Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={damageDescription}
                  onChange={(e) => setDamageDescription(e.target.value)}
                  placeholder="Describe where, when, and how the gear was damaged or lost..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Club Reference Value:</span>
                <span className="font-mono text-slate-200">{loan.purchasePriceFormatted}</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDamageModal(false)}
                  className="border-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={damageSubmitting}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium"
                >
                  {damageSubmitting ? "Submitting..." : "Submit Incident Report"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
