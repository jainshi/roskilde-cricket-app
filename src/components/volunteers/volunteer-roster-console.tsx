"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  PlusCircle,
  Clock,
  Flag,
  Shield,
  Coffee,
  Car,
  UserCheck,
  AlertCircle,
  X,
  Loader2,
  CheckCircle2,
  Search,
} from "lucide-react";
import { VolunteerDutyType, VolunteerSlotStatus } from "@prisma/client";
import { VolunteerSlotWithDetails } from "@/modules/volunteers/services/volunteer.service";
import { EventVolunteerFulfillment } from "@/modules/volunteers/domain/volunteer-roster";
import { VolunteerBadge } from "./volunteer-badge";
import { VolunteerDutyCard } from "./volunteer-duty-card";
import {
  createVolunteerDutySlotAction,
  assignVolunteerDutySlotAction,
} from "@/modules/volunteers/actions/volunteer.actions";

export interface ClubMemberOption {
  id: string;
  name: string;
  email?: string | null;
  role?: string;
}

interface VolunteerRosterConsoleProps {
  eventId: string;
  eventTitle: string;
  slots: VolunteerSlotWithDetails[];
  fulfillment: EventVolunteerFulfillment;
  currentProfileId: string;
  isStaff: boolean;
  isPlayingInLineup?: boolean;
  clubMembers?: ClubMemberOption[];
}

const DUTY_PRESETS: Record<
  VolunteerDutyType,
  { label: string; defaultTitle: string; description: string; icon: any }
> = {
  [VolunteerDutyType.SCORING]: {
    label: "Scorer (Electronic & Scorebook)",
    defaultTitle: "Official Match Scorer",
    description: "Operate live digital scoring and official paper scorebook during match innings.",
    icon: Clock,
  },
  [VolunteerDutyType.UMPIRING]: {
    label: "Umpire (Main / Square-Leg)",
    defaultTitle: "Field / Square-Leg Umpire",
    description: "Officiate overs and leg-side decisions in accordance with DCF regulations.",
    icon: Flag,
  },
  [VolunteerDutyType.PITCH_PREPARATION]: {
    label: "Pitch Prep & Ground Setup",
    defaultTitle: "Ground & Pitch Setup",
    description: "Mark creases, position boundary cones, and assemble sight screens prior to toss.",
    icon: Shield,
  },
  [VolunteerDutyType.TEA_CATERING]: {
    label: "Tea & Refreshments",
    defaultTitle: "Match Catering & Refreshments",
    description: "Coordinate mid-innings refreshments, water replenishment, and clubhouse cleanup.",
    icon: Coffee,
  },
  [VolunteerDutyType.YOUTH_CARPOOL]: {
    label: "Youth Carpool Driver",
    defaultTitle: "Away Match Youth Carpool",
    description: "Provide safe transport for junior squad players to/from away fixture venue.",
    icon: Car,
  },
  [VolunteerDutyType.GENERAL_VOLUNTEER]: {
    label: "General Club Duty",
    defaultTitle: "Club Event Volunteer",
    description: "Support general logistics, equipment handling, and pitch-side coordination.",
    icon: UserCheck,
  },
};

export function VolunteerRosterConsole({
  eventId,
  eventTitle,
  slots,
  fulfillment,
  currentProfileId,
  isStaff,
  isPlayingInLineup = false,
  clubMembers = [],
}: VolunteerRosterConsoleProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "open" | "claimed" | "swaps">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [slotToAssign, setSlotToAssign] = useState<VolunteerSlotWithDetails | null>(null);

  // Add Slot Form State
  const [selectedDutyType, setSelectedDutyType] = useState<VolunteerDutyType>(
    VolunteerDutyType.SCORING
  );
  const [slotTitle, setSlotTitle] = useState(DUTY_PRESETS[VolunteerDutyType.SCORING].defaultTitle);
  const [slotDescription, setSlotDescription] = useState(
    DUTY_PRESETS[VolunteerDutyType.SCORING].description
  );
  const [carpoolSeats, setCarpoolSeats] = useState<number>(4);
  const [initialAssignedMemberId, setInitialAssignedMemberId] = useState<string>("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isAddingPending, startAddTransition] = useTransition();

  // Direct Assign Form State
  const [targetMemberId, setTargetMemberId] = useState<string>("");
  const [assignNotes, setAssignNotes] = useState<string>("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState<string>("");
  const [isAssignPending, startAssignTransition] = useTransition();

  // Filter slots
  const openSlots = slots.filter((s) => s.status === VolunteerSlotStatus.OPEN);
  const claimedSlots = slots.filter((s) => s.status === VolunteerSlotStatus.CLAIMED);
  const swapSlots = slots.filter((s) => s.status === VolunteerSlotStatus.SWAP_REQUESTED);

  const displayedSlots = slots.filter((s) => {
    if (activeTab === "open") return s.status === VolunteerSlotStatus.OPEN;
    if (activeTab === "claimed") return s.status === VolunteerSlotStatus.CLAIMED;
    if (activeTab === "swaps") return s.status === VolunteerSlotStatus.SWAP_REQUESTED;
    return true;
  });

  const handleDutyTypeChange = (type: VolunteerDutyType) => {
    setSelectedDutyType(type);
    setSlotTitle(DUTY_PRESETS[type].defaultTitle);
    setSlotDescription(DUTY_PRESETS[type].description);
  };

  const handleCreateSlot = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    startAddTransition(async () => {
      const res = await createVolunteerDutySlotAction({
        eventId,
        dutyType: selectedDutyType,
        title: slotTitle,
        description: slotDescription || undefined,
        carpoolSeats:
          selectedDutyType === VolunteerDutyType.YOUTH_CARPOOL ? carpoolSeats : undefined,
        assignedProfileId: initialAssignedMemberId || undefined,
      });

      if (!res.success) {
        setAddError(res.error || "Failed to create duty slot.");
        return;
      }

      setIsAddModalOpen(false);
      setSlotTitle(DUTY_PRESETS[VolunteerDutyType.SCORING].defaultTitle);
      setInitialAssignedMemberId("");
      router.refresh();
    });
  };

  const handleDirectAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotToAssign) return;
    if (!targetMemberId) {
      setAssignError("Please choose a member to assign.");
      return;
    }
    setAssignError(null);

    startAssignTransition(async () => {
      const res = await assignVolunteerDutySlotAction({
        slotId: slotToAssign.id,
        memberProfileId: targetMemberId,
        notes: assignNotes || undefined,
      });

      if (!res.success) {
        setAssignError(res.error || "Failed to assign duty.");
        return;
      }

      setSlotToAssign(null);
      setTargetMemberId("");
      setAssignNotes("");
      router.refresh();
    });
  };

  const filteredMembers = clubMembers.filter((m) =>
    m.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
    (m.email && m.email.toLowerCase().includes(assignSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Console Header */}
      <div className="bg-card border rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Volunteer Duty Roster
              </h2>
              <VolunteerBadge fulfillment={fulfillment} size="md" />
            </div>
            <p className="text-sm text-muted-foreground">
              Match-day operations, officiating, pitch prep, tea catering &amp; youth transport
            </p>
          </div>

          {/* Action Button for Staff */}
          {isStaff && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 transition-all active:scale-[0.98] self-start md:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              Add Duty Slot
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mt-5 border-t pt-4 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
              activeTab === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            All Duties ({slots.length})
          </button>
          <button
            onClick={() => setActiveTab("open")}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "open"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Volunteers Needed ({openSlots.length})
            {openSlots.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("claimed")}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
              activeTab === "claimed"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Claimed ({claimedSlots.length})
          </button>
          {swapSlots.length > 0 && (
            <button
              onClick={() => setActiveTab("swaps")}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "swaps"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
              }`}
            >
              Swaps Requested ({swapSlots.length})
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </button>
          )}
        </div>
      </div>

      {/* Roster Cards List */}
      <div className="space-y-3">
        {displayedSlots.length === 0 ? (
          <div className="bg-card/50 border border-dashed rounded-2xl p-8 text-center space-y-3">
            <Users className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
            <h3 className="text-sm font-semibold text-foreground">No duty slots found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {activeTab === "open"
                ? "All configured volunteer slots for this event are currently staffed!"
                : activeTab === "swaps"
                ? "No pending peer swap requests for this fixture."
                : "No volunteer duties have been attached to this event fixture yet."}
            </p>
            {isStaff && activeTab === "all" && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow hover:bg-primary/90 transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Create First Duty Slot
              </button>
            )}
          </div>
        ) : (
          displayedSlots.map((slot) => (
            <VolunteerDutyCard
              key={slot.id}
              slot={slot}
              currentProfileId={currentProfileId}
              isStaff={isStaff}
              isPlayingInLineup={isPlayingInLineup}
              onAssignMember={(s) => {
                setSlotToAssign(s);
                setTargetMemberId("");
                setAssignError(null);
              }}
            />
          ))
        )}
      </div>

      {/* ADD DUTY SLOT MODAL (Staff only) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Add Volunteer Duty Slot</h3>
                  <p className="text-xs text-muted-foreground">{eventTitle}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSlot} className="space-y-4">
              {/* Duty Type Selection */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-2">
                  Select Duty Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(DUTY_PRESETS).map(([typeKey, preset]) => {
                    const Icon = preset.icon;
                    const isSelected = selectedDutyType === typeKey;
                    return (
                      <button
                        key={typeKey}
                        type="button"
                        onClick={() => handleDutyTypeChange(typeKey as VolunteerDutyType)}
                        className={`p-2.5 text-left rounded-xl border transition-all flex items-start gap-2 ${
                          isSelected
                            ? "bg-primary/10 border-primary text-primary shadow-sm"
                            : "bg-card border-border hover:border-primary/40 text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold leading-tight">{preset.label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slot Title */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Duty Title</label>
                <input
                  type="text"
                  required
                  value={slotTitle}
                  onChange={(e) => setSlotTitle(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. Square-Leg Umpire"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Description / Responsibilities (Optional)
                </label>
                <textarea
                  rows={2}
                  value={slotDescription}
                  onChange={(e) => setSlotDescription(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="Notes for the volunteer..."
                />
              </div>

              {/* Carpool Seats if Carpool */}
              {selectedDutyType === VolunteerDutyType.YOUTH_CARPOOL && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl space-y-1.5">
                  <label className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5" />
                    Available Passenger Seats Needed
                  </label>
                  <select
                    value={carpoolSeats}
                    onChange={(e) => setCarpoolSeats(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-lg border bg-background text-foreground focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} passenger seats
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Optional Direct Assignment */}
              {clubMembers.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Pre-assign to Member (Optional)
                  </label>
                  <select
                    value={initialAssignedMemberId}
                    onChange={(e) => setInitialAssignedMemberId(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
                  >
                    <option value="">Leave Open (Self-Service 1-Tap Claim)</option>
                    {clubMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.role ? `(${m.role})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {addError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {isAddingPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Create Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECT ASSIGN MODAL (Staff only) */}
      {slotToAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Direct Member Assignment</h3>
                  <p className="text-xs text-muted-foreground">{slotToAssign.title}</p>
                </div>
              </div>
              <button
                onClick={() => setSlotToAssign(null)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDirectAssign} className="space-y-3.5">
              {/* Member Search / Select */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Select Club Member
                </label>
                {clubMembers.length > 5 && (
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search member..."
                      value={assignSearch}
                      onChange={(e) => setAssignSearch(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border bg-background focus:outline-none"
                    />
                  </div>
                )}
                <select
                  required
                  value={targetMemberId}
                  onChange={(e) => setTargetMemberId(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Choose Member --</option>
                  {filteredMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.email ? `(${m.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignment Notes */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="e.g. Agreed during squad briefing"
                  className="w-full text-xs px-3 py-2 rounded-xl border bg-background focus:outline-none"
                />
              </div>

              {assignError && (
                <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{assignError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSlotToAssign(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssignPending}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 disabled:opacity-50"
                >
                  {isAssignPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5" />
                  )}
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
