import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { prisma } from "@/lib/db";
import { NewEventTabs } from "@/components/events/new-event-tabs";
import { Calendar, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Schedule Event | Roskilde Cricket Club",
  description: "Schedule a match fixture or training session with ground collision detection.",
};

export default async function NewEventPage() {
  const session = await requireActivatedSession();
  const isStaff =
    session.roles.includes("ADMIN") ||
    session.roles.includes("COACH") ||
    session.roles.includes("AD_HOC_COACH");

  if (!isStaff) {
    redirect("/events");
  }

  const isAdmin = session.roles.includes("ADMIN");

  const [squads, facilities, equipmentLoans, allClubPlayers] = await Promise.all([
    prisma.teamSquad.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        category: true,
        defaultLineupSize: true,
        roster: {
          where: { isActive: true },
          select: {
            rosterRole: true,
            jerseyNumber: true,
            memberProfile: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                dateOfBirth: true,
                email: true,
                battingPosition: true,
                bowlingStyle: true,
                secondaryRoles: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.clubFacility.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        facilityType: true,
        location: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.equipmentLoan.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        expectedReturnAt: true,
        equipmentItem: {
          select: {
            name: true,
            assetTag: true,
          },
        },
      },
      orderBy: { expectedReturnAt: "asc" },
      take: 20,
    }),
    prisma.memberProfile.findMany({
      where: { isAnonymized: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        email: true,
        battingPosition: true,
        bowlingStyle: true,
        secondaryRoles: true,
        rosterMemberships: {
          where: { isActive: true },
          select: { teamSquad: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  const formattedLoans = equipmentLoans.map((l) => ({
    id: l.id,
    equipmentItemName: l.equipmentItem.name,
    assetTag: l.equipmentItem.assetTag,
    expectedReturnAt: l.expectedReturnAt.toISOString(),
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top breadcrumb */}
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
            <Calendar className="w-6 h-6 text-emerald-400" />
            Schedule New Match or Training
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Automatic ground collision detection and roster RSVP initialization.
          </p>
        </div>
      </div>

      {/* Main Scheduling Form & Recurring Tabs */}
      <NewEventTabs
        squads={squads}
        facilities={facilities}
        equipmentLoans={formattedLoans}
        allClubPlayers={allClubPlayers}
        isAdmin={isAdmin}
      />
    </div>
  );
}
