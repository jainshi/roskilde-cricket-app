import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { Role } from "@prisma/client";
import { getBogfoeringslovenLedger } from "@/modules/finance/services/bogfoeringsloven.service";
import { BogfoeringslovenTable } from "@/components/finance/bogfoeringsloven-table";
import { ArrowLeft, FileSpreadsheet, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Statutory Accounting Reports | Roskilde Cricket Club",
  description: "Danish Bookkeeping Act (Bogføringsloven § 10) 5-year statutory financial ledger and CSV exports.",
};

export default async function AdminFinanceReportsPage() {
  const session = await requireActivatedSession();
  if (!session.roles.includes(Role.ADMIN)) {
    redirect("/dashboard");
  }

  const currentYear = new Date().getFullYear();
  const ledgerSummary = await getBogfoeringslovenLedger(currentYear);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Navigation / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono tracking-wider uppercase mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administration · Financial Compliance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Bogføringsloven Statutory Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Official Danish accounting exports retaining complete statutory ledger lines for audit inspections.
          </p>
        </div>

        {/* Back Link */}
        <Link
          href="/admin/finance"
          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-300 flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400" />
          <span>Back to Reconciliation</span>
        </Link>
      </div>

      {/* Main Bogføringsloven Ledger Component */}
      <BogfoeringslovenTable
        initialFiscalYear={ledgerSummary.fiscalYear}
        initialRetentionExpiry={ledgerSummary.retentionExpiry}
        initialRows={ledgerSummary.rows}
        totalSettledOere={ledgerSummary.totalSettledOere}
        totalOutstandingOere={ledgerSummary.totalOutstandingOere}
      />
    </div>
  );
}
