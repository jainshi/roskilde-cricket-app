import React from "react";
import Link from "next/link";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { prisma } from "@/lib/db";
import { listScheduledEvents } from "@/modules/teams-matches/services/event.service";
import { listFacilities } from "@/modules/teams-matches/services/facility.service";
import { EventCalendarView } from "@/components/events/event-calendar-view";
import { Calendar, Plus, Building2 } from "lucide-react";

export const metadata = {
  title: "Events & Match Calendar | Roskilde Cricket Club",
  description:
    "Master schedule for competitive fixtures, outdoor net practice, and indoor winter training sessions.",
};

export default async function EventsPage() {
  const session = await requireActivatedSession();
  const canManage =
    session.roles.includes("ADMIN") ||
    session.roles.includes("COACH") ||
    session.roles.includes("AD_HOC_COACH");
  const isAdmin = session.roles.includes("ADMIN");

  const targetProfileId = session.activeProfileId || session.memberProfileId;
  const isPlayerOnly = !canManage;

  // For players/parents, only query events they can reply to.
  // For staff/coaches, query all events with user's specific context.
  const eventQueryParams = isPlayerOnly
    ? { replyOnlyForMemberProfileId: targetProfileId }
    : { currentMemberProfileId: targetProfileId };

  // If player, only fetch the squads they are rostered in (or have invitations to)
  let squadPromise;
  if (isPlayerOnly) {
    const [rosterMemberships, rsvpEvents] = await Promise.all([
      prisma.teamRosterMember.findMany({
        where: { memberProfileId: targetProfileId, isActive: true },
        select: { teamSquadId: true },
      }),
      prisma.eventRsvp.findMany({
        where: { memberProfileId: targetProfileId },
        select: { scheduledEvent: { select: { teamSquadId: true } } },
      }),
    ]);
    const squadIds = Array.from(
      new Set([
        ...rosterMemberships.map((m) => m.teamSquadId),
        ...rsvpEvents.map((r) => r.scheduledEvent.teamSquadId),
      ])
    );
    squadPromise = prisma.teamSquad.findMany({
      where: { id: { in: squadIds }, isActive: true },
      select: { id: true, name: true, category: true },
      orderBy: { name: "asc" },
    });
  } else {
    squadPromise = prisma.teamSquad.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: true },
      orderBy: { name: "asc" },
    });
  }

  const [events, squads, facilities] = await Promise.all([
    listScheduledEvents(eventQueryParams),
    squadPromise,
    listFacilities(true),
  ]);

  const squadOptions = squads.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
  }));

  const facilityOptions = facilities.map((f) => ({
    id: f.id,
    name: f.name,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Calendar className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight">
              Events &amp; Match Schedule
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Fixtures, net practices, and ground allocations across Roskilde Cricket Club.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <Link
              href="/admin/facilities"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              Facilities
            </Link>
          )}

          {canManage && (
            <Link
              href="/events/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Schedule Event
            </Link>
          )}
        </div>
      </div>

      {/* Main Master Calendar View */}
      <EventCalendarView
        events={events}
        squads={squadOptions}
        facilities={facilityOptions}
        canManage={canManage}
        isPlayerOnly={isPlayerOnly}
        currentMemberProfileId={targetProfileId}
      />
    </div>
  );
}
