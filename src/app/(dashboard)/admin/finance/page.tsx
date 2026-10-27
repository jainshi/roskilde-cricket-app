import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getReconciliationQueue } from "@/modules/finance/services/reconciliation.service";
import { TreasurerReconciliation } from "@/components/finance/treasurer-reconciliation";
import { CreditCard, Tag, ShieldCheck, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Finance & Reconciliation | Roskilde Cricket Club",
  description: "Administrative console for payment verification, overdue dues, fee waivers, and club billing reconciliation.",
};

export default async function AdminFinancePage() {
  const session = await requireActivatedSession();
  if (!session.roles.includes(Role.ADMIN)) {
    redirect("/dashboard");
  }

  const {
    pendingTransactions,
    overdueInvoices,
    recentVerifiedTransactions,
  } = await getReconciliationQueue();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Navigation / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-sky-400 font-mono tracking-wider uppercase mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administration · Finance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Treasurer Reconciliation &amp; Finance
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Reconcile incoming bank and MobilePay deposits, manage overdue dues, and maintain Danish bookkeeping compliance.
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/finance/reports"
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs sm:text-sm font-semibold text-emerald-300 flex items-center gap-2 transition-colors"
          >
            <span>Bogføringsloven Reports</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
          </Link>
          <Link
            href="/admin/finance/plans"
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-300 flex items-center gap-2 transition-colors"
          >
            <Tag className="w-4 h-4 text-sky-400" />
            <span>Membership Plans &amp; Rates</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </Link>
        </div>
      </div>

      {/* Main Reconciliation Console */}
      <TreasurerReconciliation
        pendingTransactions={pendingTransactions as any}
        overdueInvoices={overdueInvoices as any}
        recentVerifiedTransactions={recentVerifiedTransactions as any}
      />
    </div>
  );
}
