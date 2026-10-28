"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Pin,
  CloudRain,
  Calendar,
  Check,
  CheckCircle2,
  Trash2,
  Search,
  Filter,
  Users,
  Layers,
  Shield,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementAudience,
} from "@prisma/client";
import { AnnouncementWithDetails } from "@/modules/communications/services/announcement.service";
import {
  markAnnouncementReadAction,
  deleteAnnouncementAction,
} from "@/modules/communications/actions/announcement.actions";
import Link from "next/link";

interface AnnouncementFeedProps {
  announcements: AnnouncementWithDetails[];
  currentProfileId: string;
  isAdminOrCoach: boolean;
}

export function AnnouncementFeed({
  announcements,
  currentProfileId,
  isAdminOrCoach,
}: AnnouncementFeedProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [unreadOnly, setUnreadOnly] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMarkAsRead = (announcementId: string) => {
    startTransition(async () => {
      await markAnnouncementReadAction({ announcementId });
      router.refresh();
    });
  };

  const handleDelete = (announcementId: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    startTransition(async () => {
      await deleteAnnouncementAction(announcementId);
      router.refresh();
    });
  };

  // Filter items
  const filtered = announcements.filter((ann) => {
    if (activeCategory !== "ALL" && ann.category !== activeCategory) {
      return false;
    }
    if (unreadOnly && ann.isRead) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ann.title.toLowerCase().includes(q);
      const matchContent = ann.content.toLowerCase().includes(q);
      const matchSquad = ann.targetSquad?.name.toLowerCase().includes(q);
      if (!matchTitle && !matchContent && !matchSquad) return false;
    }
    return true;
  });

  const getPriorityBadge = (ann: AnnouncementWithDetails) => {
    if (ann.priority === AnnouncementPriority.URGENT_WEATHER_ALERT) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive text-destructive-foreground animate-pulse">
          <CloudRain className="w-3.5 h-3.5" />
          Urgent Weather Alert
        </span>
      );
    }
    if (ann.priority === AnnouncementPriority.AGM_NOTICE) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
          <Calendar className="w-3.5 h-3.5" />
          AGM Notice
        </span>
      );
    }
    if (ann.isPinned) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
          <Pin className="w-3.5 h-3.5" />
          Pinned
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar: Search & Category Tabs */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search noticeboard..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-card border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeCategory === "ALL"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            All Notices
          </button>
          <button
            onClick={() => setActiveCategory(AnnouncementCategory.WEATHER_ALERT)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeCategory === AnnouncementCategory.WEATHER_ALERT
                ? "bg-destructive text-destructive-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            Weather Alerts
          </button>
          <button
            onClick={() => setActiveCategory(AnnouncementCategory.SQUAD_UPDATE)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeCategory === AnnouncementCategory.SQUAD_UPDATE
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            Squad Updates
          </button>
          <button
            onClick={() => setActiveCategory(AnnouncementCategory.AGM)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeCategory === AnnouncementCategory.AGM
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            AGM
          </button>
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              unreadOnly
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-card text-muted-foreground border-border hover:bg-muted/60"
            }`}
          >
            {unreadOnly ? "Showing Unread" : "Unread Only"}
          </button>
        </div>
      </div>

      {/* Feed List */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border/80 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            No notices found
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? "No announcements matched your search keywords."
              : "Check back later for club news, match day cancellations, and AGM notices."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((ann) => {
            const isUrgent = ann.priority === AnnouncementPriority.URGENT_WEATHER_ALERT;
            const isExpanded = expandedIds.has(ann.id);
            const canDelete =
              isAdminOrCoach || ann.authorProfileId === currentProfileId;

            return (
              <div
                key={ann.id}
                className={`relative bg-card rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md ${
                  isUrgent
                    ? "border-destructive/60 bg-gradient-to-r from-destructive/[0.04] to-card"
                    : ann.isPinned
                    ? "border-primary/40 bg-gradient-to-r from-primary/[0.02] to-card"
                    : "border-border/80"
                }`}
              >
                {/* Header Strip */}
                <div className="p-5 pb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-2">
                      {getPriorityBadge(ann)}
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground uppercase tracking-wider">
                        {ann.category.replace(/_/g, " ")}
                      </span>

                      {ann.audience === AnnouncementAudience.SQUAD_SPECIFIC && ann.targetSquad && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium">
                          <Layers className="w-3 h-3" />
                          {ann.targetSquad.name}
                        </span>
                      )}

                      {ann.audience === AnnouncementAudience.ROLE_SPECIFIC && ann.targetRole && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-500/10 text-purple-700 dark:text-purple-400 font-medium">
                          <Shield className="w-3 h-3" />
                          {ann.targetRole}
                        </span>
                      )}

                      {ann.audience === AnnouncementAudience.ALL_MEMBERS && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
                          <Users className="w-3 h-3" />
                          Club-Wide
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-foreground leading-snug pt-0.5">
                      {ann.title}
                    </h3>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center gap-2 shrink-0">
                    {ann.isRead ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium px-2 py-1 bg-muted/40 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Read
                      </span>
                    ) : (
                      <button
                        onClick={() => handleMarkAsRead(ann.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/90 bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Mark Read
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => handleDelete(ann.id)}
                        disabled={isPending}
                        title="Delete Announcement"
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Linked Event Callout (e.g. for Weather Cancellations or AGM) */}
                {ann.linkedEvent && (
                  <div className="mx-5 mb-3 p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg ${isUrgent ? "bg-destructive text-white" : "bg-primary/10 text-primary"}`}>
                        <Calendar className="w-4 h-4 shrink-0" />
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-foreground block truncate">
                          {ann.linkedEvent.title}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(ann.linkedEvent.date).toLocaleDateString("da-DK")} &bull;{" "}
                          Status:{" "}
                          <span
                            className={
                              ann.linkedEvent.lifecycleStatus === "CANCELLED"
                                ? "text-destructive font-bold uppercase"
                                : "font-medium"
                            }
                          >
                            {ann.linkedEvent.lifecycleStatus}
                          </span>
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/events/${ann.linkedEvent.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline shrink-0"
                    >
                      View Fixture
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {/* Content Body */}
                <div className="px-5 pb-3">
                  <div
                    className={`text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed ${
                      !isExpanded && ann.content.length > 250 ? "line-clamp-3" : ""
                    }`}
                  >
                    {ann.content}
                  </div>

                  {ann.content.length > 250 && (
                    <button
                      onClick={() => toggleExpand(ann.id)}
                      className="mt-2 text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          Show less <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          Read more <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Footer Metadata */}
                <div className="px-5 py-2.5 bg-muted/20 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span>
                      Published by <strong>{ann.authorProfile.firstName} {ann.authorProfile.lastName}</strong>
                    </span>
                  </span>

                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(ann.publishedAt).toLocaleDateString("da-DK", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
