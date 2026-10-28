"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Clock,
  Car,
  Coffee,
  Flag,
  UserCheck,
  UserPlus,
  ArrowRightLeft,
  XCircle,
  AlertTriangle,
  Loader2,
  Phone,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { VolunteerDutyType, VolunteerSlotStatus } from "@prisma/client";
import { VolunteerSlotWithDetails } from "@/modules/volunteers/services/volunteer.service";
import {
  claimVolunteerDutySlotAction,
  acceptVolunteerSwapAction,
  unassignVolunteerDutySlotAction,
  deleteVolunteerDutySlotAction,
} from "@/modules/volunteers/actions/volunteer.actions";
import { VolunteerSwapModal } from "./volunteer-swap-modal";

interface VolunteerDutyCardProps {
  slot: VolunteerSlotWithDetails;
  currentProfileId: string;
  isStaff: boolean;
  isPlayingInLineup?: boolean;
  onAssignMember?: (slot: VolunteerSlotWithDetails) => void;
}

export function VolunteerDutyCard({
  slot,
  currentProfileId,
  isStaff,
  isPlayingInLineup = false,
  onAssignMember,
}: VolunteerDutyCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [carpoolSeats, setCarpoolSeats] = useState<number>(slot.carpoolSeats || 3);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAssignedToMe = slot.assignedProfileId === currentProfileId;
  const isOpen = slot.status === VolunteerSlotStatus.OPEN;
  const isSwapRequested = slot.status === VolunteerSlotStatus.SWAP_REQUESTED;
  const isClaimed = slot.status === VolunteerSlotStatus.CLAIMED;

  // 1-Tap Claim Handler
  const handleClaim = () => {
    setError(null);
    setWarning(null);

    startTransition(async () => {
      const res = await claimVolunteerDutySlotAction({
        slotId: slot.id,
        carpoolSeatsOffered: slot.dutyType === VolunteerDutyType.YOUTH_CARPOOL ? carpoolSeats : undefined,
      });

      if (!res.success) {
        setError(res.error || "Failed to claim volunteer duty.");
        return;
      }

      if (res.warning) {
        setWarning(res.warning);
      }

      router.refresh();
    });
  };

  // 1-Tap Accept Swap Handler
  const handleAcceptSwap = () => {
    if (!confirm("Are you sure you want to take over this volunteer duty?")) return;
    setError(null);

    startTransition(async () => {
      const res = await acceptVolunteerSwapAction({ slotId: slot.id });
      if (!res.success) {
        setError(res.error || "Failed to accept swap.");
        return;
      }
      router.refresh();
    });
  };

  // Unassign Handler
  const handleUnassign = () => {
    if (!confirm("Are you sure you want to unassign this duty slot?")) return;
    setError(null);

    startTransition(async () => {
      const res = await unassignVolunteerDutySlotAction(slot.id);
      if (!res.success) {
        setError(res.error || "Failed to unassign duty.");
        return;
      }
      router.refresh();
    });
  };

  // Staff Delete Handler
  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this volunteer duty slot entirely?")) return;
    startTransition(async () => {
      await deleteVolunteerDutySlotAction(slot.id, slot.eventId);
      router.refresh();
    });
  };

  const getDutyIcon = (type: VolunteerDutyType) => {
    switch (type) {
      case VolunteerDutyType.SCORING:
        return <Clock className="w-4 h-4 text-sky-500" />;
      case VolunteerDutyType.UMPIRING:
        return <Flag className="w-4 h-4 text-amber-500" />;
      case VolunteerDutyType.PITCH_PREPARATION:
        return <Shield className="w-4 h-4 text-emerald-500" />;
      case VolunteerDutyType.TEA_CATERING:
        return <Coffee className="w-4 h-4 text-rose-500" />;
      case VolunteerDutyType.YOUTH_CARPOOL:
        return <Car className="w-4 h-4 text-purple-500" />;
      case VolunteerDutyType.GENERAL_VOLUNTEER:
      default:
        return <UserCheck className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <>
      <div
        className={`relative bg-card border rounded-2xl p-4 sm:p-5 shadow-sm transition-all ${
          isSwapRequested
            ? "border-amber-500/40 bg-gradient-to-r from-amber-500/[0.03] to-card"
            : isOpen
            ? "border-border/90 hover:border-primary/40"
            : isAssignedToMe
            ? "border-primary/40 bg-gradient-to-r from-primary/[0.03] to-card"
            : "border-border/70"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Duty Title & Status */}
          <div className="space-y-1 min-w-[200px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 bg-muted rounded-lg shrink-0">
                {getDutyIcon(slot.dutyType)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {slot.dutyType.replace(/_/g, " ")}
              </span>

              {isOpen && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Open Slot
                </span>
              )}
              {isSwapRequested && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                  <ArrowRightLeft className="w-3 h-3" />
                  Swap Requested
                </span>
              )}
              {isClaimed && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Claimed
                </span>
              )}
            </div>

            <h4 className="text-sm sm:text-base font-bold text-foreground">
              {slot.title}
            </h4>

            {slot.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {slot.description}
              </p>
            )}
          </div>

          {/* Assignment / Volunteer Info */}
          <div className="text-xs space-y-1">
            {slot.assignedProfile ? (
              <div className="bg-muted/40 border border-border/80 rounded-xl p-2.5">
                <p className="text-muted-foreground">
                  Assigned Volunteer:{" "}
                  <strong className="text-foreground">
                    {slot.assignedProfile.firstName} {slot.assignedProfile.lastName}
                    {isAssignedToMe && " (You)"}
                  </strong>
                </p>
                {slot.carpoolSeats && slot.dutyType === VolunteerDutyType.YOUTH_CARPOOL && (
                  <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Car className="w-3.5 h-3.5 text-purple-500" />
                    Offering <strong>{slot.carpoolSeats}</strong> carpool seats
                  </p>
                )}
                {isStaff && (slot.assignedProfile.email || slot.assignedProfile.phone) && (
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    {slot.assignedProfile.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {slot.assignedProfile.phone}
                      </span>
                    )}
                    {slot.assignedProfile.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {slot.assignedProfile.email}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No volunteer assigned yet
              </p>
            )}

            {/* Swap Reason Callout */}
            {isSwapRequested && slot.swapReason && (
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-2.5 text-xs text-amber-800 dark:text-amber-300">
                <span className="font-semibold block mb-0.5">Swap Reason:</span>
                "{slot.swapReason}"
              </div>
            )}
          </div>

          {/* Action Buttons (<10s on 360px viewport) */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Open slot: 1-Tap Claim */}
            {isOpen && (
              <div className="flex items-center gap-2">
                {slot.dutyType === VolunteerDutyType.YOUTH_CARPOOL && (
                  <div className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-lg border border-border">
                    <Car className="w-3.5 h-3.5 text-purple-500" />
                    <select
                      value={carpoolSeats}
                      onChange={(e) => setCarpoolSeats(Number(e.target.value))}
                      className="bg-transparent text-xs font-semibold focus:outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <option key={n} value={n}>
                          {n} seats
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={handleClaim}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  Claim Duty (1-Tap)
                </button>

                {isStaff && onAssignMember && (
                  <button
                    onClick={() => onAssignMember(slot)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground border border-border text-xs font-semibold transition-all active:scale-[0.98]"
                    title="Directly assign a member (Admin / Coach)"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                    Assign Member
                  </button>
                )}
              </div>
            )}

            {/* Assigned to current user: Request Swap & Unassign */}
            {isAssignedToMe && !isSwapRequested && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsSwapModalOpen(true)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-semibold transition-all active:scale-[0.98]"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Request Swap
                </button>

                <button
                  onClick={handleUnassign}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground text-xs font-medium transition-all"
                  title="Release duty"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Release
                </button>
              </div>
            )}

            {/* Swap requested by another member: 1-Tap Accept Swap */}
            {isSwapRequested && !isAssignedToMe && (
              <button
                onClick={handleAcceptSwap}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-950/30 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                )}
                Accept Swap &amp; Cover Shift
              </button>
            )}

            {/* Staff Controls (Direct unassign / delete) */}
            {isStaff && (
              <div className="flex items-center gap-1 pl-2 border-l border-border/80">
                {slot.assignedProfileId && !isAssignedToMe && (
                  <button
                    onClick={handleUnassign}
                    disabled={isPending}
                    className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Staff: Unassign member"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Staff: Delete slot"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Feedback messages */}
        {warning && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{warning}</span>
          </div>
        )}

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Peer Swap Modal */}
      {isAssignedToMe && (
        <VolunteerSwapModal
          slot={slot}
          isOpen={isSwapModalOpen}
          onClose={() => setIsSwapModalOpen(false)}
        />
      )}
    </>
  );
}
