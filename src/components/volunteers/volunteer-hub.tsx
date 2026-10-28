"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  Calendar,
  UserPlus,
  CheckCircle2,
  ArrowRightLeft,
  Filter,
  Car,
  Clock,
  Flag,
  Shield,
  Coffee,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { VolunteerDutyType, VolunteerSlotStatus } from "@prisma/client";
import { VolunteerSlotWithDetails } from "@/modules/volunteers/services/volunteer.service";
import { VolunteerDutyCard } from "./volunteer-duty-card";

interface VolunteerHubProps {
  allUpcomingSlots: VolunteerSlotWithDetails[];
  mySlots: VolunteerSlotWithDetails[];
  stats: {
    totalUpcoming: number;
    openDuties: number;
    claimedDuties: number;
    swapRequested: number;
  };
  currentProfileId: string;
  isStaff: boolean;
}

export function VolunteerHub({
  allUpcomingSlots,
  mySlots,
  stats,
  currentProfileId,
  isStaff,
}: VolunteerHubProps) {
  // If open opportunities exist, default to open tab so members can 1-tap claim
  const [activeTab, setActiveTab] = useState<"open" | "my" | "swaps" | "all">(
    stats.openDuties > 0 ? "open" : mySlots.length > 0 ? "my" : "all"
  );
  const [selectedDutyType, setSelectedDutyType] = useState<string>("ALL");

  // Filter slots for open opportunities and swap requests
  const openSlots = allUpcomingSlots.filter((s) => s.status === VolunteerSlotStatus.OPEN);
  const swapSlots = allUpcomingSlots.filter((s) => s.status === VolunteerSlotStatus.SWAP_REQUESTED);

  // Tab filtered dataset
  const getTabSlots = () => {
    switch (activeTab) {
      case "open":
        return openSlots;
      case "my":
        return mySlots;
      case "swaps":
        return swapSlots;
      case "all":
      default:
        return allUpcomingSlots;
    }
  };

  const currentTabSlots = getTabSlots();

  // Apply Duty Type filter
  const displayedSlots = currentTabSlots.filter((slot) => {
    if (selectedDutyType === "ALL") return true;
    return slot.dutyType === selectedDutyType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card border rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                <Users className="w-6 h-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-serif">
                Volunteer Duty Roster
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Match-day scoring, umpiring, pitch preparation, tea catering &amp; youth transport.
              1-tap mobile claims and peer-to-peer shift swaps.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border border-border transition-all"
            >
              <Calendar className="w-4 h-4 text-sky-500" />
              Match Calendar
            </Link>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
          {/* Open Opportunities */}
          <button
            onClick={() => setActiveTab("open")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              activeTab === "open"
                ? "bg-primary/10 border-primary ring-2 ring-primary/20"
                : "bg-background/60 border-border hover:border-primary/40"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Open Duties</span>
              <UserPlus className="w-4 h-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-foreground">
                {stats.openDuties}
              </span>
              {stats.openDuties > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-1.5 py-0.5 rounded-md bg-primary/15">
                  1-Tap Claim
                </span>
              )}
            </div>
          </button>

          {/* My Duties */}
          <button
            onClick={() => setActiveTab("my")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              activeTab === "my"
                ? "bg-primary/10 border-primary ring-2 ring-primary/20"
                : "bg-background/60 border-border hover:border-primary/40"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>My Shifts</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-foreground">
                {mySlots.length}
              </span>
              <span className="text-[10px] text-muted-foreground">Assigned</span>
            </div>
          </button>

          {/* Peer Swaps Requested */}
          <button
            onClick={() => setActiveTab("swaps")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              activeTab === "swaps"
                ? "bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/20"
                : "bg-background/60 border-border hover:border-amber-500/40"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Pending Swaps</span>
              <ArrowRightLeft className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-foreground">
                {stats.swapRequested}
              </span>
              {stats.swapRequested > 0 && (
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-md bg-amber-500/20 animate-pulse">
                  Help Needed
                </span>
              )}
            </div>
          </button>

          {/* Total Upcoming Duties */}
          <button
            onClick={() => setActiveTab("all")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              activeTab === "all"
                ? "bg-primary/10 border-primary ring-2 ring-primary/20"
                : "bg-background/60 border-border hover:border-primary/40"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Total Roster</span>
              <Calendar className="w-4 h-4 text-sky-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-foreground">
                {stats.totalUpcoming}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({stats.claimedDuties} filled)
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Filter & Tabs Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
        {/* Primary View Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setActiveTab("open")}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "open"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Open Opportunities ({openSlots.length})
            {openSlots.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("my")}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "my"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            My Commitments ({mySlots.length})
          </button>

          <button
            onClick={() => setActiveTab("swaps")}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "swaps"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Swap Requests ({swapSlots.length})
            {swapSlots.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${
              activeTab === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            All Upcoming ({allUpcomingSlots.length})
          </button>
        </div>

        {/* Duty Type Chip Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-muted-foreground flex items-center gap-1 pl-1 pr-1 text-[11px] font-semibold">
            <Filter className="w-3 h-3" />
            Role:
          </span>
          {[
            { id: "ALL", label: "All" },
            { id: VolunteerDutyType.SCORING, label: "Scoring" },
            { id: VolunteerDutyType.UMPIRING, label: "Umpiring" },
            { id: VolunteerDutyType.PITCH_PREPARATION, label: "Pitch Prep" },
            { id: VolunteerDutyType.TEA_CATERING, label: "Catering" },
            { id: VolunteerDutyType.YOUTH_CARPOOL, label: "Carpool" },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedDutyType(type.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                selectedDutyType === type.id
                  ? "bg-foreground text-background font-semibold"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Roster Cards List */}
      <div className="space-y-4">
        {displayedSlots.length === 0 ? (
          <div className="bg-card border border-dashed rounded-3xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              {activeTab === "open" ? (
                <Sparkles className="w-6 h-6 text-emerald-500" />
              ) : activeTab === "swaps" ? (
                <CheckCircle2 className="w-6 h-6 text-sky-500" />
              ) : (
                <Users className="w-6 h-6" />
              )}
            </div>
            <h3 className="text-base font-bold text-foreground">
              {activeTab === "open"
                ? "All Duties Fully Staffed!"
                : activeTab === "my"
                ? "No Volunteer Duties Assigned"
                : activeTab === "swaps"
                ? "No Pending Peer Swap Requests"
                : "No Duty Slots Found"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              {activeTab === "open"
                ? "Every upcoming match fixture and club event has its required volunteer roles covered. Thank you to our members and parents!"
                : activeTab === "my"
                ? "You currently have no scheduled volunteer responsibilities. Tap 'Open Opportunities' above to contribute to club match days."
                : activeTab === "swaps"
                ? "None of your fellow members are currently seeking a duty replacement. Check back before weekend fixtures."
                : "No duty slots match your selected filters."}
            </p>
            {activeTab !== "open" && openSlots.length > 0 && (
              <button
                onClick={() => setActiveTab("open")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                View {openSlots.length} Open Opportunit{openSlots.length === 1 ? "y" : "ies"}
              </button>
            )}
          </div>
        ) : (
          displayedSlots.map((slot) => {
            const eventDateFormatted = new Date(slot.scheduledEvent.startAt).toLocaleDateString(
              "en-DK",
              {
                weekday: "short",
                month: "short",
                day: "numeric",
              }
            );
            const eventTimeFormatted = new Date(slot.scheduledEvent.startAt).toLocaleTimeString(
              "en-DK",
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            );

            return (
              <div key={slot.id} className="space-y-1.5">
                {/* Event Context Header Bar */}
                <div className="flex items-center justify-between text-xs px-2 text-muted-foreground">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {slot.scheduledEvent.title}
                    </span>
                    <span>•</span>
                    <span className="text-[11px] font-medium text-primary">
                      {slot.scheduledEvent.teamSquad.name}
                    </span>
                    <span>•</span>
                    <span className="text-[11px]">
                      {eventDateFormatted} at {eventTimeFormatted}
                    </span>
                    {slot.scheduledEvent.venueName && (
                      <>
                        <span>•</span>
                        <span className="text-[11px]">{slot.scheduledEvent.venueName}</span>
                      </>
                    )}
                  </div>
                  <Link
                    href={`/events/${slot.scheduledEvent.id}`}
                    className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-sky-500 hover:text-sky-400 hover:underline shrink-0"
                  >
                    View Match <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Duty Card Component (<10s 1-tap claim, swap modal, release) */}
                <VolunteerDutyCard
                  slot={slot}
                  currentProfileId={currentProfileId}
                  isStaff={isStaff}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
