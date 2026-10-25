import { describe, it, expect } from "vitest";
import {
  doIntervalsOverlap,
  evaluateFacilityConflict,
  TimeInterval,
} from "@/modules/teams-matches/domain/facility-conflicts";

describe("Facility Collision Detector & Role Policy", () => {
  const FACILITY_MAIN_PITCH = "facility-main-pitch-001";
  const FACILITY_NETS = "facility-nets-001";

  describe("doIntervalsOverlap", () => {
    it("detects strictly overlapping time intervals", () => {
      // 10:00 to 12:00 vs 11:00 to 13:00 -> Overlap
      expect(
        doIntervalsOverlap("2026-06-06T10:00:00Z", "2026-06-06T12:00:00Z", "2026-06-06T11:00:00Z", "2026-06-06T13:00:00Z")
      ).toBe(true);

      // 10:00 to 14:00 vs 11:00 to 12:00 (enclosed) -> Overlap
      expect(
        doIntervalsOverlap("2026-06-06T10:00:00Z", "2026-06-06T14:00:00Z", "2026-06-06T11:00:00Z", "2026-06-06T12:00:00Z")
      ).toBe(true);

      // Exact same times -> Overlap
      expect(
        doIntervalsOverlap("2026-06-06T10:00:00Z", "2026-06-06T12:00:00Z", "2026-06-06T10:00:00Z", "2026-06-06T12:00:00Z")
      ).toBe(true);
    });

    it("does not flag adjacent non-overlapping intervals (touching boundaries)", () => {
      // 10:00 to 12:00 vs 12:00 to 14:00 (ends exactly when next begins)
      expect(
        doIntervalsOverlap("2026-06-06T10:00:00Z", "2026-06-06T12:00:00Z", "2026-06-06T12:00:00Z", "2026-06-06T14:00:00Z")
      ).toBe(false);

      // Completely separate times
      expect(
        doIntervalsOverlap("2026-06-06T10:00:00Z", "2026-06-06T11:00:00Z", "2026-06-06T15:00:00Z", "2026-06-06T16:00:00Z")
      ).toBe(false);
    });

    it("throws error if interval start is greater than or equal to end", () => {
      expect(() =>
        doIntervalsOverlap("2026-06-06T12:00:00Z", "2026-06-06T10:00:00Z", "2026-06-06T13:00:00Z", "2026-06-06T14:00:00Z")
      ).toThrow("Invalid interval");
    });
  });

  describe("evaluateFacilityConflict", () => {
    const existingBookings: TimeInterval[] = [
      {
        id: "event-1st-xi-match",
        facilityId: FACILITY_MAIN_PITCH,
        title: "1st XI League Match vs Svanholm",
        startAt: "2026-06-06T13:00:00Z",
        endAt: "2026-06-06T19:00:00Z",
        lifecycleStatus: "SCHEDULED",
      },
      {
        id: "event-cancelled-booking",
        facilityId: FACILITY_MAIN_PITCH,
        title: "Cancelled Friendly",
        startAt: "2026-06-06T09:00:00Z",
        endAt: "2026-06-06T12:00:00Z",
        lifecycleStatus: "CANCELLED",
      },
      {
        id: "event-nets-session",
        facilityId: FACILITY_NETS,
        title: "Youth Net Practice",
        startAt: "2026-06-06T14:00:00Z",
        endAt: "2026-06-06T16:00:00Z",
        lifecycleStatus: "SCHEDULED",
      },
    ];

    it("passes cleanly when booking a different, unoccupied facility at the same time", () => {
      const result = evaluateFacilityConflict({
        candidate: {
          facilityId: "facility-indoor-hall",
          startAt: "2026-06-06T14:00:00Z",
          endAt: "2026-06-06T16:00:00Z",
        },
        existingEvents: existingBookings,
        userRole: "COACH",
      });

      expect(result.hasConflict).toBe(false);
      expect(result.isAllowed).toBe(true);
    });

    it("passes cleanly when facilityId is null (e.g. away match)", () => {
      const result = evaluateFacilityConflict({
        candidate: {
          facilityId: null,
          startAt: "2026-06-06T14:00:00Z",
          endAt: "2026-06-06T16:00:00Z",
        },
        existingEvents: existingBookings,
        userRole: "COACH",
      });

      expect(result.hasConflict).toBe(false);
      expect(result.isAllowed).toBe(true);
    });

    it("ignores CANCELLED events on the same facility", () => {
      // Overlaps with the cancelled 09:00-12:00 booking
      const result = evaluateFacilityConflict({
        candidate: {
          facilityId: FACILITY_MAIN_PITCH,
          startAt: "2026-06-06T10:00:00Z",
          endAt: "2026-06-06T12:00:00Z",
        },
        existingEvents: existingBookings,
        userRole: "COACH",
      });

      expect(result.hasConflict).toBe(false);
      expect(result.isAllowed).toBe(true);
    });

    it("hard-blocks regular COACH on overlapping facility booking", () => {
      // Candidate overlaps with 13:00 - 19:00 match on Main Pitch
      const result = evaluateFacilityConflict({
        candidate: {
          facilityId: FACILITY_MAIN_PITCH,
          startAt: "2026-06-06T14:00:00Z",
          endAt: "2026-06-06T17:00:00Z",
        },
        existingEvents: existingBookings,
        userRole: "COACH",
      });

      expect(result.hasConflict).toBe(true);
      expect(result.isAllowed).toBe(false);
      expect(result.isOverride).toBe(false);
      expect(result.conflictingEvent?.id).toBe("event-1st-xi-match");
      expect(result.reason).toContain("Ground or facility is already booked");
    });

    it("hard-blocks AD_HOC_COACH on overlapping facility booking", () => {
      const result = evaluateFacilityConflict({
        candidate: {
          facilityId: FACILITY_MAIN_PITCH,
          startAt: "2026-06-06T14:00:00Z",
          endAt: "2026-06-06T17:00:00Z",
        },
        existingEvents: existingBookings,
        userRole: "AD_HOC_COACH",
      });

      expect(result.hasConflict).toBe(true);
      expect(result.isAllowed).toBe(false);
    });

    it("blocks ADMIN if collision occurs and override reason is missing or too short", () => {
      const result = evaluateFacilityConflict({
        candidate: {
          facilityId: FACILITY_MAIN_PITCH,
          startAt: "2026-06-06T14:00:00Z",
          endAt: "2026-06-06T17:00:00Z",
        },
        existingEvents: existingBookings,
        userRole: "ADMIN",
        collisionOverrideReason: "no", // Too short (< 5 chars)
      });

      expect(result.hasConflict).toBe(true);
      expect(result.isAllowed).toBe(false);
      expect(result.reason).toContain("Administrator must provide an override reason");
    });

    it("allows ADMIN with valid override reason (>= 5 chars) and marks isOverride", () => {
      const result = evaluateFacilityConflict({
        candidate: {
          facilityId: FACILITY_MAIN_PITCH,
          startAt: "2026-06-06T14:00:00Z",
          endAt: "2026-06-06T17:00:00Z",
        },
        existingEvents: existingBookings,
        userRole: "ADMIN",
        collisionOverrideReason: "Joint club practice sharing the main outfield and boundary",
      });

      expect(result.hasConflict).toBe(true);
      expect(result.isAllowed).toBe(true);
      expect(result.isOverride).toBe(true);
      expect(result.warning).toContain("Admin override applied");
    });

    it("excludes the candidate event itself when updating an existing event", () => {
      const result = evaluateFacilityConflict({
        candidate: {
          id: "event-1st-xi-match", // Updating itself!
          facilityId: FACILITY_MAIN_PITCH,
          startAt: "2026-06-06T13:00:00Z",
          endAt: "2026-06-06T19:30:00Z",
        },
        existingEvents: existingBookings,
        userRole: "COACH",
      });

      expect(result.hasConflict).toBe(false);
      expect(result.isAllowed).toBe(true);
    });
  });
});
