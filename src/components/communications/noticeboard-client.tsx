"use client";

import React, { useState } from "react";
import { Plus, Bell, Megaphone, CloudRain } from "lucide-react";
import { AnnouncementWithDetails } from "@/modules/communications/services/announcement.service";
import { AnnouncementFeed } from "./announcement-feed";
import { AnnouncementComposerModal } from "./announcement-composer-modal";

interface SquadOption {
  id: string;
  name: string;
  category: string;
}

interface NoticeboardClientProps {
  announcements: AnnouncementWithDetails[];
  currentProfileId: string;
  isAdminOrCoach: boolean;
  squads: SquadOption[];
}

export function NoticeboardClient({
  announcements,
  currentProfileId,
  isAdminOrCoach,
  squads,
}: NoticeboardClientProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const unreadCount = announcements.filter((a) => !a.isRead).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Club Noticeboard
                {unreadCount > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                    {unreadCount} New
                  </span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                Targeted announcements, weather alerts, squad communications, and AGM notices
              </p>
            </div>
          </div>
        </div>

        {isAdminOrCoach && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsComposerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow hover:bg-primary/90 transition-all hover:scale-[1.01]"
            >
              <Plus className="w-4 h-4" />
              New Announcement
            </button>
          </div>
        )}
      </div>

      {/* Main Announcement Feed */}
      <AnnouncementFeed
        announcements={announcements}
        currentProfileId={currentProfileId}
        isAdminOrCoach={isAdminOrCoach}
      />

      {/* Composer Modal */}
      {isAdminOrCoach && (
        <AnnouncementComposerModal
          squads={squads}
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
        />
      )}
    </div>
  );
}
