"use client";

import React, { useEffect } from "react";
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
  Package,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Wrench,
  Users,
  UserPlus,
  LogOut,
  ChevronRight,
  UserCheck,
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

  // Close drawer when pathname changes
  useEffect(() => {
    onClose();
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
      <div className="relative w-full max-w-xs bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
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
              <p className="text-[10px] text-sky-400 font-mono">Member Navigation</p>
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
        <div className="p-4 bg-gradient-to-b from-slate-950/40 to-transparent border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-sm">
              {session.firstName[0]}
              {session.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {session.firstName} {session.lastName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-950 border border-sky-800/80 text-sky-300">
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
            <div className="mt-3 p-2 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-center gap-2 text-xs text-amber-300">
              <UserCheck className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="truncate">Active Youth: {activeContextName}</span>
            </div>
          )}
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 touch-pan-y">
          {/* Main Links */}
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              General
            </p>
            <div className="space-y-0.5">
              <Link
                href="/dashboard"
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive("/dashboard")
                    ? "bg-sky-500/15 text-sky-400 border border-sky-500/20"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4 text-sky-400" />
                  <span>Dashboard</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </Link>

              <Link
                href="/profile/gear"
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive("/profile/gear")
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span>My Gear &amp; Loans</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </Link>

              <Link
                href="/directory"
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive("/directory")
                    ? "bg-sky-500/15 text-sky-400 border border-sky-500/20"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-sky-400" />
                  <span>Club Directory</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </Link>
            </div>
          </div>

          {/* Equipment Operations (Coach/Admin) */}
          {isOfficial && (
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Equipment Operations
              </p>
              <div className="space-y-0.5">
                <Link
                  href="/inventory"
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive("/inventory")
                      ? "bg-sky-500/15 text-sky-400 border border-sky-500/20"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4 text-sky-400" />
                    <span>Master Catalog</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </Link>

                <Link
                  href="/inventory/checkout"
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive("/inventory/checkout")
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                    <span>Pitch-Side Check-Out</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </Link>

                <Link
                  href="/inventory/checkin"
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive("/inventory/checkin")
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Check-In &amp; Return</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </Link>

                <Link
                  href="/inventory/extensions"
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive("/inventory/extensions")
                      ? "bg-sky-500/15 text-sky-400 border border-sky-500/20"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-sky-400" />
                    <span>Extensions Queue</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </Link>

                <Link
                  href="/inventory/damage"
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive("/inventory/damage")
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Wrench className="w-4 h-4 text-amber-400" />
                    <span>Damage Reports</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </Link>
              </div>
            </div>
          )}

          {/* Administration (Admin only) */}
          {isAdmin && (
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Club Administration
              </p>
              <div className="space-y-0.5">
                <Link
                  href="/admin/members"
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive("/admin/members")
                      ? "bg-sky-500/15 text-sky-400 border border-sky-500/20"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>Manage Members</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </Link>

                <Link
                  href="/admin/members/new"
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive("/admin/members/new")
                      ? "bg-sky-500/15 text-sky-400 border border-sky-500/20"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserPlus className="w-4 h-4 text-sky-400" />
                    <span>Onboard Member</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </Link>

                <Link
                  href="/admin/gdpr"
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive("/admin/gdpr")
                      ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>GDPR Console</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </Link>
              </div>
            </div>
          )}

          {/* Account Settings */}
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Account
            </p>
            <div className="space-y-0.5">
              <Link
                href="/profile"
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive("/profile")
                    ? "bg-sky-500/15 text-sky-400 border border-sky-500/20"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-sky-400" />
                  <span>My Profile</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </Link>

              <Link
                href="/profile/security"
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive("/profile/security")
                    ? "bg-sky-500/15 text-sky-400 border border-sky-500/20"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-sky-400" />
                  <span>Security &amp; Password</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </Link>

              <Link
                href="/profile/privacy"
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive("/profile/privacy")
                    ? "bg-sky-500/15 text-sky-400 border border-sky-500/20"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-sky-400" />
                  <span>Privacy &amp; GDPR</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </Link>
            </div>
          </div>
        </div>

        {/* Footer with Sign Out */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-red-950/40 text-slate-300 hover:text-red-400 border border-slate-700/80 hover:border-red-800/50 text-sm font-semibold transition-colors"
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
