"use client";

import React from "react";
import Link from "next/link";
import { formatDanishKroner } from "@/modules/finance/domain/money-oere";
import { InvoiceWithRelations } from "@/modules/finance/services/invoice.service";
import {
  CreditCard,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  ArrowRight,
  Package,
  Trophy,
} from "lucide-react";

interface InvoiceCardProps {
  invoice: InvoiceWithRelations;
  onPayClick?: (invoice: InvoiceWithRelations) => void;
}

export function InvoiceCard({ invoice, onPayClick }: InvoiceCardProps) {
  const isSettled = invoice.status === "PAID";
  const isOverdue = invoice.status === "OVERDUE";
  const isPendingVerification = invoice.status === "PENDING_VERIFICATION";
  const isPartiallyPaid = invoice.status === "PARTIALLY_PAID";

  const statusConfig: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
    OPEN: {
      label: "Open / Due",
      badge: "bg-sky-500/15 text-sky-400 border-sky-500/30",
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    PENDING_VERIFICATION: {
      label: "Payment Reported",
      badge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      icon: <Clock className="w-3.5 h-3.5 animate-pulse" />,
    },
    PARTIALLY_PAID: {
      label: "Partially Paid",
      badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    PAID: {
      label: "Settled / Paid",
      badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    OVERDUE: {
      label: "Overdue",
      badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    WAIVED: {
      label: "Fee Waived",
      badge: "bg-slate-800 text-slate-400 border-slate-700",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    CANCELLED: {
      label: "Cancelled",
      badge: "bg-slate-900 text-slate-500 border-slate-800",
      icon: null,
    },
  };

  const statusInfo = statusConfig[invoice.status] || {
    label: invoice.status,
    badge: "bg-slate-800 text-slate-300 border-slate-700",
    icon: null,
  };

  const categoryLabels: Record<string, string> = {
    MEMBERSHIP_DUES: "Membership Dues",
    EVENT_FEE: "Tournament / Match Fee",
    EQUIPMENT_CHARGE: "Equipment Incident Fee",
    AD_HOC: "Ad-Hoc Fee",
  };

  const remainingBalanceOere = Math.max(0, invoice.totalOere - invoice.paidOere);
  const beneficiaryName = `${invoice.memberProfile.firstName} ${invoice.memberProfile.lastName}`;
  const billedToName = `${invoice.billedToProfile.firstName} ${invoice.billedToProfile.lastName}`;
  const isParentBilled = invoice.billedToProfileId !== invoice.memberProfileId;

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col justify-between ${
        isOverdue
          ? "bg-rose-950/20 border-rose-900/60 shadow-lg shadow-rose-950/30"
          : isSettled
          ? "bg-slate-900/60 border-slate-800/80"
          : "bg-slate-900 border-slate-800 shadow-xl shadow-slate-950/40"
      }`}
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-sky-400 tracking-wider">
              {invoice.invoiceNumber}
            </span>
            <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800">
              {categoryLabels[invoice.category] || invoice.category}
            </span>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.badge}`}
          >
            {statusInfo.icon}
            <span>{statusInfo.label}</span>
          </span>
        </div>

        {/* Player and Debtor Info */}
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              <span>{beneficiaryName}</span>
            </h4>
            {isParentBilled && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                Billed to guardian: <span className="text-slate-300 font-medium">{billedToName}</span>
              </p>
            )}
          </div>

          {/* Amount Due Display */}
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-black text-white font-mono">
              {formatDanishKroner(invoice.totalOere)}
            </span>
            {isPartiallyPaid && (
              <p className="text-[11px] text-amber-400 font-mono">
                Remaining: {formatDanishKroner(remainingBalanceOere)}
              </p>
            )}
          </div>
        </div>

        {/* Itemized Line Items */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
          {invoice.lineItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-xs text-slate-300"
            >
              <span className="text-slate-400 line-clamp-1">
                {item.quantity > 1 ? `${item.quantity}x ` : ""}
                {item.description}
              </span>
              <span
                className={`font-mono text-right shrink-0 ml-2 ${
                  item.totalOere < 0 ? "text-emerald-400 font-semibold" : "text-slate-200"
                }`}
              >
                {formatDanishKroner(item.totalOere, { showPlusSign: false })}
              </span>
            </div>
          ))}
        </div>

        {/* Cross-Module Linked Records */}
        {invoice.linkedEquipmentLoan && (
          <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              Linked gear: <strong>{invoice.linkedEquipmentLoan.equipmentItem.name}</strong>{" "}
              {invoice.linkedEquipmentLoan.equipmentItem.assetTag && (
                <span className="font-mono text-slate-400">
                  (Tag: {invoice.linkedEquipmentLoan.equipmentItem.assetTag})
                </span>
              )}
            </span>
          </div>
        )}

        {invoice.linkedScheduledEvent && (
          <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              Event: <strong>{invoice.linkedScheduledEvent.title}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Card Footer: Due Date & Action */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-mono">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>Due: {new Date(invoice.dueDate).toLocaleDateString("da-DK")}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Printable Receipt Link */}
          <Link
            href={`/billing/${invoice.id}`}
            className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Receipt</span>
          </Link>

          {/* Pay Button */}
          {!isSettled && invoice.status !== "WAIVED" && invoice.status !== "CANCELLED" && (
            <button
              onClick={() => onPayClick?.(invoice)}
              className="min-h-[38px] px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-white font-semibold flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{isPendingVerification ? "View Payment" : "Pay Now"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
