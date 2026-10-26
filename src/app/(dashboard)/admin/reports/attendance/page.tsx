import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { prisma } from "@/lib/db";
import { getFolkeoplysningReport } from "@/modules/teams-matches/services/folkeoplysning.service";
import { FolkeoplysningReportClient } from "@/components/admin/folkeoplysning-report-client";

export default async function FolkeoplysningAttendanceReportPage() {
  const session = await requireActivatedSession();

  const isStaff = session.roles.some((r) =>
    ["ADMIN", "COACH", "AD_HOC_COACH"].includes(r)
  );

  if (!isStaff) {
    redirect("/events");
  }

  // Pre-load current season report (or all-time)
  const reportData = await getFolkeoplysningReport({});

  const [squads, facilities] = await Promise.all([
    prisma.teamSquad.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.clubFacility.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
              🇩🇰 Roskilde Kommune
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Folkeoplysningsloven § Auditing
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 tracking-tight">
            Municipal Attendance &amp; Subsidy Reporting
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit-ready reporting for Danish municipal youth grants (&lt;18) and adult sports subsidies.
          </p>
        </div>

        <Link
          href="/events"
          className="self-start sm:self-auto text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition"
        >
          ← Back to Events
        </Link>
      </div>

      <FolkeoplysningReportClient
        initialReport={reportData}
        squads={squads}
        facilities={facilities}
      />
    </div>
  );
}
