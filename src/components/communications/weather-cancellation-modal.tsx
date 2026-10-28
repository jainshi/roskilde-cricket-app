"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CloudRain,
  AlertTriangle,
  X,
  Send,
  Loader2,
  Users,
  Calendar,
  MapPin,
} from "lucide-react";
import { publishWeatherCancellationAction } from "@/modules/communications/actions/announcement.actions";

interface WeatherCancellationModalProps {
  eventId: string;
  eventTitle: string;
  eventDate: Date | string;
  venueName?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_REASONS = [
  "Heavy rain and waterlogged grass wicket / outfield",
  "Severe weather warning & thunderstorm risk",
  "Pitch unplayable due to frost / standing water",
  "Dense fog and unsafe light conditions",
];

export function WeatherCancellationModal({
  eventId,
  eventTitle,
  eventDate,
  venueName,
  isOpen,
  onClose,
  onSuccess,
}: WeatherCancellationModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("Fixture Cancelled - Pitch Unplayable (Weather Alert)");
  const [content, setContent] = useState(
    "Due to severe rain and waterlogged outfield conditions, today's fixture has been called off for player safety. The ground committee has deemed the wicket unplayable."
  );
  const [notifyParents, setNotifyParents] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await publishWeatherCancellationAction({
        linkedEventId: eventId,
        title,
        content,
        notifyParents,
      });

      if (!res.success) {
        setError(res.error || "Failed to publish weather cancellation.");
        return;
      }

      router.refresh();
      if (onSuccess) onSuccess();
      onClose();
    });
  };

  const formattedDate = new Date(eventDate).toLocaleString("da-DK", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-card text-card-foreground border border-destructive/30 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header with emergency alert styling */}
        <div className="bg-destructive/10 border-b border-destructive/20 p-5 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-destructive text-destructive-foreground rounded-xl shadow">
              <CloudRain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-destructive flex items-center gap-1.5">
                Emergency Weather Cancellation
              </h2>
              <p className="text-xs text-muted-foreground">
                Danish Cricket Pitch & Weather Protocol
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Event Info */}
          <div className="bg-muted/40 border border-border/80 rounded-xl p-3.5 space-y-1.5 text-sm">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <span>{eventTitle}</span>
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {venueName || "Roskilde Cricket Ground"}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm p-3 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cancellation Notice Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Notice Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive focus:border-destructive font-medium"
            />
          </div>

          {/* Quick preset reason chips */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Quick Reasons
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((reason, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setContent(`Due to ${reason.toLowerCase()}, the match/practice has been cancelled for player safety.`)}
                  className="text-xs px-2.5 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border transition-colors"
                >
                  {reason.split(" ")[0]} {reason.split(" ")[1]}
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Reason & Instructions */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Cancellation Details & Next Steps
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              required
              placeholder="Explain pitch conditions, whether practice moves indoors, or reschedule plans..."
              className="w-full px-3.5 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive focus:border-destructive"
            />
          </div>

          {/* Dual-Parent Notification Option */}
          <div className="bg-secondary/40 border border-border/80 rounded-xl p-3 flex items-start gap-3">
            <input
              type="checkbox"
              id="notifyParents"
              checked={notifyParents}
              onChange={(e) => setNotifyParents(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-destructive focus:ring-destructive"
            />
            <label htmlFor="notifyParents" className="text-xs text-foreground cursor-pointer">
              <span className="font-semibold flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-primary" />
                Dual-Parent Youth Delivery (Recommended)
              </span>
              <p className="text-muted-foreground mt-0.5">
                Automatically dispatches simultaneous urgent email notifications to both linked parents and all rostered players.
              </p>
            </label>
          </div>

          {/* Impact Warning */}
          <p className="text-xs text-destructive/90 flex items-center gap-1.5 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              This will atomically mark the fixture as <strong>CANCELLED</strong> and publish an urgent pinned noticeboard banner.
            </span>
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isPending || !title || !content}
              className="px-5 py-2 text-sm font-semibold text-white bg-destructive hover:bg-destructive/90 rounded-lg shadow flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing & Cancelling...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Confirm Cancellation & Alert
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
