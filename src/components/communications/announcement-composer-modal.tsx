"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  X,
  Send,
  Loader2,
  Pin,
  Users,
  Shield,
  Layers,
  Calendar,
  AlertCircle,
} from "lucide-react";
import {
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementAudience,
  Role,
} from "@prisma/client";
import { createAnnouncementAction } from "@/modules/communications/actions/announcement.actions";

interface SquadOption {
  id: string;
  name: string;
  category: string;
}

interface AnnouncementComposerModalProps {
  squads: SquadOption[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AnnouncementComposerModal({
  squads,
  isOpen,
  onClose,
  onSuccess,
}: AnnouncementComposerModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>(AnnouncementCategory.GENERAL);
  const [priority, setPriority] = useState<AnnouncementPriority>(AnnouncementPriority.NORMAL);
  const [audience, setAudience] = useState<AnnouncementAudience>(AnnouncementAudience.ALL_MEMBERS);
  const [targetSquadId, setTargetSquadId] = useState<string>("");
  const [targetRole, setTargetRole] = useState<Role | "">("");
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await createAnnouncementAction({
        title,
        content,
        category,
        priority: isPinned && priority === AnnouncementPriority.NORMAL ? AnnouncementPriority.PINNED : priority,
        audience,
        targetSquadId: audience === AnnouncementAudience.SQUAD_SPECIFIC ? targetSquadId || null : null,
        targetRole: audience === AnnouncementAudience.ROLE_SPECIFIC && targetRole ? targetRole : null,
        isPinned,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });

      if (!res.success) {
        setError(res.error || "Failed to create announcement.");
        return;
      }

      router.refresh();
      if (onSuccess) onSuccess();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-card text-card-foreground border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-primary/5 border-b border-border p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Publish Announcement
              </h2>
              <p className="text-xs text-muted-foreground">
                Broadcast notices to the club, specific squads, or member roles
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Notice Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Annual General Meeting (AGM) Notice or Match Schedule Update"
              className="w-full px-3.5 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary font-medium"
            />
          </div>

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value={AnnouncementCategory.GENERAL}>General Notice</option>
                <option value={AnnouncementCategory.SQUAD_UPDATE}>Squad Update</option>
                <option value={AnnouncementCategory.WEATHER_ALERT}>Weather & Pitch Alert</option>
                <option value={AnnouncementCategory.AGM}>AGM Notice</option>
                <option value={AnnouncementCategory.SOCIAL_EVENT}>Social & Club Event</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => {
                  const val = e.target.value as AnnouncementPriority;
                  setPriority(val);
                  if (val === AnnouncementPriority.PINNED) setIsPinned(true);
                }}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value={AnnouncementPriority.NORMAL}>Normal</option>
                <option value={AnnouncementPriority.PINNED}>Pinned to Top</option>
                <option value={AnnouncementPriority.URGENT_WEATHER_ALERT}>Urgent Weather Alert</option>
                <option value={AnnouncementPriority.AGM_NOTICE}>Formal AGM Notice</option>
              </select>
            </div>
          </div>

          {/* Audience Scoping */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Target Audience
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAudience(AnnouncementAudience.ALL_MEMBERS)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  audience === AnnouncementAudience.ALL_MEMBERS
                    ? "bg-primary/10 border-primary text-primary font-semibold shadow-sm"
                    : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Users className="w-4 h-4 mb-1" />
                Entire Club
              </button>

              <button
                type="button"
                onClick={() => setAudience(AnnouncementAudience.SQUAD_SPECIFIC)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  audience === AnnouncementAudience.SQUAD_SPECIFIC
                    ? "bg-primary/10 border-primary text-primary font-semibold shadow-sm"
                    : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Layers className="w-4 h-4 mb-1" />
                Squad Specific
              </button>

              <button
                type="button"
                onClick={() => setAudience(AnnouncementAudience.ROLE_SPECIFIC)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  audience === AnnouncementAudience.ROLE_SPECIFIC
                    ? "bg-primary/10 border-primary text-primary font-semibold shadow-sm"
                    : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Shield className="w-4 h-4 mb-1" />
                Role Specific
              </button>
            </div>
          </div>

          {/* Contextual Selector: Squad */}
          {audience === AnnouncementAudience.SQUAD_SPECIFIC && (
            <div className="bg-muted/30 border border-border rounded-xl p-3 animate-in fade-in">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Select Squad (Includes simultaneous dual-parent delivery for Youth)
              </label>
              <select
                value={targetSquadId}
                onChange={(e) => setTargetSquadId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Choose Target Squad --</option>
                {squads.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Contextual Selector: Role */}
          {audience === AnnouncementAudience.ROLE_SPECIFIC && (
            <div className="bg-muted/30 border border-border rounded-xl p-3 animate-in fade-in">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Select Target Role
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as Role)}
                required
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Choose Role --</option>
                <option value={Role.COACH}>Coaches</option>
                <option value={Role.AD_HOC_COACH}>Assistant / Ad-Hoc Coaches</option>
                <option value={Role.PLAYER}>Players</option>
                <option value={Role.PARENT}>Parents & Guardians</option>
                <option value={Role.ADMIN}>Club Administrators</option>
              </select>
            </div>
          )}

          {/* Content Body */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Message Content (Markdown supported) *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              required
              placeholder="Write announcement details, timetable, or guidelines..."
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Pinned & Expiry Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPinned"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="isPinned" className="text-xs font-medium text-foreground flex items-center gap-1 cursor-pointer">
                <Pin className="w-3.5 h-3.5 text-primary" />
                Pin to top of feed
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-0.5">
                Auto-Expire Date (Optional)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-2.5 py-1 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border">
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
              disabled={isPending || !title || !content}
              className="px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Publish Announcement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
