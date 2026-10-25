import { describe, it, expect } from "vitest";
import {
  checkoutEquipmentSchema,
  checkinEquipmentSchema,
} from "@/modules/inventory/contracts/loan.contract";
import { ItemCondition } from "@prisma/client";

const VALID_UUID_1 = "123e4567-e89b-12d3-a456-426614174000";
const VALID_UUID_2 = "987fcdeb-51a2-43d7-9876-543210987654";

describe("Loan Contracts Validation (T020)", () => {
  describe("checkoutEquipmentSchema", () => {
    it("accepts valid checkout payload with future expected return date", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const valid = {
        equipmentItemId: VALID_UUID_1,
        borrowerProfileId: VALID_UUID_2,
        quantity: 1,
        expectedReturnAt: futureDate.toISOString(),
        checkoutNotes: "Checked out for practice match",
      };

      const result = checkoutEquipmentSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(1);
        expect(result.data.expectedReturnAt).toBeInstanceOf(Date);
        expect(result.data.checkoutCondition).toBe(ItemCondition.GOOD);
      }
    });

    it("rejects non-positive quantity", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const invalid = {
        equipmentItemId: VALID_UUID_1,
        borrowerProfileId: VALID_UUID_2,
        quantity: 0,
        expectedReturnAt: futureDate.toISOString(),
      };

      const result = checkoutEquipmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("defaults quantity to 1 when omitted", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const payload = {
        equipmentItemId: VALID_UUID_1,
        borrowerProfileId: VALID_UUID_2,
        expectedReturnAt: futureDate.toISOString(),
      };

      const result = checkoutEquipmentSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(1);
      }
    });

    it("rejects empty identifiers", () => {
      const payload = {
        equipmentItemId: "",
        borrowerProfileId: VALID_UUID_2,
        quantity: 1,
      };

      const result = checkoutEquipmentSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Invalid equipment ID");
      }
    });
  });

  describe("checkinEquipmentSchema", () => {
    it("accepts valid checkin with condition assessment", () => {
      const payload = {
        loanId: VALID_UUID_1,
        returnCondition: ItemCondition.GOOD,
        returnNotes: "Returned clean and undamaged",
      };

      const result = checkinEquipmentSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.returnCondition).toBe(ItemCondition.GOOD);
      }
    });

    it("accepts checkin flagged as NEEDS_REPAIR", () => {
      const payload = {
        loanId: VALID_UUID_1,
        returnCondition: ItemCondition.NEEDS_REPAIR,
        returnNotes: "Cracked grip, handle loosened during net practice",
      };

      const result = checkinEquipmentSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.returnCondition).toBe(ItemCondition.NEEDS_REPAIR);
      }
    });

    it("rejects invalid returnCondition", () => {
      const payload = {
        loanId: VALID_UUID_1,
        returnCondition: "BROKEN_INTO_PIECES",
      };

      const result = checkinEquipmentSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("accepts partial return split with valid returnedQuantity and lostQuantity", () => {
      const payload = {
        loanId: VALID_UUID_1,
        returnCondition: ItemCondition.FAIR,
        returnedQuantity: 4,
        lostQuantity: 2,
        returnNotes: "2 training balls hit into the woods",
      };

      const result = checkinEquipmentSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.returnedQuantity).toBe(4);
        expect(result.data.lostQuantity).toBe(2);
      }
    });
  });
});
