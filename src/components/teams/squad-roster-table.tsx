"use client";

import { useState, useTransition } from "react";
import { Search, ShieldAlert, Award, Trash2 } from "lucide-react";
import { removeRosterMemberAction, assignRosterMemberAction } from "@/modules/teams-matches/actions/squad.actions";

interface RosterMemberRow {
  id: string;
  rosterRole: "PLAYER" | "CAPTAIN" | "VICE_CAPTAIN";
  jerseyNumber: number | null;
  hasDispensation: boolean;
  dispensationNotes: string | null;
  joinedAt: Date | string;
  memberProfile: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    dateOfBirth: Date | string | null;
    battingPosition: string | null;
    bowlingStyle: string | null;
  };
}

interface SquadRosterTableProps {
  teamSquadId: string;
  roster: RosterMemberRow[];
  canManage: boolean;
}

export function SquadRosterTable({
  teamSquadId,
  roster,
  canManage,
}: SquadRosterTableProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const filtered = roster.filter((member) => {
    const nameMatch = `${member.memberProfile.firstName} ${member.memberProfile.lastName}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const roleMatch = roleFilter === "ALL" || member.rosterRole === roleFilter;
    return nameMatch && roleMatch;
  });

  const handleRemove = (memberProfileId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this squad roster?`)) return;

    startTransition(async () => {
      setFeedback(null);
      const res = await removeRosterMemberAction({ teamSquadId, memberProfileId });
      if (res.success) {
        setFeedback({ type: "success", message: `Removed ${name} from roster.` });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to remove member." });
      }
    });
  };

  const handlePromoteCaptain = (memberProfileId: string, name: string) => {
    startTransition(async () => {
      setFeedback(null);
      const res = await assignRosterMemberAction({
        teamSquadId,
        memberProfileId,
        rosterRole: "CAPTAIN",
      });
      if (res.success) {
        setFeedback({ type: "success", message: `${name} is now Team Captain.` });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to promote captain." });
      }
    });
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={`rounded-lg p-3 text-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200"
              : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filter:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs shadow-sm focus:border-emerald-500 focus:outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="CAPTAIN">Captains</option>
            <option value="VICE_CAPTAIN">Vice-Captains</option>
            <option value="PLAYER">Regular Players</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b border-border">
            <tr>
              <th scope="col" className="px-4 py-3">#</th>
              <th scope="col" className="px-4 py-3">Player</th>
              <th scope="col" className="px-4 py-3">Role</th>
              <th scope="col" className="px-4 py-3">Batting / Bowling</th>
              <th scope="col" className="px-4 py-3">Age / Dispensation</th>
              {canManage && <th scope="col" className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="px-4 py-8 text-center text-muted-foreground">
                  No players found in this roster.
                </td>
              </tr>
            ) : (
              filtered.map((member) => {
                const birthYear = member.memberProfile.dateOfBirth
                  ? new Date(member.memberProfile.dateOfBirth).getFullYear()
                  : null;
                const age = birthYear ? new Date().getFullYear() - birthYear : null;

                return (
                  <tr key={member.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-muted-foreground">
                      {member.jerseyNumber ? `#${member.jerseyNumber}` : "-"}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div>
                        {member.memberProfile.firstName} {member.memberProfile.lastName}
                        {member.memberProfile.email && (
                          <div className="text-xs text-muted-foreground font-normal">
                            {member.memberProfile.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {member.rosterRole === "CAPTAIN" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                          <Award className="h-3 w-3" /> Captain
                        </span>
                      )}
                      {member.rosterRole === "VICE_CAPTAIN" && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200">
                          Vice-Captain
                        </span>
                      )}
                      {member.rosterRole === "PLAYER" && (
                        <span className="text-xs text-muted-foreground">Player</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>Bat: {member.memberProfile.battingPosition || "Unspecified"}</div>
                      <div>Bowl: {member.memberProfile.bowlingStyle || "Unspecified"}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {age ? `Age ${age}` : "DOB TBD"}
                      {member.hasDispensation && (
                        <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 font-medium text-[10px] dark:bg-amber-900/60 dark:text-amber-200">
                          <ShieldAlert className="h-3 w-3" /> Dispensation
                        </div>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right space-x-2">
                        {member.rosterRole !== "CAPTAIN" && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              handlePromoteCaptain(
                                member.memberProfile.id,
                                `${member.memberProfile.firstName} ${member.memberProfile.lastName}`
                              )
                            }
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400"
                          >
                            Make Captain
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            handleRemove(
                              member.memberProfile.id,
                              `${member.memberProfile.firstName} ${member.memberProfile.lastName}`
                            )
                          }
                          className="text-xs font-medium text-red-600 hover:text-red-700 p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors inline-flex items-center"
                          title="Remove from roster"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
