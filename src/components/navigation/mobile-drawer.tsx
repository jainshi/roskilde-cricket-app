"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  X,
  LayoutDashboard,
  BookOpen,
  User,
  Shield,
  ShieldAlert,
  Calendar,
  Package,
  ArrowRightLeft,
  CheckCircle2,
  Users,
  UserPlus,
  LogOut,
  UserCheck,
  CreditCard,
} from "lucide-react";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
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
}

export function MobileDrawer({
  isOpen,
  onClose,
  session,
  isAdmin,
  isOfficial,
  isDelegated,
  activeContextName,
}: MobileDrawerProps) {
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);

  // Close drawer ONLY when user navigates to a new page
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isActive = (path: string) => pathname === path;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-xs sm:max-w-sm bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-sky-400/40">
              <Image
                src="/cyan-logo.jpg"
                alt="RCC"
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-xs font-serif font-bold text-white uppercase tracking-wider">
                Roskilde CC
              </p>
              <p className="text-[10px] text-sky-400 font-mono">App Launchpad</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-3.5 bg-gradient-to-b from-slate-950/60 to-transparent border-b border-slate-800/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-sm shadow-sm">
              {session.firstName[0]}
              {session.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {session.firstName} {session.lastName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-950 border border-sky-800 text-sky-300">
                  {session.roles[0] || "Member"}
                </span>
                {session.roles.length > 1 && (
                  <span className="text-[10px] text-slate-400">
                    +{session.roles.length - 1} more
                  </span>
                )}
              </div>
            </div>
          </div>

          {isDelegated && (
            <div className="mt-2.5 p-2 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-center gap-2 text-xs text-amber-300">
              <UserCheck className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="truncate">Managing for: {activeContextName}</span>
            </div>
          )}
        </div>

        {/* App Launcher 2-Column Grid */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 touch-pan-y">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              App Launcher
            </span>
            <span className="text-[10px] text-sky-400/90 font-mono">
              {isAdmin ? "Admin Suite" : isOfficial ? "Coach Suite" : "Member Portal"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. Dashboard */}
            <Link
              href="/dashboard"
              onClick={onClose}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all active:scale-[0.98] ${
                isActive("/dashboard")
                  ? "bg-sky-500/15 border-sky-500/40 text-white shadow-md shadow-sky-950/30"
                  : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/80 text-slate-200"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-2">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Dashboard</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Overview &amp; notice</p>
              </div>
            </Link>

            {/* 2. Teams & Squads */}
            <Link
              href="/teams"
              onClick={onClose}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all active:scale-[0.98] ${
                isActive("/teams") || pathname.startsWith("/teams/")
                  ? "bg-emerald-500/15 border-emerald-500/40 text-white shadow-md shadow-emerald-950/30"
                  : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/80 text-slate-200"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Teams &amp; Squads</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Rosters &amp; captains</p>
              </div>
            </Link>

            {/* 3. Events & Fixtures */}
            <Link
              href="/events"
              onClick={onClose}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all active:scale-[0.98] ${
                isActive("/events") || pathname.startsWith("/events/")
                  ? "bg-sky-500/15 border-sky-500/40 text-white shadow-md shadow-sky-950/30"
                  : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/80 text-slate-200"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-2">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Events</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Fixtures &amp; nets</p>
              </div>
            </Link>

            {/* 4. My Gear */}
            <Link
              href="/profile/gear"
              onClick={onClose}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all active:scale-[0.98] ${
                isActive("/profile/gear")
                  ? "bg-emerald-500/15 border-emerald-500/40 text-white shadow-md shadow-emerald-950/30"
                  : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/80 text-slate-200"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">My Gear</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Personal loans</p>
              </div>
            </Link>

            {/* 3. Equipment Hub (If Official/Admin) */}
            {isOfficial && (
              <Link
                href="/inventory"
                onClick={onClose}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all active:scale-[0.98] ${
                  isActive("/inventory")
                    ? "bg-sky-500/15 border-sky-500/40 text-white shadow-md shadow-sky-950/30"
                    : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/80 text-slate-200"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-2">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">Equipment Hub</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Catalog &amp; stock</p>
                </div>
              </Link>
            )}

            {/* 4. Club Directory */}
            <Link
              href="/directory"
              onClick={onClose}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all active:scale-[0.98] ${
                isActive("/directory")
                  ? "bg-cyan-500/15 border-cyan-500/40 text-white shadow-md shadow-cyan-950/30"
                  : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/80 text-slate-200"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Directory</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Players &amp; staff</p>
              </div>
            </Link>

            {/* 5. Billing & Fees (For All Members & Parents) */}
            <Link
              href="/billing"
              onClick={onClose}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all active:scale-[0.98] ${
                isActive("/billing")
                  ? "bg-amber-500/15 border-amber-500/40 text-white shadow-md shadow-amber-950/30"
                  : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/80 text-slate-200"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Billing &amp; Fees</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Family invoices &amp; pay</p>
              </div>
            </Link>

            {/* 6. Finance & Plans (If Admin) */}
            {isAdmin && (
              <Link
                href="/admin/finance/plans"
                onClick={onClose}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all active:scale-[0.98] ${
                  isActive("/admin/finance") || pathname.startsWith("/admin/finance")
                    ? "bg-sky-500/15 border-sky-500/40 text-white shadow-md shadow-sky-950/30"
                    : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/80 text-slate-200"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-2">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">Finance &amp; Plans</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Rates &amp; subscriptions</p>
                </div>
              </Link>
            )}

            {/* 5. Club Admin / Manage Members (If Admin) */}
            {isAdmin && (
              <Link
                href="/admin/members"
                onClick={onClose}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all active:scale-[0.98] ${
                  isActive("/admin/members")
                    ? "bg-indigo-500/15 border-indigo-500/40 text-white shadow-md shadow-indigo-950/30"
                    : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/80 text-slate-200"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">Admin Console</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Members &amp; roles</p>
                </div>
              </Link>
            )}

            {/* 6. GDPR Compliance (If Admin) */}
            {isAdmin && (
              <Link
                href="/admin/gdpr"
                onClick={onClose}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all active:scale-[0.98] ${
                  isActive("/admin/gdpr")
                    ? "bg-rose-500/15 border-rose-500/40 text-white shadow-md shadow-rose-950/30"
                    : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/80 text-slate-200"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-2">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">GDPR Console</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Art. 17 Erasure</p>
                </div>
              </Link>
            )}

            {/* 7. Onboard New Member (If Admin) */}
            {isAdmin && (
              <Link
                href="/admin/members/new"
                onClick={onClose}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all active:scale-[0.98] ${
                  isActive("/admin/members/new")
                    ? "bg-sky-500/15 border-sky-500/40 text-white shadow-md shadow-sky-950/30"
                    : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/80 text-slate-200"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-2">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">Onboard</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Register member</p>
                </div>
              </Link>
            )}

            {/* 8. Account Profile & Security */}
            <Link
              href="/profile"
              onClick={onClose}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all active:scale-[0.98] ${
                isActive("/profile") || isActive("/profile/security") || isActive("/profile/privacy")
                  ? "bg-slate-800/90 border-slate-700 text-white shadow-md"
                  : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/80 text-slate-200"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center mb-2">
                <User className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">My Profile</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Account &amp; security</p>
              </div>
            </Link>
          </div>

          {/* Fast Pitch-Side Shortcuts (If Official/Admin) */}
          {isOfficial && (
            <div className="pt-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2 px-0.5">
                Pitch-Side Shortcuts
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/inventory/checkout"
                  onClick={onClose}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-semibold hover:bg-emerald-900/40 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Fast Check-Out</span>
                </Link>

                <Link
                  href="/inventory/checkin"
                  onClick={onClose}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Return Gear</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Sign Out */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/90">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-red-950/40 text-slate-300 hover:text-red-400 border border-slate-700/80 hover:border-red-800/50 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
