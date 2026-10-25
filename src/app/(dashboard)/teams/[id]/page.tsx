import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getSquadById } from "@/modules/teams-matches/services/squad.service";
import { ArrowLeft, Users, Shield, Calendar, Award, UserPlus, Settings } from "lucide-react";

export default async function SquadDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireActivatedSession();
  const { id } = await params;
  const squad = await getSquadById(id);

  if (!squad) {
    notFound();
  }

  const canManage = session.roles.some((r) => r === "ADMIN" || r === "COACH");
  const headCoach = squad.coachAssignments.find((c) => c.role === "HEAD_COACH")?.coachProfile;
  const otherCoaches = squad.coachAssignments.filter((c) => c.role !== "HEAD_COACH");
  const captain = squad.roster.find((r) => r.rosterRole === "CAPTAIN")?.memberProfile;
  const viceCaptain = squad.roster.find((r) => r.rosterRole === "VICE_CAPTAIN")?.memberProfile;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/teams"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Teams Directory
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                {squad.category}
              </span>
              {squad.ageGroupRule && (
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {squad.ageGroupRule}
                </span>
              )}
              <span className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Target {squad.defaultLineupSize}s
              </span>
            </div>
            <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
              {squad.name}
            </h1>
            {squad.description && (
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {squad.description}
              </p>
            )}
          </div>

          {canManage && (
            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href={`/teams/${squad.id}/roster`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <Users className="h-4 w-4" /> Manage Roster ({squad._count.roster})
              </Link>
            </div>
          )}
        </div>

        {/* Leadership Row */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border pt-6">
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span>Head Coach</span>
            </div>
            <div className="mt-2 text-base font-bold text-foreground">
              {headCoach ? `${headCoach.firstName} ${headCoach.lastName}` : "None Assigned"}
            </div>
            {headCoach?.email && (
              <div className="text-xs text-muted-foreground mt-0.5">{headCoach.email}</div>
            )}
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Award className="h-4 w-4 text-amber-500" />
              <span>Team Captain</span>
            </div>
            <div className="mt-2 text-base font-bold text-foreground">
              {captain ? `${captain.firstName} ${captain.lastName}` : "Not Designated"}
            </div>
            {viceCaptain && (
              <div className="text-xs text-muted-foreground mt-0.5">
                VC: {viceCaptain.firstName} {viceCaptain.lastName}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span>Fixtures & Events</span>
            </div>
            <div className="mt-2 text-base font-bold text-foreground">
              {squad._count.scheduledEvents} Scheduled
            </div>
            <Link
              href="/events"
              className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400 mt-0.5 inline-block"
            >
              View club schedule →
            </Link>
          </div>
        </div>
      </div>

      {/* Roster Preview Section */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-bold text-foreground">Active Squad Roster</h2>
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-semibold">
              {squad.roster.length} Players
            </span>
          </div>

          <Link
            href={`/teams/${squad.id}/roster`}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Manage Roster & Add Players →
          </Link>
        </div>

        {squad.roster.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No players currently rostered on this squad.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {squad.roster.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3 hover:bg-muted/40 transition-colors"
              >
                <div>
                  <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    {r.jerseyNumber && (
                      <span className="text-xs font-bold text-muted-foreground">
                        #{r.jerseyNumber}
                      </span>
                    )}
                    <span>
                      {r.memberProfile.firstName} {r.memberProfile.lastName}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {r.memberProfile.battingPosition || "Batter"} • {r.memberProfile.bowlingStyle || "Bowler"}
                  </div>
                </div>

                {r.rosterRole === "CAPTAIN" && (
                  <span className="rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 dark:bg-amber-900/60 dark:text-amber-200">
                    CAPTAIN
                  </span>
                )}
                {r.rosterRole === "VICE_CAPTAIN" && (
                  <span className="rounded-md bg-blue-100 text-blue-800 text-[10px] font-semibold px-1.5 py-0.5 dark:bg-blue-900/60 dark:text-blue-200">
                    VC
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
