import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getDamageReports } from "@/modules/inventory/services/damage.service";
import { DamageReportsTable } from "@/components/inventory/damage-reports-table";
import { ArrowLeft, Wrench, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Damage & Loss Incident Reports | Roskilde Cricket Club",
  description: "Official equipment damage incident resolution queue and maintenance tracking",
};

export default async function DamageReportsQueuePage() {
  const session = await requireActivatedSession();

  const isOfficial = session.roles.some(
    (r) => r === "ADMIN" || r === "COACH" || r === "AD_HOC_COACH"
  );

  if (!isOfficial) {
    redirect("/profile/gear");
  }

  const reports = await getDamageReports();
  const pendingCount = reports.filter((r) => r.status === "PENDING").length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inventory</span>
        </Link>
        <span className="text-xs uppercase tracking-wider text-amber-400 font-mono bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
          Maintenance Queue
        </span>
      </div>

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
              Damage & Incident Reports
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Review reported equipment incidents, assess replacement values in DKK, and resolve gear back to service or retirement.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 self-start sm:self-auto">
          Pending Incidents: <span className="text-amber-400 font-bold font-mono">{pendingCount}</span>
        </div>
      </div>

      {/* Damage Reports Table */}
      <DamageReportsTable reports={reports as any} />
    </div>
  );
}
