import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getActiveEquipmentLoans } from "@/modules/inventory/services/loan.service";
import { PitchsideCheckinForm } from "@/components/inventory/pitchside-checkin-form";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Check-In Equipment | Roskilde Cricket Club",
  description: "Pitch-side equipment check-in with condition assessment and maintenance routing",
};

export default async function PitchsideCheckinPage() {
  const session = await requireActivatedSession();

  const isOfficial = session.roles.some(
    (r) => r === "ADMIN" || r === "COACH" || r === "AD_HOC_COACH"
  );

  if (!isOfficial) {
    redirect("/profile/gear");
  }

  const loans = await getActiveEquipmentLoans();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inventory</span>
        </Link>
        <span className="text-xs uppercase tracking-wider text-emerald-400/80 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
          Pitch-Side Mode
        </span>
      </div>

      {/* Title */}
      <div>
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
            Equipment Check-In
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400">
          Record gear return, assess post-use condition, and route damaged gear directly to maintenance.
        </p>
      </div>

      {/* Main Check-In Form */}
      <PitchsideCheckinForm loans={loans} />
    </div>
  );
}
