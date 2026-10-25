import Link from "next/link";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getDictionary, formatMessage } from "@/i18n/get-dictionary";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserPlus, Shield, Sparkles, Activity, Users } from "lucide-react";

export const metadata = {
  title: "Dashboard | Roskilde Cricket Club",
  description: "Roskilde Cricket Club member dashboard",
};

export default async function DashboardPage() {
  const session = await requireActivatedSession();
  const dict = getDictionary("en");
  const isAdmin = session.roles.includes("ADMIN");

  const welcomeMessage = formatMessage(dict.dashboard.welcome, {
    name: session.firstName,
  });

  return (
    <div className="space-y-5 sm:space-y-8 animate-in fade-in duration-300">
      {/* Welcome Hero Banner with Official Club Navy/Blue gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0c2340] via-slate-900 to-slate-900 border border-sky-500/30 p-4 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-2.5 sm:space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-[11px] sm:text-xs font-semibold text-sky-200">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>{dict.dashboard.portalBadge}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {welcomeMessage}
          </h1>
          <p className="text-xs sm:text-base text-slate-300 leading-relaxed">
            Welcome to the official Roskilde Cricket Club member portal. View club fixtures, track team attendance, manage cricket statistics, and coordinate with teammates and coaches.
          </p>

          {/* Assigned Roles Badges */}
          <div className="pt-1 sm:pt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] sm:text-xs uppercase font-semibold text-slate-400 tracking-wider mr-1">
              {dict.dashboard.yourRoles}:
            </span>
            {session.roles.map((role) => (
              <span
                key={role}
                className="px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-semibold bg-sky-950/70 border border-sky-600/50 text-sky-300"
              >
                {dict.roles[role] || role}
              </span>
            ))}
          </div>
        </div>

        {/* Decorative background monogram */}
        <div className="absolute right-6 -bottom-8 opacity-5 text-sky-400 font-serif font-black text-9xl select-none pointer-events-none hidden md:block">
          RCC
        </div>
      </div>

      {/* Admin Quick Actions Card */}
      {isAdmin && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {dict.dashboard.adminTools}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            <Link
              href="/admin/members"
              className="group block transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.99] focus:outline-none"
            >
              <Card className="h-full bg-slate-900/80 border-slate-800 hover:border-sky-500/60 transition-colors shadow-lg shadow-black/40">
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-[#0c2340] border border-sky-500/40 text-sky-400 flex items-center justify-center mb-2 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                    <Users className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-lg text-white group-hover:text-sky-300 transition-colors">
                    All Members Directory
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-400 leading-normal">
                    Review and manage registered players, coaches, parents, and family links.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link
              href="/admin/members/new"
              className="group block transition-transform duration-200 hover:-translate-y-1 focus:outline-none"
            >
              <Card className="h-full bg-slate-900/80 border-slate-800 hover:border-sky-500/60 transition-colors shadow-lg shadow-black/40">
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-[#0c2340] border border-sky-500/40 text-sky-400 flex items-center justify-center mb-2 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-lg text-white group-hover:text-sky-300 transition-colors">
                    {dict.dashboard.onboardMember}
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-400 leading-normal">
                    {dict.dashboard.onboardMemberDesc}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      )}

      {/* Member Activity Baseline */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-sky-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">
            Club Noticeboard
          </h2>
        </div>
        <Card className="bg-slate-900/60 border-slate-800 text-slate-400 p-6 text-center">
          <p className="text-sm">
            Fixtures and training schedules for the 2026 season will be announced soon.
          </p>
        </Card>
      </div>
    </div>
  );
}
