import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getPendingLoanExtensions } from "@/modules/inventory/services/extension.service";
import { ExtensionsReviewTable } from "@/components/inventory/extensions-review-table";
import { ArrowLeft, Clock, Calendar, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Loan Extension Requests | Roskilde Cricket Club",
  description: "Official 1-click review queue for equipment return date extension requests",
};

export default async function ExtensionsQueuePage() {
  const session = await requireActivatedSession();

  const isOfficial = session.roles.some(
    (r) => r === "ADMIN" || r === "COACH" || r === "AD_HOC_COACH"
  );

  if (!isOfficial) {
    redirect("/profile/gear");
  }

  const extensions = await getPendingLoanExtensions();

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
        <span className="text-xs uppercase tracking-wider text-sky-400 font-mono bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
          Coaching Review Queue
        </span>
      </div>

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Calendar className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
              Return Extension Requests
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Review proposed return date extensions from club members and linked youth parents with 1-click decisions.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 self-start sm:self-auto">
          Pending Requests: <span className="text-white font-bold font-mono">{extensions.length}</span>
        </div>
      </div>

      {/* Main Review Table / List */}
      <ExtensionsReviewTable extensions={extensions as any} />
    </div>
  );
}
