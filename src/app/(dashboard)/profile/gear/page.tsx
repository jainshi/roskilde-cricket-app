import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getActiveContext } from "@/modules/auth-rbac/services/context.service";
import { getMemberLoans } from "@/modules/inventory/services/extension.service";
import { MyGearCard } from "@/components/inventory/my-gear-card";
import {
  Package,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Shield,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "My Gear & Club Equipment | Roskilde Cricket Club",
  description: "View loaned equipment, return deadlines, request extensions, and report damaged gear",
};

export default async function MyGearPage() {
  const session = await requireActivatedSession();
  const context = await getActiveContext();

  const isDelegated = context?.isDelegated ?? false;
  const targetProfileId = context?.activeProfileId || session.memberProfileId;
  const targetName = isDelegated
    ? context?.targetChild?.name || "Linked Youth Player"
    : `${session.firstName} ${session.lastName}`.trim();

  const loans = await getMemberLoans(targetProfileId);

  const activeLoans = loans.filter(
    (l) => l.status === "ACTIVE" || l.status === "OVERDUE" || !l.returnedAt
  );
  const returnedLoans = loans.filter(
    (l) => l.status === "RETURNED" || l.returnedAt !== null
  );

  const overdueCount = activeLoans.filter((l) => l.isOverdue).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Profile Switcher Notification (if Parent switched to Child) */}
      {isDelegated && (
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg shadow-amber-950/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Youth Delegation Active
              </span>
              <p className="text-sm font-medium text-white">
                Viewing equipment checked out to{" "}
                <span className="font-bold underline decoration-amber-500/50">{targetName}</span>
              </p>
            </div>
          </div>
          <span className="text-xs bg-amber-900/40 px-3 py-1 rounded-full border border-amber-700/50 text-amber-300">
            Parental Accountability Active
          </span>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
                My Loaned Gear
              </h1>
              <p className="text-sm text-slate-400">
                {isDelegated
                  ? `Active club equipment in possession of ${targetName}`
                  : "Track your borrowed club gear, return deadlines, and extension requests"}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block uppercase tracking-wider">Active</span>
            <span className="text-base font-bold text-white font-mono">{activeLoans.length}</span>
          </div>

          <div
            className={`px-3.5 py-2 rounded-lg border text-center ${
              overdueCount > 0
                ? "bg-rose-950/30 border-rose-800/50 text-rose-300"
                : "bg-slate-900/80 border-slate-800 text-slate-400"
            }`}
          >
            <span className="text-[11px] block uppercase tracking-wider">Overdue</span>
            <span className="text-base font-bold font-mono">
              {overdueCount}
            </span>
          </div>
        </div>
      </div>

      {/* Active Loans Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            Currently Borrowed Gear ({activeLoans.length})
          </h2>
          <span className="text-xs text-slate-400">
            Self-service extension & damage reporting
          </span>
        </div>

        {activeLoans.length === 0 ? (
          <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/40 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 text-slate-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-base font-semibold text-white">No active gear loans</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {isDelegated
                ? `${targetName} does not currently have any equipment checked out from the club shed.`
                : "You do not currently have any club equipment checked out. Enjoy the match!"}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {activeLoans.map((loan) => (
              <MyGearCard
                key={loan.id}
                loan={loan as any}
                isParentViewingChild={isDelegated}
                childName={targetName}
              />
            ))}
          </div>
        )}
      </div>

      {/* Historical Returned Loans Section */}
      {returnedLoans.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
            Returned Equipment History ({returnedLoans.length})
          </h2>

          <div className="space-y-3">
            {returnedLoans.map((loan) => (
              <MyGearCard
                key={loan.id}
                loan={loan as any}
                isParentViewingChild={isDelegated}
                childName={targetName}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
