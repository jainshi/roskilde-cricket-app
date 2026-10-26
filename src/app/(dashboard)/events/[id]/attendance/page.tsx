import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getPitchSideAttendanceSession } from "@/modules/teams-matches/services/attendance.service";
import { PitchsideAttendanceList } from "@/components/events/pitchside-attendance-list";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PitchsideAttendancePage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireActivatedSession();

  let sessionData;
  try {
    sessionData = await getPitchSideAttendanceSession(id, session.memberProfileId);
  } catch (error) {
    console.error("Failed to load attendance session:", error);
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/events" className="hover:text-emerald-700 transition">
          Events
        </Link>
        <span>/</span>
        <Link href={`/events/${id}`} className="hover:text-emerald-700 transition truncate max-w-[200px]">
          {sessionData.event.title}
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Pitch-Side Attendance</span>
      </nav>

      <PitchsideAttendanceList initialData={sessionData} />
    </div>
  );
}
