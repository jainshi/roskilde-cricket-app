"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SanitizedDirectoryMember } from "@/modules/auth-rbac/domain/directory-privacy";
import {
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Lock,
  User,
  Shield,
  Award,
  ChevronRight,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DirectoryBrowserProps {
  initialMembers: SanitizedDirectoryMember[];
  currentUserId: string;
}

export function DirectoryBrowser({ initialMembers, currentUserId }: DirectoryBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [battingFilter, setBattingFilter] = useState("ALL");
  const [bowlingFilter, setBowlingFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const filteredMembers = useMemo(() => {
    return initialMembers.filter((m) => {
      // 1. Search Query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName =
          m.fullName.toLowerCase().includes(q) ||
          m.firstName.toLowerCase().includes(q) ||
          m.lastName.toLowerCase().includes(q);
        if (!matchesName) return false;
      }

      // 2. Role Filter
      if (roleFilter !== "ALL") {
        if (!m.roles.includes(roleFilter as any)) return false;
      }

      // 3. Batting Position Filter
      if (battingFilter !== "ALL") {
        if (m.battingPosition !== battingFilter) return false;
      }

      // 4. Bowling Style Filter
      if (bowlingFilter !== "ALL") {
        if (m.bowlingStyle !== bowlingFilter) return false;
      }

      // 5. Age Category Filter
      if (categoryFilter !== "ALL") {
        if (m.ageCategory !== categoryFilter) return false;
      }

      return true;
    });
  }, [initialMembers, searchQuery, roleFilter, battingFilter, bowlingFilter, categoryFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    roleFilter !== "ALL" ||
    battingFilter !== "ALL" ||
    bowlingFilter !== "ALL" ||
    categoryFilter !== "ALL";

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("ALL");
    setBattingFilter("ALL");
    setBowlingFilter("ALL");
    setCategoryFilter("ALL");
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Toolbar */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search club members by name (e.g. Hansen, Mikkel)..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Role Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Club Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">All Roles</option>
              <option value="PLAYER">Player</option>
              <option value="COACH">Coach</option>
              <option value="AD_HOC_COACH">Ad-Hoc Coach</option>
              <option value="PARENT">Parent</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>

          {/* Age Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Age Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">All Categories</option>
              <option value="ADULT">Adult / Senior</option>
              <option value="YOUTH_13_17">Youth (13–17)</option>
              <option value="YOUTH_UNDER_13">Youth (Under 13)</option>
            </select>
          </div>

          {/* Batting Position Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Batting Order</label>
            <select
              value={battingFilter}
              onChange={(e) => setBattingFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">All Batting Positions</option>
              <option value="OPENING_BATTER">Opening Batter</option>
              <option value="TOP_ORDER">Top-Order</option>
              <option value="MIDDLE_ORDER">Middle-Order</option>
              <option value="FINISHER">Finisher</option>
              <option value="TAILENDER">Tailender</option>
            </select>
          </div>

          {/* Bowling Style Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Bowling Style</label>
            <select
              value={bowlingFilter}
              onChange={(e) => setBowlingFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">All Bowling Styles</option>
              <option value="RIGHT_ARM_FAST">Right-Arm Fast</option>
              <option value="RIGHT_ARM_MEDIUM">Right-Arm Medium</option>
              <option value="LEFT_ARM_FAST">Left-Arm Fast</option>
              <option value="LEFT_ARM_MEDIUM">Left-Arm Medium</option>
              <option value="OFF_SPIN">Off-Spin</option>
              <option value="LEG_SPIN">Leg-Spin</option>
              <option value="LEFT_ARM_ORTHODOX">Left-Arm Orthodox</option>
              <option value="DOES_NOT_BOWL">Does Not Bowl</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset Bar */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
          <span className="text-slate-400">
            Showing <strong className="text-white">{filteredMembers.length}</strong> of{" "}
            {initialMembers.length} club members
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Directory Member Cards Grid */}
      {filteredMembers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 space-y-3">
          <User className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-white">No club members found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No member matched your search filters. Try adjusting the search query or clearing role/bowling filters.
          </p>
          <Button
            onClick={clearFilters}
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-800 text-slate-300"
          >
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMembers.map((member) => {
            const isSelf = member.id === currentUserId;
            const initials = `${member.firstName[0] || ""}${member.lastName[0] || ""}`.toUpperCase();

            return (
              <div
                key={member.id}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-5 shadow-lg flex flex-col justify-between transition-all hover:shadow-xl hover:bg-slate-900 group"
              >
                <div>
                  {/* Card Header: Avatar & Name */}
                  <div className="flex items-start gap-3.5 pb-3 border-b border-slate-800">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-600 to-[#0c2340] border border-sky-500/40 flex items-center justify-center font-black text-white text-base shadow-md shrink-0">
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white text-base truncate group-hover:text-sky-300 transition-colors">
                          {member.fullName}
                        </h3>
                        {isSelf && (
                          <span className="px-1.5 py-0.2 rounded bg-sky-950 border border-sky-800 text-sky-400 text-[10px] font-bold uppercase">
                            You
                          </span>
                        )}
                      </div>

                      {/* Category & Roles */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {member.isMinor ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-950/80 border border-sky-700/60 text-sky-300">
                            {member.ageCategory === "YOUTH_UNDER_13" ? "Youth U13" : "Youth 13–17"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
                            Adult
                          </span>
                        )}

                        {member.roles.map((r) => (
                          <span
                            key={r}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cricket Attributes (FR-054) */}
                  <div className="py-3 space-y-1.5 text-xs border-b border-slate-800/80">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Batting:</span>
                      <span className="text-slate-200 font-medium">
                        {member.battingPosition ? member.battingPosition.replace(/_/g, " ") : "Not set"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Bowling:</span>
                      <span className="text-slate-200 font-medium">
                        {member.bowlingStyle ? member.bowlingStyle.replace(/_/g, " ") : "Not set"}
                      </span>
                    </div>

                    {member.secondaryRoles.length > 0 && (
                      <div className="flex items-center justify-between text-slate-400 pt-0.5">
                        <span>Role:</span>
                        <div className="flex gap-1 flex-wrap">
                          {member.secondaryRoles.map((sr) => (
                            <span
                              key={sr}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950/60 border border-amber-800 text-amber-300 font-semibold"
                            >
                              {sr === "WICKETKEEPER" ? "WK" : "All-Rounder"}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contact Details with Privacy Masking (FR-054, FR-055, FR-056) */}
                  <div className="py-3 space-y-1.5 text-xs text-slate-400">
                    {/* Email */}
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {member.email ? (
                        <a
                          href={`mailto:${member.email}`}
                          className="text-sky-400 hover:text-sky-300 underline underline-offset-2 truncate"
                        >
                          {member.email}
                        </a>
                      ) : (
                        <span className="text-slate-500 italic flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-600" />
                          Email: Private
                        </span>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="flex items-center gap-2 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {member.phone ? (
                        <a
                          href={`tel:${member.phone}`}
                          className="text-sky-400 hover:text-sky-300 underline underline-offset-2 truncate"
                        >
                          {member.phone}
                        </a>
                      ) : (
                        <span className="text-slate-500 italic flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-600" />
                          Phone: Private
                        </span>
                      )}
                    </div>

                    {/* City */}
                    {member.city && (
                      <div className="flex items-center gap-2 truncate text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{member.city}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action: View Profile */}
                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <Link
                    href={`/profile/${member.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/70 border border-sky-600/50 hover:bg-sky-900/80 text-sky-300 text-xs font-semibold transition-colors"
                  >
                    <span>View Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
