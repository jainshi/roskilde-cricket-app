import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { prisma } from "@/lib/db";
import {
  MatchSelectionConsole,
  RosterCandidate,
  SelectedSlot,
} from "@/components/events/match-selection-console";
import { Trophy, ArrowLeft } from "lucide-react";

interface SelectionPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Match Squad Selection Console | Roskilde Cricket Club",
  description: "Select starting XI and substitutes with dual-parent alert dispatch.",
};

export default async function MatchSelectionPage({ params }: SelectionPageProps) {
  const { id } = await params;
  const session = await requireActivatedSession();

  const isStaff =
    session.roles.includes("ADMIN") ||
    session.roles.includes("COACH") ||
    session.roles.includes("AD_HOC_COACH");

  if (!isStaff) {
    redirect(`/events/${id}`);
  }

  const event = await prisma.scheduledEvent.findUnique({
    where: { id },
    include: {
      teamSquad: {
        include: {
          roster: {
            where: { isActive: true },
            include: {
              memberProfile: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  battingPosition: true,
                  bowlingStyle: true,
                },
              },
            },
          },
        },
      },
      rsvps: true,
      matchSelection: {
        include: {
          publishedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          selectedPlayers: true,
        },
      },
    },
  });

  if (!event || event.eventType !== "MATCH") {
    notFound();
  }

  // Create RSVP lookup map
  const rsvpMap = new Map<
    string,
    { status: "AVAILABLE" | "UNAVAILABLE" | "MAYBE" | "NO_RESPONSE"; note?: string | null }
  >();
  for (const r of event.rsvps) {
    rsvpMap.set(r.memberProfileId, {
      status: r.status as any,
      note: r.transportNote,
    });
  }

  // Format Roster Candidates
  const rosterCandidates: RosterCandidate[] = event.teamSquad.roster.map((r) => {
    const rsvp = rsvpMap.get(r.memberProfileId);
    return {
      id: r.memberProfile.id,
      firstName: r.memberProfile.firstName,
      lastName: r.memberProfile.lastName,
      jerseyNumber: r.jerseyNumber,
      battingPosition: r.memberProfile.battingPosition,
      bowlingStyle: r.memberProfile.bowlingStyle,
      rsvpStatus: rsvp?.status || "NO_RESPONSE",
      transportNote: rsvp?.note || null,
      hasDispensation: r.hasDispensation,
    };
  });

  // Format Initial Selection
  let formattedInitialSelection = null;
  if (event.matchSelection) {
    formattedInitialSelection = {
      id: event.matchSelection.id,
      selectionStatus: event.matchSelection.selectionStatus,
      targetLineupSize: event.matchSelection.targetLineupSize,
      notes: event.matchSelection.notes,
      publishedAt: event.matchSelection.publishedAt,
      publishedByName: event.matchSelection.publishedBy
        ? `${event.matchSelection.publishedBy.firstName} ${event.matchSelection.publishedBy.lastName}`
        : null,
      selectedPlayers: event.matchSelection.selectedPlayers.map((p) => ({
        memberProfileId: p.memberProfileId,
        selectionRole: p.selectionRole,
        tacticalRole: p.tacticalRole,
        battingOrderPosition: p.battingOrderPosition,
      })),
    };
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href={`/events/${event.id}`}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Back to event"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-emerald-400" />
            Match-Day Selection Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Select starting XI, assign tactical roles, and notify parents of youth players upon publication.
          </p>
        </div>
      </div>

      {/* Main Selection Console */}
      <MatchSelectionConsole
        scheduledEventId={event.id}
        eventTitle={event.title}
        squadName={event.teamSquad.name}
        defaultLineupSize={event.targetLineupSize}
        roster={rosterCandidates}
        initialSelection={formattedInitialSelection}
      />
    </div>
  );
}
