"use client";

import React, { useState } from "react";
import { formatDanishKroner } from "@/modules/finance/domain/money-oere";
import {
  FamilyBillingSummary,
  InvoiceWithRelations,
} from "@/modules/finance/services/invoice.service";
import { InvoiceCard } from "./invoice-card";
import {
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Sparkles,
  User,
  Filter,
} from "lucide-react";

interface FamilyBillingViewProps {
  summary: FamilyBillingSummary;
  onPayInvoice?: (invoice: InvoiceWithRelations) => void;
}

export function FamilyBillingView({ summary, onPayInvoice }: FamilyBillingViewProps) {
  const [selectedTab, setSelectedTab] = useState<string>("ALL");
  const isMultiChild = summary.childrenBreakdown.length > 0;

  // Filter invoices based on selected tab
  let displayedInvoices = summary.invoices;
  if (selectedTab !== "ALL") {
    displayedInvoices = summary.invoices.filter(
      (inv) => inv.memberProfileId === selectedTab
    );
  }

  return (
    <div className="space-y-6">
      {/* Household Financial Rollup Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/50 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-sky-400">
              <Users className="w-4 h-4" />
              <span>Consolidated Household Statement</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
              {summary.parentName}&apos;s Family Billing
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Unified financial overview aggregating youth player subscriptions and club charges.
            </p>
          </div>

          {/* Balance Due Display */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-right shrink-0">
            <span className="text-xs text-slate-400 font-medium block">
              Total Household Balance Due:
            </span>
            <span
              className={`text-2xl sm:text-3xl font-black font-mono ${
                summary.balanceHouseholdOere > 0 ? "text-sky-400" : "text-emerald-400"
              }`}
            >
              {formatDanishKroner(summary.balanceHouseholdOere)}
            </span>
          </div>
        </div>

        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Billed</p>
              <p className="text-sm font-bold text-white font-mono">
                {formatDanishKroner(summary.totalHouseholdOere)}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Settled</p>
              <p className="text-sm font-bold text-emerald-400 font-mono">
                {formatDanishKroner(summary.paidHouseholdOere)}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${
                summary.overdueInvoiceCount > 0
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                  : "bg-slate-800/60 border-slate-700 text-slate-400"
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Overdue Invoices</p>
              <p
                className={`text-sm font-bold font-mono ${
                  summary.overdueInvoiceCount > 0 ? "text-rose-400" : "text-slate-300"
                }`}
              >
                {summary.overdueInvoiceCount} {summary.overdueInvoiceCount === 1 ? "invoice" : "invoices"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sibling Tabs if multiple children */}
      {isMultiChild && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 touch-pan-x">
          <button
            onClick={() => setSelectedTab("ALL")}
            className={`min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedTab === "ALL"
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            All Household ({summary.invoices.length})
          </button>

          {summary.childrenBreakdown.map((child) => (
            <button
              key={child.childId}
              onClick={() => setSelectedTab(child.childId)}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                selectedTab === child.childId
                  ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                  : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{child.childName}</span>
              <span className="font-mono text-[11px] opacity-80">
                ({formatDanishKroner(child.balanceOere)})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Invoices List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-sky-400" />
            <span>Invoices &amp; Statements ({displayedInvoices.length})</span>
          </h3>
        </div>

        {displayedInvoices.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800/60 text-slate-400 text-xs sm:text-sm">
            No invoices found for this selection.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedInvoices.map((inv) => (
              <InvoiceCard
                key={inv.id}
                invoice={inv}
                onPayClick={onPayInvoice}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
