import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";
import {
  hasPermission,
  PermissionAction,
  PermissionContext,
} from "@/modules/auth-rbac/domain/permissions";

describe("RBAC Permissions Domain Matrix (FR-001, FR-002, FR-006, FR-007)", () => {
  const actorId = "actor-123";
  const childId = "child-456";
  const strangerId = "stranger-789";

  describe("Admin Role", () => {
    const adminCtx: PermissionContext = {
      userProfileId: actorId,
      roles: [Role.ADMIN],
    };

    const allActions: PermissionAction[] = [
      "USER_MANAGEMENT_ONBOARD",
      "USER_MANAGEMENT_VIEW_MEMBERS",
      "USER_MANAGEMENT_VIEW_DIRECTORY",
      "ROLE_ASSIGNMENT",
      "PARENT_CHILD_MANAGE_LINKS",
      "PARENT_CHILD_MANAGE_YOUTH_PROFILE",
      "INVENTORY_CATALOG_EDIT",
      "EQUIPMENT_CHECKOUT_APPROVE",
      "EQUIPMENT_CHECKOUT_SELF",
      "EQUIPMENT_CHECKOUT_LINKED_YOUTH",
      "CREATE_OFFICIAL_FIXTURES",
      "CREATE_AD_HOC_DRILLS",
      "RSVP_SELF",
      "RSVP_LINKED_YOUTH",
      "ATTENDANCE_CHECK_IN",
      "SQUAD_SELECTION_PUBLISH",
      "MATCH_SCORING_ENTRY",
      "NOTICEBOARD_BROADCAST",
    ];

    it("grants full access to every action in the permission matrix", () => {
      for (const action of allActions) {
        expect(
          hasPermission(action, adminCtx),
          `Admin should have access to ${action}`
        ).toBe(true);
      }
    });
  });

  describe("Coach Role", () => {
    const coachCtx: PermissionContext = {
      userProfileId: actorId,
      roles: [Role.COACH],
    };

    it("allows match, training, and equipment management actions", () => {
      expect(hasPermission("CREATE_OFFICIAL_FIXTURES", coachCtx)).toBe(true);
      expect(hasPermission("CREATE_AD_HOC_DRILLS", coachCtx)).toBe(true);
      expect(hasPermission("ATTENDANCE_CHECK_IN", coachCtx)).toBe(true);
      expect(hasPermission("EQUIPMENT_CHECKOUT_APPROVE", coachCtx)).toBe(true);
      expect(hasPermission("SQUAD_SELECTION_PUBLISH", coachCtx)).toBe(true);
      expect(hasPermission("MATCH_SCORING_ENTRY", coachCtx)).toBe(true);
      expect(hasPermission("NOTICEBOARD_BROADCAST", coachCtx)).toBe(true);
      expect(hasPermission("USER_MANAGEMENT_VIEW_MEMBERS", coachCtx)).toBe(true);
      expect(hasPermission("USER_MANAGEMENT_VIEW_DIRECTORY", coachCtx)).toBe(true);
    });

    it("denies user onboarding, role changes, catalog editing, and link management", () => {
      expect(hasPermission("USER_MANAGEMENT_ONBOARD", coachCtx)).toBe(false);
      expect(hasPermission("ROLE_ASSIGNMENT", coachCtx)).toBe(false);
      expect(hasPermission("INVENTORY_CATALOG_EDIT", coachCtx)).toBe(false);
      expect(hasPermission("PARENT_CHILD_MANAGE_LINKS", coachCtx)).toBe(false);
      expect(hasPermission("PARENT_CHILD_MANAGE_YOUTH_PROFILE", coachCtx)).toBe(false);
    });
  });

  describe("Ad-Hoc Coach Role", () => {
    const adHocCtx: PermissionContext = {
      userProfileId: actorId,
      roles: [Role.AD_HOC_COACH],
    };

    it("allows ad-hoc drills and attendance check-in", () => {
      expect(hasPermission("CREATE_AD_HOC_DRILLS", adHocCtx)).toBe(true);
      expect(hasPermission("ATTENDANCE_CHECK_IN", adHocCtx)).toBe(true);
      expect(hasPermission("USER_MANAGEMENT_VIEW_MEMBERS", adHocCtx)).toBe(true);
      expect(hasPermission("USER_MANAGEMENT_VIEW_DIRECTORY", adHocCtx)).toBe(true);
    });

    it("denies official fixture creation, lineup publishing, and match scoring", () => {
      expect(hasPermission("CREATE_OFFICIAL_FIXTURES", adHocCtx)).toBe(false);
      expect(hasPermission("SQUAD_SELECTION_PUBLISH", adHocCtx)).toBe(false);
      expect(hasPermission("MATCH_SCORING_ENTRY", adHocCtx)).toBe(false);
      expect(hasPermission("EQUIPMENT_CHECKOUT_APPROVE", adHocCtx)).toBe(false);
      expect(hasPermission("NOTICEBOARD_BROADCAST", adHocCtx)).toBe(false);
      expect(hasPermission("USER_MANAGEMENT_ONBOARD", adHocCtx)).toBe(false);
    });
  });

  describe("Player Role & Self Scoping (FR-007)", () => {
    const playerCtx: PermissionContext = {
      userProfileId: actorId,
      roles: [Role.PLAYER],
    };

    it("allows viewing directory and actions scoped strictly to self", () => {
      expect(hasPermission("USER_MANAGEMENT_VIEW_DIRECTORY", playerCtx)).toBe(true);

      // Scoped to self
      expect(
        hasPermission("EQUIPMENT_CHECKOUT_SELF", {
          ...playerCtx,
          targetProfileId: actorId,
        })
      ).toBe(true);

      expect(
        hasPermission("RSVP_SELF", {
          ...playerCtx,
          targetProfileId: actorId,
        })
      ).toBe(true);
    });

    it("denies self-scoped actions when targeting another member", () => {
      expect(
        hasPermission("EQUIPMENT_CHECKOUT_SELF", {
          ...playerCtx,
          targetProfileId: strangerId,
        })
      ).toBe(false);

      expect(
        hasPermission("RSVP_SELF", {
          ...playerCtx,
          targetProfileId: strangerId,
        })
      ).toBe(false);
    });

    it("denies all administrative, coaching, and parent actions", () => {
      expect(hasPermission("USER_MANAGEMENT_ONBOARD", playerCtx)).toBe(false);
      expect(hasPermission("USER_MANAGEMENT_VIEW_MEMBERS", playerCtx)).toBe(false);
      expect(hasPermission("CREATE_OFFICIAL_FIXTURES", playerCtx)).toBe(false);
      expect(hasPermission("CREATE_AD_HOC_DRILLS", playerCtx)).toBe(false);
      expect(hasPermission("ATTENDANCE_CHECK_IN", playerCtx)).toBe(false);
      expect(hasPermission("PARENT_CHILD_MANAGE_LINKS", playerCtx)).toBe(false);
    });
  });

  describe("Parent Role & Linked Youth Scoping (FR-007, FR-031)", () => {
    const parentCtx: PermissionContext = {
      userProfileId: actorId,
      roles: [Role.PARENT],
      linkedPlayerIds: [childId],
    };

    it("allows managing youth profile and RSVP for linked youth", () => {
      expect(
        hasPermission("PARENT_CHILD_MANAGE_YOUTH_PROFILE", {
          ...parentCtx,
          targetProfileId: childId,
        })
      ).toBe(true);

      expect(
        hasPermission("RSVP_LINKED_YOUTH", {
          ...parentCtx,
          targetProfileId: childId,
        })
      ).toBe(true);

      expect(
        hasPermission("EQUIPMENT_CHECKOUT_LINKED_YOUTH", {
          ...parentCtx,
          targetProfileId: childId,
        })
      ).toBe(true);
    });

    it("denies managing youth profile or RSVP for unlinked strangers", () => {
      expect(
        hasPermission("PARENT_CHILD_MANAGE_YOUTH_PROFILE", {
          ...parentCtx,
          targetProfileId: strangerId,
        })
      ).toBe(false);

      expect(
        hasPermission("RSVP_LINKED_YOUTH", {
          ...parentCtx,
          targetProfileId: strangerId,
        })
      ).toBe(false);
    });

    it("strictly refuses parent-child link edits (FR-031: Admin only)", () => {
      expect(hasPermission("PARENT_CHILD_MANAGE_LINKS", parentCtx)).toBe(false);
    });
  });

  describe("Compound Role Union (FR-002)", () => {
    it("combines Parent and Ad-Hoc Coach permissions cleanly", () => {
      const compoundCtx: PermissionContext = {
        userProfileId: actorId,
        roles: [Role.PARENT, Role.AD_HOC_COACH],
        linkedPlayerIds: [childId],
      };

      // From Ad-Hoc Coach:
      expect(hasPermission("CREATE_AD_HOC_DRILLS", compoundCtx)).toBe(true);
      expect(hasPermission("ATTENDANCE_CHECK_IN", compoundCtx)).toBe(true);
      expect(hasPermission("USER_MANAGEMENT_VIEW_MEMBERS", compoundCtx)).toBe(true);

      // From Parent:
      expect(
        hasPermission("PARENT_CHILD_MANAGE_YOUTH_PROFILE", {
          ...compoundCtx,
          targetProfileId: childId,
        })
      ).toBe(true);

      // Denied to both (e.g., official fixtures, onboarding):
      expect(hasPermission("CREATE_OFFICIAL_FIXTURES", compoundCtx)).toBe(false);
      expect(hasPermission("USER_MANAGEMENT_ONBOARD", compoundCtx)).toBe(false);
      expect(hasPermission("PARENT_CHILD_MANAGE_LINKS", compoundCtx)).toBe(false);
    });
  });

  describe("Denial Cases & Forged Invocations", () => {
    it("returns false if roles array is empty", () => {
      const emptyCtx: PermissionContext = {
        userProfileId: actorId,
        roles: [],
      };
      expect(hasPermission("USER_MANAGEMENT_VIEW_DIRECTORY", emptyCtx)).toBe(false);
      expect(hasPermission("CREATE_AD_HOC_DRILLS", emptyCtx)).toBe(false);
    });
  });
});
