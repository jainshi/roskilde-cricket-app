"use client";

import React, { useState, useTransition } from "react";
import {
  Building2,
  Plus,
  MapPin,
  Users,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import {
  createFacilityAction,
  updateFacilityAction,
} from "@/modules/teams-matches/actions/event.actions";
import { FacilityType } from "@prisma/client";

interface FacilityWithEvents {
  id: string;
  name: string;
  facilityType: FacilityType;
  location: string | null;
  capacity: number | null;
  isActive: boolean;
  _count: {
    scheduledEvents: number;
  };
  scheduledEvents?: Array<{
    id: string;
    title: string;
    startAt: Date | string;
    endAt: Date | string;
    lifecycleStatus: string;
    collisionOverrideReason?: string | null;
    teamSquad?: { name: string };
  }>;
}

interface FacilityManagerProps {
  facilities: FacilityWithEvents[];
}

export function FacilityManager({ facilities }: FacilityManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Create Form State
  const [name, setName] = useState("");
  const [facilityType, setFacilityType] = useState<FacilityType>("PRACTICE_NETS");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState<number | "">("");

  function handleCreateFacility(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    startTransition(async () => {
      const res = await createFacilityAction({
        name: name.trim(),
        facilityType,
        location: location.trim() || null,
        capacity: capacity ? Number(capacity) : null,
        isActive: true,
      });

      if (res.success) {
        setIsCreateOpen(false);
        setName("");
        setLocation("");
        setCapacity("");
      } else {
        setErrorMsg(res.error || "Failed to create facility.");
      }
    });
  }

  function handleToggleActive(facilityId: string, currentActive: boolean) {
    startTransition(async () => {
      await updateFacilityAction({
        id: facilityId,
        isActive: !currentActive,
      });
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Club Grounds &amp; Facilities ({facilities.length})
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage grounds, practice nets, and indoor halls used for match fixtures and training sessions.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.98] shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Facility
        </button>
      </div>

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {facilities.map((facility) => {
          const typeBadgeColor =
            facility.facilityType === "MAIN_PITCH"
              ? "bg-emerald-950/80 border-emerald-800 text-emerald-400"
              : facility.facilityType === "PRACTICE_NETS"
              ? "bg-sky-950/80 border-sky-800 text-sky-400"
              : facility.facilityType === "INDOOR_HALL"
              ? "bg-indigo-950/80 border-indigo-800 text-indigo-400"
              : "bg-slate-800 border-slate-700 text-slate-300";

          return (
            <div
              key={facility.id}
              className={`bg-slate-900 border rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all ${
                facility.isActive
                  ? "border-slate-800 hover:border-slate-700/80"
                  : "border-slate-800/40 opacity-60"
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${typeBadgeColor}`}
                  >
                    {facility.facilityType.replace("_", " ")}
                  </span>

                  <button
                    onClick={() => handleToggleActive(facility.id, facility.isActive)}
                    disabled={isPending}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                      facility.isActive
                        ? "bg-emerald-950/50 border-emerald-800/60 text-emerald-300 hover:bg-red-950/40 hover:text-red-300 hover:border-red-800/50"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    {facility.isActive ? "Active Ground" : "Disabled"}
                  </button>
                </div>

                <h3 className="text-base font-bold text-white mb-1">
                  {facility.name}
                </h3>

                {facility.location && (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{facility.location}</span>
                  </p>
                )}

                {facility.capacity && (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-2">
                    <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Capacity: {facility.capacity} persons</span>
                  </p>
                )}
              </div>

              {/* Booking count summary */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  Upcoming Bookings:
                </span>
                <span className="font-bold text-white font-mono">
                  {facility._count.scheduledEvents}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Facility Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                Add Club Facility
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateFacility} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Facility Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Poppelgårdsvej Main Pitch"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Facility Type
                </label>
                <select
                  value={facilityType}
                  onChange={(e) => setFacilityType(e.target.value as FacilityType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="MAIN_PITCH">Main Pitch (Match Ground)</option>
                  <option value="PRACTICE_NETS">Practice Nets</option>
                  <option value="INDOOR_HALL">Indoor Hall</option>
                  <option value="CLUBHOUSE">Clubhouse / Pavilion</option>
                  <option value="OTHER">Other Ground Resource</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Location / Address
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Poppelgårdsvej 25, 4000 Roskilde"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Max Capacity (Optional)
                </label>
                <input
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value ? Number(e.target.value) : "")}
                  placeholder="e.g. 50"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                >
                  {isPending ? "Creating..." : "Save Facility"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
