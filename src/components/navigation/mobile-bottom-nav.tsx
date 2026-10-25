"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  BookOpen,
  Menu,
  ArrowRightLeft,
  User,
} from "lucide-react";

interface MobileBottomNavProps {
  isOfficial: boolean;
  onOpenMenu: () => void;
  isMenuOpen: boolean;
}

export function MobileBottomNav({
  isOfficial,
  onOpenMenu,
  isMenuOpen,
}: MobileBottomNavProps) {
  const pathname = usePathname();

  const isTabActive = (path: string) => {
    if (path === "/dashboard" && pathname === "/dashboard") return true;
    if (path !== "/dashboard" && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-950/92 backdrop-blur-xl border-t border-slate-800/80 shadow-2xl pb-safe transition-all"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {/* Tab 1: Dashboard */}
        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all group ${
            isTabActive("/dashboard") && !isMenuOpen
              ? "text-sky-400 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className="relative p-1">
            <LayoutDashboard className="w-5 h-5 transition-transform group-active:scale-90" />
            {isTabActive("/dashboard") && !isMenuOpen && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-400 shadow-sm shadow-sky-400" />
            )}
          </div>
          <span className="text-[10px] tracking-tight leading-none mt-0.5">Home</span>
        </Link>

        {/* Tab 2: My Gear */}
        <Link
          href="/profile/gear"
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all group ${
            isTabActive("/profile/gear") && !isMenuOpen
              ? "text-emerald-400 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className="relative p-1">
            <Package className="w-5 h-5 transition-transform group-active:scale-90" />
            {isTabActive("/profile/gear") && !isMenuOpen && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
            )}
          </div>
          <span className="text-[10px] tracking-tight leading-none mt-0.5">My Gear</span>
        </Link>

        {/* Tab 3: Official Center Action (Pitch-Side Check-Out) OR Profile */}
        {isOfficial ? (
          <Link
            href="/inventory/checkout"
            className="flex flex-col items-center justify-center -mt-4 group"
            title="Pitch-Side Fast Check-Out"
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform group-active:scale-95 ${
                pathname === "/inventory/checkout"
                  ? "bg-emerald-500 text-white shadow-emerald-500/40 ring-4 ring-emerald-500/20"
                  : "bg-emerald-600 text-white shadow-emerald-950/60 hover:bg-emerald-500"
              }`}
            >
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-bold text-emerald-400 mt-1 uppercase tracking-wider">
              Check-Out
            </span>
          </Link>
        ) : (
          <Link
            href="/profile"
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all group ${
              isTabActive("/profile") && !isMenuOpen
                ? "text-sky-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <div className="relative p-1">
              <User className="w-5 h-5 transition-transform group-active:scale-90" />
              {isTabActive("/profile") && !isMenuOpen && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-400" />
              )}
            </div>
            <span className="text-[10px] tracking-tight leading-none mt-0.5">Profile</span>
          </Link>
        )}

        {/* Tab 4: Directory */}
        <Link
          href="/directory"
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all group ${
            isTabActive("/directory") && !isMenuOpen
              ? "text-sky-400 font-semibold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className="relative p-1">
            <BookOpen className="w-5 h-5 transition-transform group-active:scale-90" />
            {isTabActive("/directory") && !isMenuOpen && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-400" />
            )}
          </div>
          <span className="text-[10px] tracking-tight leading-none mt-0.5">Members</span>
        </Link>

        {/* Tab 5: Menu / Drawer Toggle */}
        <button
          onClick={onOpenMenu}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all group ${
            isMenuOpen ? "text-sky-400 font-semibold" : "text-slate-400 hover:text-slate-200"
          }`}
          aria-label="Open full menu"
        >
          <div className="relative p-1">
            <Menu className="w-5 h-5 transition-transform group-active:scale-90" />
            {isMenuOpen && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-400" />
            )}
          </div>
          <span className="text-[10px] tracking-tight leading-none mt-0.5">Menu</span>
        </button>
      </div>
    </nav>
  );
}
