"use client";

import React, { useState } from "react";
import { EventForm } from "./event-form";
import { RecurringTrainingForm } from "./recurring-training-form";
import { Calendar, Repeat, Sparkles } from "lucide-react";

interface SquadItem {
  id: string;
  name: string;
  category: string;
  defaultLineupSize: number;
}

interface FacilityItem {
  id: string;
  name: string;
  facilityType: string;
  location?: string | null;
}

interface EquipmentLoanItem {
  id: string;
  equipmentItemName: string;
  assetTag?: string | null;
  expectedReturnAt: string;
}

interface NewEventTabsProps {
  squads: SquadItem[];
  facilities: FacilityItem[];
  equipmentLoans?: EquipmentLoanItem[];
  isAdmin: boolean;
}

export function NewEventTabs({
  squads,
  facilities,
  equipmentLoans = [],
  isAdmin,
}: NewEventTabsProps) {
  const [activeTab, setActiveTab] = useState<"SINGLE" | "RECURRING">("SINGLE");

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("SINGLE")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "SINGLE"
              ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Single Fixture / Session
        </button>

        <button
          onClick={() => setActiveTab("RECURRING")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "RECURRING"
              ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Repeat className="w-4 h-4" />
          Recurring Weekly Training
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
            Presets
          </span>
        </button>
      </div>

      {/* Active Form */}
      {activeTab === "SINGLE" ? (
        <EventForm
          squads={squads}
          facilities={facilities}
          equipmentLoans={equipmentLoans}
          isAdmin={isAdmin}
        />
      ) : (
        <RecurringTrainingForm
          squads={squads}
          facilities={facilities}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
