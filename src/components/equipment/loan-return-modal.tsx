"use client";

import React, { useState, useTransition } from "react";
import { dkkToOere, formatDanishKroner } from "@/modules/finance/domain/money-oere";
import { createAdHocInvoiceAction } from "@/modules/finance/actions/invoice.actions";
import {
  Wrench,
  AlertTriangle,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Package,
  User,
} from "lucide-react";

interface EquipmentFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: {
    id: string;
    borrowerProfile: {
      id: string;
      firstName: string;
      lastName: string;
    };
    equipmentItem: {
      id: string;
      name: string;
      assetTag: string | null;
    };
  };
  damageReportId?: string;
  onSuccess?: (invoiceId: string) => void;
}

export function EquipmentFeeModal({
  isOpen,
  onClose,
  loan,
  damageReportId,
  onSuccess,
}: EquipmentFeeModalProps) {
  const [feeTitle, setFeeTitle] = useState(
    `Equipment Damage/Replacement: ${loan.equipmentItem.name}`
  );
  const [amountDkk, setAmountDkk] = useState("350.00");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const dkkNum = parseFloat(amountDkk);
    if (isNaN(dkkNum) || dkkNum <= 0) {
      setErrorMsg("Please enter a valid fee amount in DKK.");
      return;
    }

    const unitPriceOere = dkkToOere(dkkNum);
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days due

    startTransition(async () => {
      const res = await createAdHocInvoiceAction({
        memberProfileId: loan.borrowerProfile.id,
        category: "EQUIPMENT_CHARGE",
        title: feeTitle,
        lineItems: [
          {
            description: feeTitle,
            quantity: 1,
            unitPriceOere,
          },
        ],
        dueDate,
        notes: notes || undefined,
        linkedEquipmentLoanId: loan.id,
        linkedDamageReportId: damageReportId,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to create equipment fee invoice.");
      } else {
        setSuccessMsg("Equipment fee invoice created and dispatched to member/parents!");
        setTimeout(() => {
          onSuccess?.((res.data as any)?.id);
          onClose();
        }, 1000);
      }
    });
  };

  const borrowerName = `${loan.borrowerProfile.firstName} ${loan.borrowerProfile.lastName}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">
              Issue Equipment Incident Fee
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* Loan Context Pill */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <User className="w-3.5 h-3.5" /> Borrower:
            </span>
            <span className="font-semibold text-white">{borrowerName}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Package className="w-3.5 h-3.5" /> Item:
            </span>
            <span className="font-medium text-slate-200">
              {loan.equipmentItem.name}{" "}
              {loan.equipmentItem.assetTag ? `(#${loan.equipmentItem.assetTag})` : ""}
            </span>
          </div>
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
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Invoice Title / Item Description <span className="text-sky-400">*</span>
            </label>
            <input
              type="text"
              required
              value={feeTitle}
              onChange={(e) => setFeeTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Charge Amount (DKK) <span className="text-sky-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                value={amountDkk}
                onChange={(e) => setAmountDkk(e.target.value)}
                placeholder="350.00"
                className="w-full pl-3.5 pr-12 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-sky-500"
              />
              <span className="absolute right-3.5 top-2.5 text-slate-400 text-xs font-bold">
                kr.
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Converted to integer øre and itemized on the member&apos;s statement.
            </p>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Incident Notes &amp; Justification
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Broken willow handle during match, replacement cost per club bylaws."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

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
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              <span>{isPending ? "Generating..." : "Generate Invoice"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
