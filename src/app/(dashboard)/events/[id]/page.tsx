import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { prisma } from "@/lib/db";
import { getScheduledEventById } from "@/modules/teams-matches/services/event.service";
import { getPlayerEventRsvp } from "@/modules/teams-matches/services/rsvp.service";
import { RsvpStatusBar } from "@/components/events/rsvp-status-bar";
import {
  Calendar,
  Clock,
  MapPin,
  Shield,
  Trophy,
  Dumbbell,
  Users,
  Car,
  ExternalLink,
  Package,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const session = await requireActivatedSession();

  const event = await getScheduledEventById(id);
  if (!event) {
    notFound();
  }

  // Determine active profile (parent acting on behalf of linked youth or own profile)
  const targetProfileId = session.activeProfileId || session.memberProfileId;
  const targetMember = await prisma.memberProfile.findUnique({
    where: { id: targetProfileId },
    select: { id: true, firstName: true, lastName: true },
  });

  const targetPlayer = targetMember || {
    id: session.memberProfileId,
    firstName: session.firstName,
    lastName: session.lastName,
  };

  // Fetch player RSVP state factoring in deadline lock and delegation
  const rsvpStatus = await getPlayerEventRsvp(
    event.id,
    targetPlayer.id,
    session.memberProfileId,
    session.roles
  );

  const isStaff =
    session.roles.includes("ADMIN") ||
    session.roles.includes("COACH") ||
    session.roles.includes("AD_HOC_COACH");

  // Check if player is on the squad roster
  const isRostered = event.rsvps.some(
    (r) => r.memberProfileId === targetPlayer.id
  );

  const matchDateFormatted = new Date(event.startAt).toLocaleDateString("en-DK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const startTime = new Date(event.startAt).toLocaleTimeString("en-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = new Date(event.endAt).toLocaleTimeString("en-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Group RSVPs
  const availableRsvps = event.rsvps.filter((r) => r.status === "AVAILABLE");
  const unavailableRsvps = event.rsvps.filter((r) => r.status === "UNAVAILABLE");
  const maybeRsvps = event.rsvps.filter((r) => r.status === "MAYBE");
  const noResponseRsvps = event.rsvps.filter((r) => r.status === "NO_RESPONSE");

  const publishedLineup =
    event.matchSelection?.selectionStatus === "PUBLISHED"
      ? event.matchSelection
      : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/events"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Back to schedule"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              {event.eventType === "MATCH" ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  {event.matchType || "MATCH"}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-950/80 border border-indigo-800 text-indigo-400 flex items-center gap-1">
                  <Dumbbell className="w-3 h-3" />
                  {event.trainingType || "TRAINING"}
                </span>
              )}

              {event.eventType === "MATCH" && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    event.isHome
                      ? "bg-teal-950/80 border-teal-800 text-teal-300"
                      : "bg-amber-950/80 border-amber-800 text-amber-300"
                  }`}
                >
                  {event.isHome ? "HOME" : "AWAY"}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight">
              {event.title}
            </h1>
          </div>
        </div>

        {/* Coach / Admin Action Buttons */}
        {isStaff && (
          <div className="flex items-center gap-2">
            {event.eventType === "MATCH" && (
              <Link
                href={`/events/${event.id}/selection`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.98]"
              >
                <Users className="w-4 h-4" />
                Match Selection Console
              </Link>
            )}
          </div>
        )}
      </div>

      {/* 1-Tap Mobile RSVP Bar */}
      <RsvpStatusBar
        scheduledEventId={event.id}
        targetPlayer={targetPlayer}
        currentStatus={rsvpStatus.status}
        initialTransportNote={rsvpStatus.transportNote}
        cutoffDeadline={event.rsvpDeadlineAt.toISOString()}
        isLocked={rsvpStatus.isLocked}
        canEdit={rsvpStatus.canEdit}
        isDelegated={rsvpStatus.isDelegated}
        isStaffOverride={isStaff}
      />

      {/* Event Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Event Info & Published Lineup */}
        <div className="md:col-span-2 space-y-6">
          {/* Main Info Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-400" />
              Event Timing &amp; Venue
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Date &amp; Time</p>
                <p className="text-sm font-bold text-white mt-0.5">
                  {matchDateFormatted}
                </p>
                <p className="text-slate-300 font-mono mt-0.5">
                  {startTime} – {endTime}
                  {event.meetAt && (
                    <span className="text-slate-500 ml-1.5">
                      (Meet:{" "}
                      {new Date(event.meetAt).toLocaleTimeString("en-DK", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      )
                    </span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Ground / Venue</p>
                <p className="text-sm font-bold text-white mt-0.5">
                  {event.facility?.name || event.venueName || "Home Ground"}
                </p>
                {(event.facility?.location || event.venueAddress) && (
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    {event.facility?.location || event.venueAddress}
                  </p>
                )}
              </div>
            </div>

            {/* Links row (Scorecard, Equipment Bag) */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center gap-4 flex-wrap text-xs">
              {event.scorecardUrl && (
                <a
                  href={event.scorecardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-950/60 border border-sky-800/80 text-sky-300 font-semibold hover:bg-sky-900/60 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Live Scorecard / DCF Match Center
                </a>
              )}

              {event.linkedEquipmentLoan && (
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Package className="w-4 h-4 shrink-0" />
                  <span>
                    Kit Bag: {event.linkedEquipmentLoan.equipmentItem.name}{" "}
                    {event.linkedEquipmentLoan.equipmentItem.assetTag &&
                      `[#${event.linkedEquipmentLoan.equipmentItem.assetTag}]`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Published Match Lineup Card (If published) */}
          {publishedLineup && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Official Match Lineup (Published)
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">
                  Target: {publishedLineup.targetLineupSize} players
                </span>
              </div>

              {/* Starting XI */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Starting XI
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {publishedLineup.selectedPlayers
                    .filter((p) => p.selectionRole === "STARTING")
                    .map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-2 rounded-xl bg-slate-950 border border-slate-800/90 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-emerald-500/15 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                            {p.battingOrderPosition || idx + 1}
                          </span>
                          <span className="text-xs font-bold text-white truncate">
                            {p.memberProfile.firstName} {p.memberProfile.lastName}
                          </span>
                        </div>

                        {p.tacticalRole !== "PLAYER" && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 shrink-0">
                            {p.tacticalRole === "CAPTAIN"
                              ? "C"
                              : p.tacticalRole === "VICE_CAPTAIN"
                              ? "VC"
                              : "WK"}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Substitutes */}
              {publishedLineup.selectedPlayers.some(
                (p) => p.selectionRole !== "STARTING"
              ) && (
                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Substitutes
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {publishedLineup.selectedPlayers
                      .filter((p) => p.selectionRole !== "STARTING")
                      .map((p) => (
                        <span
                          key={p.id}
                          className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-semibold"
                        >
                          {p.memberProfile.firstName} {p.memberProfile.lastName}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (1 col): Availability Summary */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Squad Availability</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {event.rsvps.length} rostered
              </span>
            </h3>

            {/* Participation Counter Pills */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                  Available
                </span>
                <span className="text-lg font-bold font-mono">
                  {availableRsvps.length}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300">
                <span className="text-[10px] uppercase font-bold text-rose-400 block">
                  Unavailable
                </span>
                <span className="text-lg font-bold font-mono">
                  {unavailableRsvps.length}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">
                  Maybe
                </span>
                <span className="text-lg font-bold font-mono">
                  {maybeRsvps.length}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  No Response
                </span>
                <span className="text-lg font-bold font-mono">
                  {noResponseRsvps.length}
                </span>
              </div>
            </div>

            {/* List of Available Players with Transport Notes */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Available Players ({availableRsvps.length})
              </p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {availableRsvps.map((r) => (
                  <div
                    key={r.id}
                    className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">
                        {r.memberProfile.firstName} {r.memberProfile.lastName}
                      </span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    {r.transportNote && (
                      <p className="text-[10px] text-slate-400 italic mt-0.5 flex items-center gap-1">
                        <Car className="w-3 h-3 text-sky-400 shrink-0" />
                        <span className="truncate">&ldquo;{r.transportNote}&rdquo;</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
