import Link from "next/link";
import { Users, Calendar, Shield, Award } from "lucide-react";
import { SquadCategory } from "@prisma/client";

interface SquadCardProps {
  squad: {
    id: string;
    name: string;
    category: SquadCategory;
    ageGroupRule: string | null;
    defaultLineupSize: number;
    description: string | null;
    isActive: boolean;
    coachAssignments: Array<{
      role: string;
      coachProfile: {
        firstName: string;
        lastName: string;
      };
    }>;
    roster: Array<{
      rosterRole: string;
      memberProfile: {
        firstName: string;
        lastName: string;
      };
    }>;
    _count: {
      scheduledEvents: number;
      roster: number;
    };
  };
}

export function SquadCard({ squad }: SquadCardProps) {
  const headCoach = squad.coachAssignments.find((c) => c.role === "HEAD_COACH")?.coachProfile;
  const captain = squad.roster.find((r) => r.rosterRole === "CAPTAIN")?.memberProfile;

  const categoryBadgeColors: Record<SquadCategory, string> = {
    SENIOR: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    YOUTH: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    SOCIAL: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                  categoryBadgeColors[squad.category]
                }`}
              >
                {squad.category}
              </span>
              {squad.ageGroupRule && squad.ageGroupRule !== "OPEN" && (
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {squad.ageGroupRule}
                </span>
              )}
            </div>
            <h3 className="mt-2 text-lg font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              <Link href={`/teams/${squad.id}`} className="focus:outline-none">
                <span className="absolute inset-0" aria-hidden="true" />
                {squad.name}
              </Link>
            </h3>
          </div>
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap bg-muted/60 px-2 py-1 rounded">
            Target {squad.defaultLineupSize}s
          </span>
        </div>

        {squad.description && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {squad.description}
          </p>
        )}

        <div className="mt-4 space-y-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Coach:{" "}
              <strong className="text-foreground font-medium">
                {headCoach ? `${headCoach.firstName} ${headCoach.lastName}` : "TBD"}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>
              Captain:{" "}
              <strong className="text-foreground font-medium">
                {captain ? `${captain.firstName} ${captain.lastName}` : "TBD"}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          <span>{squad._count.roster} Players</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          <span>{squad._count.scheduledEvents} Events</span>
        </div>
      </div>
    </div>
  );
}
