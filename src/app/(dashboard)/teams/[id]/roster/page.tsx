import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import {
  getSquadById,
  getEligibleCandidatesForSquad,
} from "@/modules/teams-matches/services/squad.service";
import { SquadRosterTable } from "@/components/teams/squad-roster-table";
import { AddRosterMemberDialog } from "@/components/teams/add-roster-member-dialog";
import { ArrowLeft, Users, Shield } from "lucide-react";

export default async function SquadRosterPage({
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
  const candidates = canManage ? await getEligibleCandidatesForSquad(squad.id) : [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <Link
          href={`/teams/${squad.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {squad.name}
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-serif">
              {squad.name} Roster
            </h1>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
              {squad.category} {squad.ageGroupRule && `• ${squad.ageGroupRule}`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manage player memberships, captain designation, and DCF age eligibility
          </p>
        </div>

        {canManage && (
          <div>
            <AddRosterMemberDialog
              teamSquadId={squad.id}
              squadName={squad.name}
              candidates={candidates as any}
            />
          </div>
        )}
      </div>

      {/* Roster Table */}
      <SquadRosterTable
        teamSquadId={squad.id}
        roster={squad.roster as any}
        canManage={canManage}
      />
    </div>
  );
}
