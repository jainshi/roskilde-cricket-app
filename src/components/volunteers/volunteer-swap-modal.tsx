"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  X,
  Loader2,
  Calendar,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { VolunteerSlotWithDetails } from "@/modules/volunteers/services/volunteer.service";
import { requestVolunteerSwapAction } from "@/modules/volunteers/actions/volunteer.actions";

interface VolunteerSwapModalProps {
  slot: VolunteerSlotWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_REASONS = [
  "Work travel / scheduling conflict",
  "Family / personal commitment",
  "Illness / medical reason",
  "Transport / carpool issue",
];

export function VolunteerSwapModal({
  slot,
  isOpen,
  onClose,
  onSuccess,
}: VolunteerSwapModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a reason for the swap request.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const res = await requestVolunteerSwapAction({
        slotId: slot.id,
        swapReason: reason.trim(),
      });

      if (!res.success) {
        setError(res.error || "Failed to request duty swap.");
        return;
      }

      router.refresh();
      if (onSuccess) onSuccess();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-card text-card-foreground border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Request Duty Swap
              </h2>
              <p className="text-xs text-muted-foreground">
                Ask a fellow member or parent to cover your volunteer shift
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Duty Context Info */}
          <div className="bg-muted/40 border border-border rounded-xl p-3.5 space-y-1.5 text-xs">
            <p className="font-semibold text-sm text-foreground">{slot.title}</p>
            <p className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {slot.scheduledEvent.title} &bull;{" "}
              {new Date(slot.scheduledEvent.startAt).toLocaleString("da-DK", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>

          {/* Quick preset chips */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Quick Reasons
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReason(r)}
                  className="text-xs px-2.5 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border transition-colors"
                >
                  {r.split(" ")[0]} {r.split(" ")[1]}
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Reason */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Swap Note for Club Volunteers *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              placeholder="e.g. Unforeseen travel on Saturday. Can swap with someone for next week's home match..."
              className="w-full px-3.5 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Submitting marks this slot as <strong>SWAP REQUESTED</strong> on the roster. Any eligible member or parent can accept it in 1 tap, automatically reassigning the duty and alerting both of you.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !reason.trim()}
              className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  Post Swap Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
