import { describe, it, expect } from "vitest";
import { VolunteerDutyType, VolunteerSlotStatus } from "@prisma/client";
import {
  validateDutyClaim,
  requestDutySwap,
  acceptDutySwap,
  calculateEventVolunteerFulfillment,
  VolunteerSlotState,
} from "@/modules/volunteers/domain/volunteer-roster";

describe("Volunteer Roster Domain Logic (T007, T008)", () => {
  const openSlot: VolunteerSlotState = {
    id: "slot-001",
    eventId: "event-001",
    dutyType: VolunteerDutyType.SCORING,
    title: "Official Match Scorer",
    status: VolunteerSlotStatus.OPEN,
    assignedProfileId: null,
  };

  const claimedSlot: VolunteerSlotState = {
    id: "slot-002",
    eventId: "event-001",
    dutyType: VolunteerDutyType.UMPIRING,
    title: "Square-Leg Umpire",
    status: VolunteerSlotStatus.CLAIMED,
    assignedProfileId: "prof-volunteer-1",
    claimedAt: new Date("2026-05-01T10:00:00Z"),
  };

  describe("validateDutyClaim", () => {
    it("allows a non-playing member or parent to claim an open slot", () => {
      const result = validateDutyClaim(openSlot, "prof-parent-1", false);
      expect(result.valid).toBe(true);
      expect(result.hasLineupWarning).toBeFalsy();
    });

    it("rejects claiming a slot that is already claimed by someone else", () => {
      const result = validateDutyClaim(claimedSlot, "prof-parent-2", false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("already claimed");
    });

    it("emits a soft warning if a player confirmed in Playing XI claims an in-game officiating duty", () => {
      const result = validateDutyClaim(openSlot, "prof-playing-xi-1", true);
      expect(result.valid).toBe(true);
      expect(result.hasLineupWarning).toBe(true);
      expect(result.warningMessage).toContain("Playing XI lineup");
    });

    it("does not emit lineup warning for non-officiating duties like carpool or ground prep", () => {
      const carpoolSlot: VolunteerSlotState = {
        ...openSlot,
        dutyType: VolunteerDutyType.YOUTH_CARPOOL,
        title: "Carpool Driver",
      };
      const result = validateDutyClaim(carpoolSlot, "prof-playing-xi-1", true);
      expect(result.valid).toBe(true);
      expect(result.hasLineupWarning).toBeFalsy();
    });
  });

  describe("requestDutySwap", () => {
    it("allows the currently assigned volunteer to request a swap with a reason", () => {
      const now = new Date("2026-05-02T12:00:00Z");
      const result = requestDutySwap(claimedSlot, "prof-volunteer-1", "Sick with flu", now);

      expect(result.valid).toBe(true);
      expect(result.updatedSlot?.status).toBe(VolunteerSlotStatus.SWAP_REQUESTED);
      expect(result.updatedSlot?.swapReason).toBe("Sick with flu");
      expect(result.updatedSlot?.swapRequestedAt).toEqual(now);
    });

    it("rejects swap requests from members who are not assigned to the slot", () => {
      const result = requestDutySwap(claimedSlot, "prof-imposter", "Not my slot");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Only the currently assigned volunteer");
    });

    it("rejects swap requests on open slots", () => {
      const result = requestDutySwap(openSlot, "prof-volunteer-1", "No one is assigned");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("unassigned slot");
    });
  });

  describe("acceptDutySwap", () => {
    const swapSlot: VolunteerSlotState = {
      ...claimedSlot,
      status: VolunteerSlotStatus.SWAP_REQUESTED,
      swapReason: "Work conflict",
      swapRequestedAt: new Date("2026-05-02T10:00:00Z"),
    };

    it("reassigns the slot to the accepting volunteer and clears swap request data", () => {
      const now = new Date("2026-05-02T14:00:00Z");
      const result = acceptDutySwap(swapSlot, "prof-new-volunteer", now);

      expect(result.valid).toBe(true);
      expect(result.updatedSlot?.status).toBe(VolunteerSlotStatus.CLAIMED);
      expect(result.updatedSlot?.assignedProfileId).toBe("prof-new-volunteer");
      expect(result.updatedSlot?.swapReason).toBeNull();
      expect(result.updatedSlot?.swapRequestedAt).toBeNull();
    });

    it("rejects acceptance if the slot is not in SWAP_REQUESTED status", () => {
      const result = acceptDutySwap(claimedSlot, "prof-new-volunteer");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("not currently pending a swap request");
    });

    it("prevents the existing volunteer from accepting their own swap request", () => {
      const result = acceptDutySwap(swapSlot, "prof-volunteer-1");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("already the assigned volunteer");
    });
  });

  describe("calculateEventVolunteerFulfillment", () => {
    it("returns 'Duties Filled' (success) when all slots are claimed", () => {
      const slots = [claimedSlot, { ...claimedSlot, id: "slot-003", dutyType: VolunteerDutyType.TEA_CATERING }];
      const result = calculateEventVolunteerFulfillment(slots);

      expect(result.isFullyStaffed).toBe(true);
      expect(result.badgeLabel).toBe("Duties Filled (2/2)");
      expect(result.badgeVariant).toBe("success");
    });

    it("returns 'Swap Requested' (warning) when any slot is pending a swap", () => {
      const slots = [
        claimedSlot,
        { ...claimedSlot, id: "slot-003", status: VolunteerSlotStatus.SWAP_REQUESTED },
      ];
      const result = calculateEventVolunteerFulfillment(slots);

      expect(result.isFullyStaffed).toBe(false);
      expect(result.badgeLabel).toBe("Swap Requested (1)");
      expect(result.badgeVariant).toBe("warning");
    });

    it("returns 'Volunteers Needed' (warning or destructive) when slots are open", () => {
      const partialSlots = [claimedSlot, openSlot];
      const partialResult = calculateEventVolunteerFulfillment(partialSlots);

      expect(partialResult.isFullyStaffed).toBe(false);
      expect(partialResult.badgeLabel).toBe("Volunteers Needed (1/2)");
      expect(partialResult.badgeVariant).toBe("warning");

      const emptySlots = [openSlot, { ...openSlot, id: "slot-004" }];
      const emptyResult = calculateEventVolunteerFulfillment(emptySlots);

      expect(emptyResult.badgeLabel).toBe("Volunteers Needed (0/2)");
      expect(emptyResult.badgeVariant).toBe("destructive");
    });
  });
});
