"use client";

import React, { useState } from "react";
import { CloudRain } from "lucide-react";
import { WeatherCancellationModal } from "./weather-cancellation-modal";

interface WeatherCancellationButtonProps {
  eventId: string;
  eventTitle: string;
  eventDate: Date | string;
  venueName?: string | null;
}

export function WeatherCancellationButton({
  eventId,
  eventTitle,
  eventDate,
  venueName,
}: WeatherCancellationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-destructive/15 hover:bg-destructive/25 text-destructive border border-destructive/40 text-xs font-bold rounded-xl transition-all active:scale-[0.98]"
        title="Cancel fixture due to pitch/weather emergency"
      >
        <CloudRain className="w-4 h-4" />
        Weather Cancellation
      </button>

      <WeatherCancellationModal
        eventId={eventId}
        eventTitle={eventTitle}
        eventDate={eventDate}
        venueName={venueName}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
