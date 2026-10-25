import { describe, it, expect } from "vitest";
import {
  validateParentChildLink,
  MAX_PARENTS_PER_YOUTH,
} from "@/modules/auth-rbac/domain/parent-child-rules";
import {
  canHaveLoginAccount,
  isMinor,
  getAllowedRolesForAge,
} from "@/modules/auth-rbac/domain/age-rules";

describe("Parent-Child Linkage & Credential Rules (FR-004, FR-012, FR-030)", () => {
  const playerId = "player-youth-1";
  const parent1Id = "parent-adult-1";
  const parent2Id = "parent-adult-2";
  const parent3Id = "parent-adult-3";

  describe("2-Parent Maximum Limit (FR-030)", () => {
    it("allows adding the first parent in slot 1", () => {
      const res = validateParentChildLink({
        playerId,
        parentId: parent1Id,
        slot: 1,
        existingLinks: [],
      });
      expect(res.valid).toBe(true);
    });

    it("allows adding the second parent in slot 2", () => {
      const res = validateParentChildLink({
        playerId,
        parentId: parent2Id,
        slot: 2,
        existingLinks: [{ parentId: parent1Id, slot: 1 }],
      });
      expect(res.valid).toBe(true);
    });

    it("strictly rejects attempting to add a 3rd parent", () => {
      const res = validateParentChildLink({
        playerId,
        parentId: parent3Id,
        slot: 3,
        existingLinks: [
          { parentId: parent1Id, slot: 1 },
          { parentId: parent2Id, slot: 2 },
        ],
      });
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe("INVALID_SLOT");
    });

    it("rejects slot 3 even if fewer than 2 links exist", () => {
      const res = validateParentChildLink({
        playerId,
        parentId: parent2Id,
        slot: 3,
        existingLinks: [{ parentId: parent1Id, slot: 1 }],
      });
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe("INVALID_SLOT");
    });

    it("rejects linking the exact same parent twice to the same youth", () => {
      const res = validateParentChildLink({
        playerId,
        parentId: parent1Id,
        slot: 2,
        existingLinks: [{ parentId: parent1Id, slot: 1 }],
      });
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe("PARENT_ALREADY_LINKED");
    });

    it("rejects assigning to an already occupied slot", () => {
      const res = validateParentChildLink({
        playerId,
        parentId: parent2Id,
        slot: 1,
        existingLinks: [{ parentId: parent1Id, slot: 1 }],
      });
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe("SLOT_OCCUPIED");
    });

    it("rejects linking a member to themselves as their own parent", () => {
      const res = validateParentChildLink({
        playerId,
        parentId: playerId,
        slot: 1,
        existingLinks: [],
      });
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe("CANNOT_LINK_SELF");
    });
  });

  describe("Youth Login Credential Decoupling & Role Restrictions (FR-004, FR-012)", () => {
    const testNow = new Date("2026-10-25T00:00:00Z");

    it("strictly prohibits credentials for players under 13", () => {
      // 10-year-old player
      const dob10 = new Date("2016-04-15T00:00:00Z");
      expect(isMinor(dob10, testNow)).toBe(true);
      expect(canHaveLoginAccount(dob10, testNow)).toBe(false);
    });

    it("allows optional credentials for youth aged 13–17 but restricts role to PLAYER only", () => {
      // 15-year-old youth player
      const dob15 = new Date("2011-06-20T00:00:00Z");
      expect(isMinor(dob15, testNow)).toBe(true);
      expect(canHaveLoginAccount(dob15, testNow)).toBe(true);

      const allowedRoles = getAllowedRolesForAge(dob15, testNow);
      expect(allowedRoles).toEqual(["PLAYER"]);
      expect(allowedRoles).not.toContain("ADMIN");
      expect(allowedRoles).not.toContain("COACH");
      expect(allowedRoles).not.toContain("PARENT");
    });

    it("allows adult players full role assignment flexibility", () => {
      // 22-year-old adult
      const dobAdult = new Date("2004-01-10T00:00:00Z");
      expect(isMinor(dobAdult, testNow)).toBe(false);
      expect(canHaveLoginAccount(dobAdult, testNow)).toBe(true);

      const allowedRoles = getAllowedRolesForAge(dobAdult, testNow);
      expect(allowedRoles).toContain("PLAYER");
      expect(allowedRoles).toContain("ADMIN");
      expect(allowedRoles).toContain("COACH");
      expect(allowedRoles).toContain("AD_HOC_COACH");
      expect(allowedRoles).toContain("PARENT");
    });
  });

  describe("Adults Cannot Have Parents & Minors Cannot Be Parents (FR-004, FR-030)", () => {
    it("strictly rejects linking a parent to an adult profile", () => {
      const res = validateParentChildLink({
        playerId: "adult-player-id",
        parentId: "adult-parent-id",
        slot: 1,
        existingLinks: [],
        childIsMinor: false, // Target is adult
        parentIsMinor: false,
      });

      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe("ADULT_CANNOT_HAVE_PARENT");
      expect(res.errorMessage).toContain("Adult members cannot have parent or guardian links");
    });

    it("strictly rejects linking a minor as a parent", () => {
      const res = validateParentChildLink({
        playerId: "youth-child-id",
        parentId: "minor-parent-id",
        slot: 1,
        existingLinks: [],
        childIsMinor: true,
        parentIsMinor: true, // Parent is minor!
      });

      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe("MINOR_CANNOT_BE_PARENT");
      expect(res.errorMessage).toContain("Minors under 18 cannot be linked as parents");
    });

    it("permits linking when child is minor (<18) and parent is adult (>=18)", () => {
      const res = validateParentChildLink({
        playerId: "youth-child-id",
        parentId: "adult-parent-id",
        slot: 1,
        existingLinks: [],
        childIsMinor: true,
        parentIsMinor: false,
      });

      expect(res.valid).toBe(true);
    });
  });
});
