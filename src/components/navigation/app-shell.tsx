"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  User,
  Package,
  Users,
  UserPlus,
  ShieldAlert,
  Shield,
  Calendar,
  LogOut,
  Menu,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileSwitcher } from "@/components/profile-switcher";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { MobileDrawer } from "./mobile-drawer";

interface AppShellProps {
  children: React.ReactNode;
  session: {
    firstName: string;
    lastName: string;
    email: string | null;
    roles: string[];
    memberProfileId: string;
  };
  isAdmin: boolean;
  isOfficial: boolean;
  isDelegated: boolean;
  activeContextName?: string;
  linkedYouth: Array<{ playerId: string; playerName: string }>;
  activeProfileId: string;
}

export function AppShell({
  children,
  session,
  isAdmin,
  isOfficial,
  isDelegated,
  activeContextName,
  linkedYouth,
  activeProfileId,
}: AppShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();

  const handleCloseDrawer = React.useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const handleToggleDrawer = React.useCallback(() => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  const isNavActive = (path: string) => {
    if (path === "/dashboard" && pathname === "/dashboard") return true;
    if (path !== "/dashboard" && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-[#0c2340]/95 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          {/* Logo & Desktop Nav */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none shrink-0"
            >
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-md overflow-hidden shadow-sm border border-sky-400/30 flex-shrink-0">
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
                <span className="text-sm sm:text-base font-serif font-bold text-white tracking-wider sm:tracking-widest uppercase leading-none mb-0.5 group-hover:text-sky-400 transition-colors">
                  Roskilde
                </span>
                <span className="text-[0.55rem] sm:text-[0.6rem] font-sans font-medium text-sky-200 tracking-[0.2em] sm:tracking-[0.25em] uppercase">
                  Cricket Club
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links (Hidden on Mobile) */}
            <nav className="hidden md:flex items-center gap-1 text-sm ml-2">
              <Link
                href="/dashboard"
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  isNavActive("/dashboard")
                    ? "bg-slate-800 text-white font-medium"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-sky-400" />
                <span>Dashboard</span>
              </Link>

              <Link
                href="/teams"
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  isNavActive("/teams")
                    ? "bg-slate-800 text-white font-medium"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Teams</span>
              </Link>

              <Link
                href="/events"
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  isNavActive("/events")
                    ? "bg-slate-800 text-white font-medium"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>Events</span>
              </Link>

              <Link
                href="/profile/gear"
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  isNavActive("/profile/gear")
                    ? "bg-emerald-950/60 text-emerald-300 font-medium border border-emerald-800/40"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <Package className="w-4 h-4 text-emerald-400" />
                <span>My Gear</span>
              </Link>

              <Link
                href="/directory"
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  isNavActive("/directory")
                    ? "bg-slate-800 text-white font-medium"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <BookOpen className="w-4 h-4 text-sky-400" />
                <span>Directory</span>
              </Link>

              <Link
                href="/profile"
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  isNavActive("/profile") && !pathname.startsWith("/profile/gear")
                    ? "bg-slate-800 text-white font-medium"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <User className="w-4 h-4 text-sky-400" />
                <span>Profile</span>
              </Link>

              {isOfficial && (
                <Link
                  href="/inventory"
                  className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                    isNavActive("/inventory")
                      ? "bg-sky-950/60 text-sky-300 font-medium border border-sky-800/40"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                  }`}
                >
                  <Package className="w-4 h-4 text-sky-400" />
                  <span>Equipment</span>
                </Link>
              )}

              {isAdmin && (
                <>
                  <Link
                    href="/admin/members"
                    className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                      isNavActive("/admin/members")
                        ? "bg-slate-800 text-white font-medium"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                    }`}
                  >
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>Members</span>
                  </Link>

                  <Link
                    href="/admin/members/new"
                    className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                      isNavActive("/admin/members/new")
                        ? "bg-slate-800 text-white font-medium"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                    }`}
                  >
                    <UserPlus className="w-4 h-4 text-sky-400" />
                    <span>Onboard</span>
                  </Link>

                  <Link
                    href="/admin/gdpr"
                    className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                      isNavActive("/admin/gdpr")
                        ? "bg-rose-950/60 text-rose-300 font-medium border border-rose-800/40"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>GDPR</span>
                  </Link>
                </>
              )}

              {(isAdmin || session.roles.includes("TREASURER")) && (
                <>
                  <Link
                    href="/admin/finance"
                    className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                      pathname === "/admin/finance"
                        ? "bg-sky-950/60 text-sky-300 font-medium border border-sky-800/40"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-sky-400" />
                    <span>Treasurer Hub</span>
                  </Link>

                  <Link
                    href="/admin/finance/plans"
                    className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                      isNavActive("/admin/finance/plans")
                        ? "bg-sky-950/60 text-sky-300 font-medium border border-sky-800/40"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-sky-400" />
                    <span>Plans &amp; Rates</span>
                  </Link>

                  <Link
                    href="/admin/finance/reports"
                    className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                      isNavActive("/admin/finance/reports")
                        ? "bg-sky-950/60 text-sky-300 font-medium border border-sky-800/40"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-sky-400" />
                    <span>Reports</span>
                  </Link>
                </>
              )}

              <Link
                href="/billing"
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  isNavActive("/billing")
                    ? "bg-amber-950/60 text-amber-300 font-medium border border-amber-800/40"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Billing</span>
              </Link>
            </nav>
          </div>

          {/* Right Header Controls (Desktop and Mobile) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Header Profile Switcher for Parents */}
            {linkedYouth.length > 0 && (
              <ProfileSwitcher
                parentProfileId={session.memberProfileId}
                parentName={`${session.firstName} ${session.lastName}`.trim()}
                activeProfileId={activeProfileId}
                isDelegated={isDelegated}
                linkedChildren={linkedYouth.map((ly) => ({
                  id: ly.playerId,
                  name: ly.playerName,
                }))}
              />
            )}

            {/* Desktop User Info */}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-white leading-tight">
                {session.firstName} {session.lastName}
              </p>
              <p className="text-xs text-sky-300/80 font-mono">
                {session.roles[0] || "Member"}
              </p>
            </div>

            {/* Desktop Sign Out */}
            <form action="/api/auth/signout" method="POST" className="hidden md:block">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span className="hidden lg:inline">Sign Out</span>
              </Button>
            </form>

            {/* Mobile Hamburger / Profile Button */}
            <button
              onClick={handleToggleDrawer}
              className="md:hidden p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              aria-label="Toggle mobile menu"
            >
              <Menu className="w-5 h-5 text-sky-400" />
              <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold flex items-center justify-center">
                {session.firstName[0]}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Content with Mobile Bottom Padding */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <MobileBottomNav
        isOfficial={isOfficial}
        onOpenMenu={handleToggleDrawer}
        isMenuOpen={isDrawerOpen}
      />

      {/* Mobile Slide-over Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        session={session}
        isAdmin={isAdmin}
        isOfficial={isOfficial}
        isDelegated={isDelegated}
        activeContextName={activeContextName}
      />
    </div>
  );
}
