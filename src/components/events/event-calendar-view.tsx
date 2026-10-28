"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Shield,
  Plus,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Trophy,
  Dumbbell,
} from "lucide-react";
import { ScheduledEventSummary } from "@/modules/teams-matches/services/event.service";
import { VolunteerBadge } from "@/components/volunteers/volunteer-badge";

interface SquadOption {
  id: string;
  name: string;
  category: string;
}

interface FacilityOption {
  id: string;
  name: string;
}

interface EventCalendarViewProps {
  events: ScheduledEventSummary[];
  squads: SquadOption[];
  facilities: FacilityOption[];
  canManage: boolean;
  isPlayerOnly?: boolean;
  currentMemberProfileId?: string;
}

export function EventCalendarView({
  events,
  squads,
  facilities,
  canManage,
  isPlayerOnly = false,
  currentMemberProfileId,
}: EventCalendarViewProps) {
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("ALL");
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "MY_REPLY">("ALL");
  const [squadFilter, setSquadFilter] = useState<string>("ALL");
  const [facilityFilter, setFacilityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("UPCOMING");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const now = new Date();

  // Filter events based on selections
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Scope filter (for staff toggling between all events and events they can reply to)
      if (!isPlayerOnly && scopeFilter === "MY_REPLY" && !ev.canReply) {
        return false;
      }
      // Type filter
      if (eventTypeFilter !== "ALL" && ev.eventType !== eventTypeFilter) {
        return false;
      }
      // Squad filter
      if (squadFilter !== "ALL" && ev.teamSquadId !== squadFilter) {
        return false;
      }
      // Facility filter
      if (facilityFilter !== "ALL" && ev.facilityId !== facilityFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === "UPCOMING") {
        if (new Date(ev.startAt).getTime() < now.getTime() - 4 * 60 * 60 * 1000) {
          return false;
        }
      } else if (statusFilter === "PAST") {
        if (new Date(ev.startAt).getTime() >= now.getTime() - 4 * 60 * 60 * 1000) {
          return false;
        }
      } else if (statusFilter === "CANCELLED") {
        if (ev.lifecycleStatus !== "CANCELLED") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesOpponent = ev.opponentName?.toLowerCase().includes(q);
        const matchesSquad = ev.squadName.toLowerCase().includes(q);
        const matchesVenue = ev.venueName?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesOpponent && !matchesSquad && !matchesVenue) {
          return false;
        }
      }

      return true;
    });
  }, [
    events,
    isPlayerOnly,
    scopeFilter,
    eventTypeFilter,
    squadFilter,
    facilityFilter,
    statusFilter,
    searchQuery,
    now,
  ]);

  // Group events by Date String (YYYY-MM-DD)
  const groupedEvents = useMemo(() => {
    const groups: { [dateStr: string]: ScheduledEventSummary[] } = {};
    for (const ev of filteredEvents) {
      const d = new Date(ev.startAt);
      const key = d.toLocaleDateString("en-DK", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      if (!groups[key]) groups[key] = [];
      groups[key].push(ev);
    }
    return groups;
  }, [filteredEvents]);

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Quick Type Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setEventTypeFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                eventTypeFilter === "ALL"
                  ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              All Events ({events.length})
            </button>
            <button
              onClick={() => setEventTypeFilter("MATCH")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                eventTypeFilter === "MATCH"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Fixtures
            </button>
            <button
              onClick={() => setEventTypeFilter("TRAINING")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                eventTypeFilter === "TRAINING"
                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5" />
              Trainings
            </button>
          </div>

          {/* Controls Right Section */}
          <div className="flex items-center gap-3">
            {!isPlayerOnly && (
              <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setScopeFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    scopeFilter === "ALL"
                      ? "bg-slate-800 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All Club Events
                </button>
                <button
                  type="button"
                  onClick={() => setScopeFilter("MY_REPLY")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    scopeFilter === "MY_REPLY"
                      ? "bg-sky-600 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  My RSVPs ({events.filter((e) => e.canReply).length})
                </button>
              </div>
            )}

            {isPlayerOnly && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-950/60 border border-sky-800/60 text-sky-300 text-xs font-medium">
                <Shield className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Showing your squad events</span>
              </div>
            )}

            {canManage && (
              <Link
                href="/events/new"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                Schedule Event
              </Link>
            )}
          </div>
        </div>

        {/* Detailed Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Squad
            </label>
            <select
              value={squadFilter}
              onChange={(e) => setSquadFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Club Squads</option>
              {squads.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Facility
            </label>
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Facilities</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Timeline
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="UPCOMING">Upcoming Events</option>
              <option value="ALL">All Time</option>
              <option value="PAST">Past Events</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search opponent or title..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Events Agenda / List View */}
      {Object.keys(groupedEvents).length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <CalendarIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No scheduled events found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            {isPlayerOnly
              ? "You do not have any upcoming squad matches or training sessions requiring your RSVP. When your squad schedules events, they will appear here."
              : "No events match your current filter criteria. Try adjusting the filters or schedule a new match or training session."}
          </p>
          {canManage && (
            <Link
              href="/events/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Event
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([dateStr, dayEvents]) => (
            <div key={dateStr} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {dateStr}
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">
                  ({dayEvents.length} {dayEvents.length === 1 ? "event" : "events"})
                </span>
              </div>

              {/* Event Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {dayEvents.map((ev) => {
                  const startTime = new Date(ev.startAt).toLocaleTimeString("en-DK", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const endTime = new Date(ev.endAt).toLocaleTimeString("en-DK", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={ev.id}
                      className="bg-slate-900 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Badges row */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {ev.eventType === "MATCH" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center gap-1">
                                <Trophy className="w-3 h-3" />
                                {ev.matchType || "MATCH"}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-950/80 border border-indigo-800 text-indigo-400 flex items-center gap-1">
                                <Dumbbell className="w-3 h-3" />
                                {ev.trainingType || "TRAINING"}
                              </span>
                            )}

                            {ev.eventType === "MATCH" && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                  ev.isHome
                                    ? "bg-teal-950/80 border-teal-800 text-teal-300"
                                    : "bg-amber-950/80 border-amber-800 text-amber-300"
                                }`}
                              >
                                {ev.isHome ? "HOME" : "AWAY"}
                              </span>
                            )}

                            {ev.hasCollisionOverride && (
                              <span
                                title="Admin collision override applied"
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/90 border border-amber-800/70 text-amber-400 flex items-center gap-1"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                Override
                              </span>
                            )}

                            {/* User's Individual RSVP Status Badge */}
                            {ev.userRsvp && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                                  ev.userRsvp.status === "AVAILABLE"
                                    ? "bg-emerald-950/90 border-emerald-700 text-emerald-300"
                                    : ev.userRsvp.status === "UNAVAILABLE"
                                    ? "bg-rose-950/90 border-rose-700 text-rose-300"
                                    : ev.userRsvp.status === "MAYBE"
                                    ? "bg-amber-950/90 border-amber-700 text-amber-300"
                                    : "bg-sky-950/90 border-sky-600 text-sky-300 animate-pulse"
                                }`}
                              >
                                {ev.userRsvp.status === "AVAILABLE" && (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                )}
                                {ev.userRsvp.status === "UNAVAILABLE" && (
                                  <XCircle className="w-3 h-3 text-rose-400" />
                                )}
                                {ev.userRsvp.status === "MAYBE" && (
                                  <HelpCircle className="w-3 h-3 text-amber-400" />
                                )}
                                {ev.userRsvp.status === "NO_RESPONSE"
                                  ? "RSVP Needed"
                                  : `My RSVP: ${ev.userRsvp.status}`}
                              </span>
                            )}

                            {/* Volunteer Duty Fulfillment Badge */}
                            {ev.volunteerFulfillment && ev.volunteerFulfillment.totalSlots > 0 && (
                              <VolunteerBadge
                                fulfillment={ev.volunteerFulfillment}
                                size="sm"
                              />
                            )}
                          </div>

                          {/* Lifecycle Status */}
                          {ev.lifecycleStatus !== "SCHEDULED" && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                ev.lifecycleStatus === "PLAYED"
                                  ? "bg-emerald-950/40 border-emerald-800 text-emerald-400"
                                  : ev.lifecycleStatus === "RAINED_OUT"
                                  ? "bg-sky-950/40 border-sky-800 text-sky-400"
                                  : "bg-rose-950/40 border-rose-800 text-rose-400"
                              }`}
                            >
                              {ev.lifecycleStatus}
                            </span>
                          )}
                        </div>

                        {/* Title & Opponent */}
                        <Link
                          href={`/events/${ev.id}`}
                          className="block text-sm font-bold text-white group-hover:text-sky-400 transition-colors mb-1"
                        >
                          {ev.title}
                        </Link>

                        {/* Squad details */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-2">
                          <Shield className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="font-semibold">{ev.squadName}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-[11px] text-slate-400">{ev.squadCategory}</span>
                        </div>

                        {/* Time & Venue meta */}
                        <div className="space-y-1 text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>
                              {startTime} – {endTime}
                              {ev.meetAt && (
                                <span className="text-[11px] text-slate-500 ml-1.5 font-mono">
                                  (Meet:{" "}
                                  {new Date(ev.meetAt).toLocaleTimeString("en-DK", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                  )
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">
                              {ev.facilityName
                                ? ev.facilityName
                                : ev.venueName
                                ? `${ev.venueName} ${ev.venueAddress ? `(${ev.venueAddress})` : ""}`
                                : "Away Venue"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom RSVP Stats & Action row */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        {/* RSVP Mini Breakdown */}
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span
                            title="Available"
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 font-semibold"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {ev.rsvpStats.available}
                          </span>
                          <span
                            title="Unavailable"
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 font-semibold"
                          >
                            <XCircle className="w-3 h-3" />
                            {ev.rsvpStats.unavailable}
                          </span>
                          <span
                            title="Maybe"
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 font-semibold"
                          >
                            <HelpCircle className="w-3 h-3" />
                            {ev.rsvpStats.maybe}
                          </span>
                          <span
                            title="Awaiting Response"
                            className="text-[10px] text-slate-500 ml-1 font-mono"
                          >
                            {ev.rsvpStats.noResponse} pending
                          </span>
                        </div>

                        {/* Links */}
                        <div className="flex items-center gap-2">
                          {ev.scorecardUrl && (
                            <a
                              href={ev.scorecardUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white transition-colors"
                              title="External Live Scorecard"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <Link
                            href={`/events/${ev.id}`}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            Details &rarr;
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
