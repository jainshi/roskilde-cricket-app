import { describe, it, expect } from "vitest";
import { ItemStatus, ItemCondition, Role } from "@prisma/client";
import {
  validateEquipmentStatusTransition,
  determineCheckinStatus,
} from "@/modules/inventory/domain/equipment-state-machine";

describe("equipment-state-machine (Domain Rules & Constitution Compliance)", () => {
  describe("Terminal RETIRED Invariant", () => {
    it("strictly rejects any transition out of RETIRED status even for Admins", () => {
      const targets = [
        ItemStatus.AVAILABLE,
        ItemStatus.ON_LOAN,
        ItemStatus.UNDER_MAINTENANCE,
      ];

      for (const target of targets) {
        const result = validateEquipmentStatusTransition({
          currentStatus: ItemStatus.RETIRED,
          targetStatus: target,
          actorRoles: [Role.ADMIN],
        });

        expect(result.valid).toBe(false);
        expect(result.error).toContain("Terminal State Invariant");
      }
    });

    it("allows no-op transition if already RETIRED", () => {
      const result = validateEquipmentStatusTransition({
        currentStatus: ItemStatus.RETIRED,
        targetStatus: ItemStatus.RETIRED,
        actorRoles: [Role.ADMIN],
      });
      expect(result.valid).toBe(false); // Terminal check blocks mutations
    });
  });

  describe("Check-Out Invariants (AVAILABLE -> ON_LOAN)", () => {
    it("permits check-out from AVAILABLE for COACH, ADMIN, and AD_HOC_COACH", () => {
      const allowedRoles = [Role.COACH, Role.ADMIN, Role.AD_HOC_COACH];

      for (const role of allowedRoles) {
        const result = validateEquipmentStatusTransition({
          currentStatus: ItemStatus.AVAILABLE,
          targetStatus: ItemStatus.ON_LOAN,
          actorRoles: [role],
        });

        expect(result.valid).toBe(true);
        expect(result.nextStatus).toBe(ItemStatus.ON_LOAN);
      }
    });

    it("rejects check-out if caller is only a PLAYER or PARENT", () => {
      const unauthorizedRoles = [[Role.PLAYER], [Role.PARENT], [Role.PLAYER, Role.PARENT]];

      for (const roles of unauthorizedRoles) {
        const result = validateEquipmentStatusTransition({
          currentStatus: ItemStatus.AVAILABLE,
          targetStatus: ItemStatus.ON_LOAN,
          actorRoles: roles,
        });

        expect(result.valid).toBe(false);
        expect(result.error).toContain("Unauthorized");
      }
    });

    it("strictly forbids check-out from UNDER_MAINTENANCE", () => {
      const result = validateEquipmentStatusTransition({
        currentStatus: ItemStatus.UNDER_MAINTENANCE,
        targetStatus: ItemStatus.ON_LOAN,
        actorRoles: [Role.ADMIN],
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Checkout is only permitted for items in AVAILABLE status");
    });

    it("strictly forbids check-out from ON_LOAN (preventing double check-out)", () => {
      const result = validateEquipmentStatusTransition({
        currentStatus: ItemStatus.ON_LOAN,
        targetStatus: ItemStatus.ON_LOAN,
        actorRoles: [Role.ADMIN],
      });

      expect(result.valid).toBe(true); // Same status is no-op
    });
  });

  describe("Check-In Invariants (ON_LOAN -> AVAILABLE / UNDER_MAINTENANCE / RETIRED)", () => {
    it("permits check-in to AVAILABLE when condition is GOOD/FAIR/NEW", () => {
      const result = validateEquipmentStatusTransition({
        currentStatus: ItemStatus.ON_LOAN,
        targetStatus: ItemStatus.AVAILABLE,
        actorRoles: [Role.COACH],
      });

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe(ItemStatus.AVAILABLE);
    });

    it("permits check-in directly to UNDER_MAINTENANCE when equipment is returned damaged", () => {
      const result = validateEquipmentStatusTransition({
        currentStatus: ItemStatus.ON_LOAN,
        targetStatus: ItemStatus.UNDER_MAINTENANCE,
        actorRoles: [Role.COACH],
      });

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe(ItemStatus.UNDER_MAINTENANCE);
    });

    it("permits writing off lost item directly from ON_LOAN to RETIRED by Admin", () => {
      const result = validateEquipmentStatusTransition({
        currentStatus: ItemStatus.ON_LOAN,
        targetStatus: ItemStatus.RETIRED,
        actorRoles: [Role.ADMIN],
      });

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe(ItemStatus.RETIRED);
    });

    it("rejects writing off lost item from ON_LOAN if actor is not an Admin", () => {
      const result = validateEquipmentStatusTransition({
        currentStatus: ItemStatus.ON_LOAN,
        targetStatus: ItemStatus.RETIRED,
        actorRoles: [Role.COACH],
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Only Administrators can write off");
    });
  });

  describe("Maintenance Lifecycle (AVAILABLE <-> UNDER_MAINTENANCE -> RETIRED)", () => {
    it("allows routing AVAILABLE gear to UNDER_MAINTENANCE by Coach or Admin", () => {
      const result = validateEquipmentStatusTransition({
        currentStatus: ItemStatus.AVAILABLE,
        targetStatus: ItemStatus.UNDER_MAINTENANCE,
        actorRoles: [Role.COACH],
      });

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe(ItemStatus.UNDER_MAINTENANCE);
    });

    it("allows marking maintenance complete (UNDER_MAINTENANCE -> AVAILABLE) by Coach or Admin", () => {
      const result = validateEquipmentStatusTransition({
        currentStatus: ItemStatus.UNDER_MAINTENANCE,
        targetStatus: ItemStatus.AVAILABLE,
        actorRoles: [Role.COACH],
      });

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe(ItemStatus.AVAILABLE);
    });

    it("allows decommissioning irreparable gear (UNDER_MAINTENANCE -> RETIRED) by Admin", () => {
      const result = validateEquipmentStatusTransition({
        currentStatus: ItemStatus.UNDER_MAINTENANCE,
        targetStatus: ItemStatus.RETIRED,
        actorRoles: [Role.ADMIN],
      });

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe(ItemStatus.RETIRED);
    });

    it("rejects retiring gear from UNDER_MAINTENANCE if caller is not an Admin", () => {
      const result = validateEquipmentStatusTransition({
        currentStatus: ItemStatus.UNDER_MAINTENANCE,
        targetStatus: ItemStatus.RETIRED,
        actorRoles: [Role.COACH],
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Only Administrators can retire decommissioned equipment");
    });
  });

  describe("determineCheckinStatus helper", () => {
    it("returns AVAILABLE for NEW, GOOD, FAIR conditions", () => {
      expect(determineCheckinStatus(ItemCondition.NEW)).toBe(ItemStatus.AVAILABLE);
      expect(determineCheckinStatus(ItemCondition.GOOD)).toBe(ItemStatus.AVAILABLE);
      expect(determineCheckinStatus(ItemCondition.FAIR)).toBe(ItemStatus.AVAILABLE);
    });

    it("returns UNDER_MAINTENANCE for NEEDS_REPAIR", () => {
      expect(determineCheckinStatus(ItemCondition.NEEDS_REPAIR)).toBe(ItemStatus.UNDER_MAINTENANCE);
    });

    it("returns RETIRED for RETIRED condition (total loss/destruction)", () => {
      expect(determineCheckinStatus(ItemCondition.RETIRED)).toBe(ItemStatus.RETIRED);
    });
  });
});
