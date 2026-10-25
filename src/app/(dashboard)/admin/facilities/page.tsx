import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { listFacilities } from "@/modules/teams-matches/services/facility.service";
import { FacilityManager } from "@/components/facilities/facility-manager";
import { Building2, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Club Facilities & Grounds | Roskilde Cricket Club",
  description: "Administrative directory of cricket pitches, practice nets, and indoor halls.",
};

export default async function AdminFacilitiesPage() {
  const session = await requireActivatedSession();
  if (!session.roles.includes("ADMIN")) {
    redirect("/events");
  }

  const facilities = await listFacilities(false);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/events"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Back to schedule"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-400" />
              Club Grounds &amp; Facilities
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Configure physical grounds, batting cages, and halls for match and practice allocation.
            </p>
          </div>
        </div>
      </div>

      {/* Facilities Manager View */}
      <FacilityManager facilities={facilities} />
    </div>
  );
}
