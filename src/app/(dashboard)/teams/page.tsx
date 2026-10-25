import React from "react";
import Link from "next/link";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getAllSquads } from "@/modules/teams-matches/services/squad.service";
import { SquadCard } from "@/components/teams/squad-card";
import { Shield, PlusCircle, Users, Trophy } from "lucide-react";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const session = await requireActivatedSession();
  const { category } = await searchParams;

  const canManage = session.roles.some((r) => r === "ADMIN" || r === "COACH");
  const squads = await getAllSquads(
    category && ["SENIOR", "YOUTH", "SOCIAL"].includes(category)
      ? { category: category as any, isActive: true }
      : { isActive: true }
  );

  const seniorCount = squads.filter((s) => s.category === "SENIOR").length;
  const youthCount = squads.filter((s) => s.category === "YOUTH").length;
  const totalRostered = squads.reduce((acc, s) => acc + s._count.roster, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-serif">
              Teams & Squads
            </h1>
            <p className="text-sm text-muted-foreground">
              Roskilde Cricket Club teams, age-group squads, and active rosters
            </p>
          </div>
        </div>

        {canManage && (
          <Link
            href="/teams/new"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <PlusCircle className="h-4 w-4" />
            Create Squad
          </Link>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium">Total Squads</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{squads.length}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium">Senior Teams</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{seniorCount}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium">Youth Age-Groups</div>
          <div className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{youthCount}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground font-medium">Rostered Memberships</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{totalRostered}</div>
        </div>
      </div>

      {/* Category Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto text-sm">
        <Link
          href="/teams"
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            !category
              ? "bg-emerald-600 text-white"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          All Squads
        </Link>
        <Link
          href="/teams?category=SENIOR"
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            category === "SENIOR"
              ? "bg-emerald-600 text-white"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Senior Teams
        </Link>
        <Link
          href="/teams?category=YOUTH"
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            category === "YOUTH"
              ? "bg-emerald-600 text-white"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Youth Development
        </Link>
        <Link
          href="/teams?category=SOCIAL"
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
            category === "SOCIAL"
              ? "bg-emerald-600 text-white"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Social & Friendly
        </Link>
      </div>

      {/* Squad Cards Grid */}
      {squads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
          <Trophy className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <h3 className="text-base font-semibold text-foreground">No squads found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            No squads match the selected category filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {squads.map((squad) => (
            <SquadCard key={squad.id} squad={squad as any} />
          ))}
        </div>
      )}
    </div>
  );
}
