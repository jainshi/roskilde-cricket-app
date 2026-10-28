import { describe, it, expect } from "vitest";
import {
  AnnouncementAudience,
  AnnouncementCategory,
  AnnouncementPriority,
  Role,
} from "@prisma/client";
import {
  filterAnnouncementsForMember,
  sortAnnouncementsByPriority,
  resolveDualParentRecipients,
  evaluateWeatherCancellation,
  AnnouncementItem,
  MemberAnnouncementContext,
} from "@/modules/communications/domain/announcement-dispatcher";

describe("Announcement Dispatcher Domain Logic (T005, T006)", () => {
  const baseAnnouncement: AnnouncementItem = {
    id: "ann-001",
    title: "Club Notice",
    content: "Details",
    category: AnnouncementCategory.GENERAL,
    priority: AnnouncementPriority.NORMAL,
    audience: AnnouncementAudience.ALL_MEMBERS,
    isPinned: false,
    publishedAt: new Date("2026-05-01T10:00:00Z"),
  };

  describe("filterAnnouncementsForMember", () => {
    it("includes ALL_MEMBERS announcements for any active member", () => {
      const context: MemberAnnouncementContext = {
        profileId: "prof-1",
        roles: [Role.PLAYER],
        rosteredSquadIds: ["squad-senior"],
        linkedChildSquadIds: [],
      };

      const result = filterAnnouncementsForMember([baseAnnouncement], context);
      expect(result).toHaveLength(1);
    });

    it("filters out expired announcements", () => {
      const expiredAnn: AnnouncementItem = {
        ...baseAnnouncement,
        id: "ann-expired",
        expiresAt: new Date("2026-04-01T00:00:00Z"),
      };
      const now = new Date("2026-05-01T00:00:00Z");

      const context: MemberAnnouncementContext = {
        profileId: "prof-1",
        roles: [Role.PLAYER],
        rosteredSquadIds: [],
        linkedChildSquadIds: [],
      };

      const result = filterAnnouncementsForMember([expiredAnn], context, now);
      expect(result).toHaveLength(0);
    });

    it("includes SQUAD_SPECIFIC announcements if member is rostered on the squad", () => {
      const squadAnn: AnnouncementItem = {
        ...baseAnnouncement,
        id: "ann-squad",
        audience: AnnouncementAudience.SQUAD_SPECIFIC,
        targetSquadId: "squad-u15",
      };

      const inSquadContext: MemberAnnouncementContext = {
        profileId: "prof-player",
        roles: [Role.PLAYER],
        rosteredSquadIds: ["squad-u15"],
        linkedChildSquadIds: [],
      };

      const outOfSquadContext: MemberAnnouncementContext = {
        profileId: "prof-other",
        roles: [Role.PLAYER],
        rosteredSquadIds: ["squad-senior"],
        linkedChildSquadIds: [],
      };

      expect(filterAnnouncementsForMember([squadAnn], inSquadContext)).toHaveLength(1);
      expect(filterAnnouncementsForMember([squadAnn], outOfSquadContext)).toHaveLength(0);
    });

    it("includes SQUAD_SPECIFIC announcements for parents of linked youth in that squad", () => {
      const squadAnn: AnnouncementItem = {
        ...baseAnnouncement,
        id: "ann-youth-match",
        audience: AnnouncementAudience.SQUAD_SPECIFIC,
        targetSquadId: "squad-u15",
      };

      const parentContext: MemberAnnouncementContext = {
        profileId: "prof-parent-lars",
        roles: [Role.PARENT],
        rosteredSquadIds: [],
        linkedChildSquadIds: ["squad-u15"], // linked child is in U15
      };

      const otherParentContext: MemberAnnouncementContext = {
        profileId: "prof-parent-other",
        roles: [Role.PARENT],
        rosteredSquadIds: [],
        linkedChildSquadIds: ["squad-u11"],
      };

      expect(filterAnnouncementsForMember([squadAnn], parentContext)).toHaveLength(1);
      expect(filterAnnouncementsForMember([squadAnn], otherParentContext)).toHaveLength(0);
    });

    it("filters ROLE_SPECIFIC announcements strictly to members holding that role", () => {
      const coachAnn: AnnouncementItem = {
        ...baseAnnouncement,
        id: "ann-coaches",
        audience: AnnouncementAudience.ROLE_SPECIFIC,
        targetRole: Role.COACH,
      };

      const coachContext: MemberAnnouncementContext = {
        profileId: "prof-coach",
        roles: [Role.COACH, Role.PLAYER],
        rosteredSquadIds: [],
        linkedChildSquadIds: [],
      };

      const playerContext: MemberAnnouncementContext = {
        profileId: "prof-player",
        roles: [Role.PLAYER],
        rosteredSquadIds: [],
        linkedChildSquadIds: [],
      };

      expect(filterAnnouncementsForMember([coachAnn], coachContext)).toHaveLength(1);
      expect(filterAnnouncementsForMember([coachAnn], playerContext)).toHaveLength(0);
    });
  });

  describe("sortAnnouncementsByPriority", () => {
    it("sorts URGENT_WEATHER_ALERT first, followed by pinned, AGM, and recency", () => {
      const regularOld: AnnouncementItem = {
        ...baseAnnouncement,
        id: "reg-old",
        publishedAt: new Date("2026-05-01T08:00:00Z"),
      };
      const regularNew: AnnouncementItem = {
        ...baseAnnouncement,
        id: "reg-new",
        publishedAt: new Date("2026-05-01T12:00:00Z"),
      };
      const pinned: AnnouncementItem = {
        ...baseAnnouncement,
        id: "pinned",
        isPinned: true,
        publishedAt: new Date("2026-05-01T09:00:00Z"),
      };
      const weatherUrgent: AnnouncementItem = {
        ...baseAnnouncement,
        id: "weather-urgent",
        priority: AnnouncementPriority.URGENT_WEATHER_ALERT,
        publishedAt: new Date("2026-05-01T10:00:00Z"),
      };

      const sorted = sortAnnouncementsByPriority([regularOld, regularNew, pinned, weatherUrgent]);
      expect(sorted[0].id).toBe("weather-urgent");
      expect(sorted[1].id).toBe("pinned");
      expect(sorted[2].id).toBe("reg-new");
      expect(sorted[3].id).toBe("reg-old");
    });
  });

  describe("resolveDualParentRecipients", () => {
    it("resolves and deduplicates both parents for linked youth squad players", () => {
      const youthSquad = [
        {
          id: "child-emil",
          name: "Emil Mikkelsen",
          parents: [
            { id: "parent-lars", name: "Lars Mikkelsen", email: "lars@example.dk" },
            { id: "parent-sofie", name: "Sofie Mikkelsen", email: "sofie@example.dk" },
          ],
        },
        {
          id: "child-lucas",
          name: "Lucas Mikkelsen",
          parents: [
            // Sibling shares same parents
            { id: "parent-lars", name: "Lars Mikkelsen", email: "lars@example.dk" },
            { id: "parent-sofie", name: "Sofie Mikkelsen", email: "sofie@example.dk" },
          ],
        },
      ];

      const recipients = resolveDualParentRecipients(youthSquad);
      expect(recipients).toHaveLength(2); // Lars and Sofie
      expect(recipients.map((r) => r.parentEmail).sort()).toEqual([
        "lars@example.dk",
        "sofie@example.dk",
      ]);
    });
  });

  describe("evaluateWeatherCancellation", () => {
    const now = new Date("2026-05-10T08:00:00Z");

    it("permits weather cancellation for an upcoming scheduled fixture", () => {
      const event = {
        id: "evt-001",
        date: new Date("2026-05-10T11:00:00Z"),
        lifecycleStatus: "SCHEDULED",
        isYouthEvent: true,
      };

      const result = evaluateWeatherCancellation(event, now);
      expect(result.canCancel).toBe(true);
      expect(result.requiresParentNotification).toBe(true);
    });

    it("rejects cancellation if event is already CANCELLED", () => {
      const event = {
        id: "evt-002",
        date: new Date("2026-05-10T11:00:00Z"),
        lifecycleStatus: "CANCELLED",
        isYouthEvent: false,
      };

      const result = evaluateWeatherCancellation(event, now);
      expect(result.canCancel).toBe(false);
      expect(result.error).toContain("already cancelled");
    });

    it("rejects cancellation for past historical fixtures", () => {
      const event = {
        id: "evt-003",
        date: new Date("2026-05-09T11:00:00Z"),
        lifecycleStatus: "SCHEDULED",
        isYouthEvent: false,
      };

      const result = evaluateWeatherCancellation(event, now);
      expect(result.canCancel).toBe(false);
      expect(result.error).toContain("past historical fixture");
    });
  });
});
