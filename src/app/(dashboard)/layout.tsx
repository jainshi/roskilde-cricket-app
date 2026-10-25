import React from "react";
import Link from "next/link";
import Image from "next/image";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getDictionary } from "@/i18n/get-dictionary";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, UserPlus, Users, ArrowRightLeft, BookOpen, User, ShieldAlert } from "lucide-react";
import { getActiveContext } from "@/modules/auth-rbac/services/context.service";
import { getLinkedYouthForParent } from "@/modules/auth-rbac/services/parent-child.service";
import { ProfileSwitcher } from "@/components/profile-switcher";
import { switchContextAction } from "@/modules/auth-rbac/actions/context.actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireActivatedSession();
  const dict = getDictionary("en");
  const isAdmin = session.roles.includes("ADMIN");

  const [context, linkedYouth] = await Promise.all([
    getActiveContext(),
    getLinkedYouthForParent(session.memberProfileId),
  ]);

  const isDelegated = context?.isDelegated ?? false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar with Official RCC Logo */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0c2340]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group focus:outline-none"
            >
              <div className="relative w-9 h-9 rounded-md overflow-hidden shadow-sm border border-sky-400/30 flex-shrink-0">
                <Image
                  src="/cyan-logo.jpg"
                  alt="Roskilde Cricket Club Logo"
                  width={36}
                  height={36}
                  priority
                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-base font-serif font-bold text-white tracking-widest uppercase leading-none mb-0.5 group-hover:text-sky-400 transition-colors">
                  Roskilde
                </span>
                <span className="text-[0.6rem] font-sans font-medium text-sky-200 tracking-[0.25em] uppercase">
                  Cricket Club
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-2 text-sm ml-2">
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center gap-1.5"
              >
                <LayoutDashboard className="w-4 h-4 text-sky-400" />
                <span>{dict.common.dashboard}</span>
              </Link>
              <Link
                href="/directory"
                className="px-3 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="w-4 h-4 text-sky-400" />
                <span>Directory</span>
              </Link>
              <Link
                href="/profile"
                className="px-3 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center gap-1.5"
              >
                <User className="w-4 h-4 text-sky-400" />
                <span>Profile</span>
              </Link>
              {isAdmin && (
                <>
                  <Link
                    href="/admin/members"
                    className="px-3 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center gap-1.5"
                  >
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>All Members</span>
                  </Link>
                  <Link
                    href="/admin/members/new"
                    className="px-3 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4 text-sky-400" />
                    <span>{dict.dashboard.onboardMember}</span>
                  </Link>
                  <Link
                    href="/admin/gdpr"
                    className="px-3 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center gap-1.5"
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>GDPR Console</span>
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Header Profile Switcher for Parents */}
            {linkedYouth.length > 0 && (
              <ProfileSwitcher
                parentProfileId={session.memberProfileId}
                parentName={`${session.firstName} ${session.lastName}`.trim()}
                activeProfileId={context?.activeProfileId || session.memberProfileId}
                isDelegated={isDelegated}
                linkedChildren={linkedYouth.map((ly) => ({
                  id: ly.playerId,
                  name: ly.playerName,
                }))}
              />
            )}

            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-white leading-tight">
                {session.firstName} {session.lastName}
              </p>
              <p className="text-xs text-sky-300/80 font-mono">
                {session.roles.join(" • ")}
              </p>
            </div>

            <form action="/api/auth/signout" method="POST">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span className="hidden md:inline">{dict.common.signOut}</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Pitch-Side Context Delegation Banner */}
      {isDelegated && context?.targetChild && (
        <div className="bg-amber-950/90 border-b border-amber-500/60 text-amber-200 px-4 py-2 text-xs shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span>
                Pitch-Side Active Context: Managing on behalf of{" "}
                <strong className="text-white underline">
                  {context.targetChild.name}
                </strong>{" "}
                (Linked Youth Player)
              </span>
            </div>
            <form
              action={async () => {
                "use server";
                await switchContextAction(session.memberProfileId);
              }}
            >
              <button
                type="submit"
                className="text-xs font-semibold text-amber-300 hover:text-white underline underline-offset-2 transition-colors flex items-center gap-1"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Switch back to My Profile ({session.firstName})
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#0c2340]/60 py-6 text-center text-xs text-slate-400">
        Roskilde Cricket Club &bull; Danmarks Cricket Forbund (DCF) &bull; Member Portal
      </footer>
    </div>
  );
}
