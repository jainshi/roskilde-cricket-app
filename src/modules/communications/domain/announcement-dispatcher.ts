import { AnnouncementAudience, AnnouncementCategory, AnnouncementPriority, Role } from "@prisma/client";

export interface MemberAnnouncementContext {
  profileId: string;
  roles: Role[];
  rosteredSquadIds: string[];
  linkedChildSquadIds: string[];
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  targetSquadId?: string | null;
  targetRole?: Role | null;
  isPinned: boolean;
  publishedAt: Date;
  expiresAt?: Date | null;
}

export interface LinkedParentRecipient {
  parentId: string;
  parentEmail: string;
  parentName: string;
  childName: string;
}

export interface WeatherCancellationResult {
  canCancel: boolean;
  error?: string;
  requiresParentNotification: boolean;
}

/**
 * Pure domain evaluator: Filters announcements relevant to a specific member's context
 * (supporting club-wide, squad-specific with parental rollup, and role-based scoping).
 */
export function filterAnnouncementsForMember(
  announcements: AnnouncementItem[],
  context: MemberAnnouncementContext,
  now: Date = new Date()
): AnnouncementItem[] {
  return announcements.filter((ann) => {
    // 1. Check expiration
    if (ann.expiresAt && ann.expiresAt < now) {
      return false;
    }

    // 2. Audience scoping
    switch (ann.audience) {
      case AnnouncementAudience.ALL_MEMBERS:
        return true;

      case AnnouncementAudience.SQUAD_SPECIFIC:
        if (!ann.targetSquadId) return false;
        // Member is directly in squad OR member is parent of child in squad
        const inDirectSquad = context.rosteredSquadIds.includes(ann.targetSquadId);
        const inChildSquad = context.linkedChildSquadIds.includes(ann.targetSquadId);
        return inDirectSquad || inChildSquad;

      case AnnouncementAudience.ROLE_SPECIFIC:
        if (!ann.targetRole) return false;
        return context.roles.includes(ann.targetRole);

      default:
        return false;
    }
  });
}

/**
 * Pure domain evaluator: Sorts announcements prioritizing pinned and urgent alerts,
 * followed by reverse chronological order.
 */
export function sortAnnouncementsByPriority(announcements: AnnouncementItem[]): AnnouncementItem[] {
  return [...announcements].sort((a, b) => {
    // 1. URGENT_WEATHER_ALERT highest priority
    const aIsUrgent = a.priority === AnnouncementPriority.URGENT_WEATHER_ALERT;
    const bIsUrgent = b.priority === AnnouncementPriority.URGENT_WEATHER_ALERT;
    if (aIsUrgent && !bIsUrgent) return -1;
    if (!aIsUrgent && bIsUrgent) return 1;

    // 2. Pinned notices next
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // 3. AGM notices next
    const aIsAgm = a.priority === AnnouncementPriority.AGM_NOTICE;
    const bIsAgm = b.priority === AnnouncementPriority.AGM_NOTICE;
    if (aIsAgm && !bIsAgm) return -1;
    if (!aIsAgm && bIsAgm) return 1;

    // 4. Reverse chronological
    return b.publishedAt.getTime() - a.publishedAt.getTime();
  });
}

/**
 * Pure domain evaluator: Resolves dual-parent email recipients for youth squad members,
 * guaranteeing simultaneous notification delivery to both parents under Constitution Principle II.
 */
export function resolveDualParentRecipients(
  youthPlayers: Array<{
    id: string;
    name: string;
    parents: Array<{ id: string; name: string; email: string | null }>;
  }>
): LinkedParentRecipient[] {
  const seenParentEmails = new Set<string>();
  const recipients: LinkedParentRecipient[] = [];

  for (const player of youthPlayers) {
    for (const parent of player.parents) {
      if (parent.email && !seenParentEmails.has(parent.email)) {
        seenParentEmails.add(parent.email);
        recipients.push({
          parentId: parent.id,
          parentEmail: parent.email,
          parentName: parent.name,
          childName: player.name,
        });
      }
    }
  }

  return recipients;
}

/**
 * Pure domain evaluator: Validates if an upcoming event can be auto-cancelled by a weather alert notice.
 */
export function evaluateWeatherCancellation(
  event: {
    id: string;
    date: Date;
    lifecycleStatus: string; // e.g. "SCHEDULED", "COMPLETED", "CANCELLED"
    isYouthEvent: boolean;
  },
  now: Date = new Date()
): WeatherCancellationResult {
  if (event.lifecycleStatus === "CANCELLED") {
    return {
      canCancel: false,
      error: "Event is already cancelled.",
      requiresParentNotification: false,
    };
  }

  if (event.lifecycleStatus === "COMPLETED") {
    return {
      canCancel: false,
      error: "Cannot cancel an event that has already concluded.",
      requiresParentNotification: false,
    };
  }

  // Check if event is in the past
  if (event.date < now) {
    return {
      canCancel: false,
      error: "Cannot cancel a past historical fixture.",
      requiresParentNotification: false,
    };
  }

  return {
    canCancel: true,
    requiresParentNotification: event.isYouthEvent,
  };
}
