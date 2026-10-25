import { describe, it, expect } from "vitest";
import {
  isRsvpCutoffPassed,
  evaluateRsvpSubmission,
  initializeRosterRsvps,
} from "@/modules/teams-matches/domain/rsvp-evaluator";

describe("RSVP Evaluator & Cutoff Deadline Enforcement", () => {
  const mockEvent = {
    scheduledEventId: "event-123",
    rsvpDeadlineAt: "2026-06-04T12:00:00Z", // Thursday 12:00
  };

  describe("isRsvpCutoffPassed", () => {
    it("returns false when current time is strictly before deadline", () => {
      const before = "2026-06-03T10:00:00Z";
      expect(isRsvpCutoffPassed(mockEvent.rsvpDeadlineAt, before)).toBe(false);
    });

    it("returns true when current time is exactly at or past deadline", () => {
      const exact = "2026-06-04T12:00:00Z";
      const after = "2026-06-04T12:00:01Z";
      expect(isRsvpCutoffPassed(mockEvent.rsvpDeadlineAt, exact)).toBe(true);
      expect(isRsvpCutoffPassed(mockEvent.rsvpDeadlineAt, after)).toBe(true);
    });
  });

  describe("evaluateRsvpSubmission", () => {
    const playerProfileId = "player-lucas-001";
    const parentProfileId = "parent-soren-001";
    const strangerProfileId = "unrelated-member-001";
    const coachProfileId = "coach-henrik-001";

    it("permits self-service submission before deadline", () => {
      const result = evaluateRsvpSubmission({
        event: mockEvent,
        playerProfileId,
        callerProfileId: playerProfileId,
        callerRole: "PLAYER",
        newStatus: "AVAILABLE",
        currentTime: "2026-06-03T09:00:00Z",
      });

      expect(result.isAllowed).toBe(true);
      expect(result.isLocked).toBe(false);
      expect(result.isDelegated).toBe(false);
    });

    it("permits linked parent submission via delegation before deadline", () => {
      const result = evaluateRsvpSubmission({
        event: mockEvent,
        playerProfileId,
        callerProfileId: parentProfileId,
        callerRole: "PARENT",
        linkedParentProfileIds: [parentProfileId],
        newStatus: "AVAILABLE",
        currentTime: "2026-06-03T09:00:00Z",
      });

      expect(result.isAllowed).toBe(true);
      expect(result.isLocked).toBe(false);
      expect(result.isDelegated).toBe(true);
    });

    it("rejects unauthorized stranger from submitting RSVP for player", () => {
      const result = evaluateRsvpSubmission({
        event: mockEvent,
        playerProfileId,
        callerProfileId: strangerProfileId,
        callerRole: "PLAYER",
        linkedParentProfileIds: [parentProfileId],
        newStatus: "AVAILABLE",
        currentTime: "2026-06-03T09:00:00Z",
      });

      expect(result.isAllowed).toBe(false);
      expect(result.reason).toContain("do not have permission");
    });

    it("locks out player when submitting after deadline", () => {
      const result = evaluateRsvpSubmission({
        event: mockEvent,
        playerProfileId,
        callerProfileId: playerProfileId,
        callerRole: "PLAYER",
        newStatus: "AVAILABLE",
        currentTime: "2026-06-04T13:00:00Z", // 1 hour past deadline
      });

      expect(result.isAllowed).toBe(false);
      expect(result.isLocked).toBe(true);
      expect(result.reason).toContain("cutoff deadline for this event has passed");
    });

    it("locks out parent when submitting after deadline", () => {
      const result = evaluateRsvpSubmission({
        event: mockEvent,
        playerProfileId,
        callerProfileId: parentProfileId,
        callerRole: "PARENT",
        linkedParentProfileIds: [parentProfileId],
        newStatus: "AVAILABLE",
        currentTime: "2026-06-04T13:00:00Z",
      });

      expect(result.isAllowed).toBe(false);
      expect(result.isLocked).toBe(true);
    });

    it("allows COACH to override and update RSVP after deadline pitch-side", () => {
      const result = evaluateRsvpSubmission({
        event: mockEvent,
        playerProfileId,
        callerProfileId: coachProfileId,
        callerRole: "COACH",
        newStatus: "AVAILABLE",
        currentTime: "2026-06-04T13:00:00Z",
      });

      expect(result.isAllowed).toBe(true);
      expect(result.isLocked).toBe(true);
      expect(result.reason).toContain("Coach/Admin pitch-side override");
    });

    it("rejects RSVP submission on a cancelled event", () => {
      const result = evaluateRsvpSubmission({
        event: { ...mockEvent, isCancelled: true },
        playerProfileId,
        callerProfileId: playerProfileId,
        callerRole: "PLAYER",
        newStatus: "AVAILABLE",
        currentTime: "2026-06-03T09:00:00Z",
      });

      expect(result.isAllowed).toBe(false);
      expect(result.reason).toContain("cancelled event");
    });
  });

  describe("initializeRosterRsvps", () => {
    it("seeds explicit NO_RESPONSE status for all active squad members", () => {
      const playerIds = ["p1", "p2", "p3"];
      const seeded = initializeRosterRsvps("event-123", playerIds);

      expect(seeded).toHaveLength(3);
      expect(seeded.every((r) => r.status === "NO_RESPONSE")).toBe(true);
      expect(seeded.every((r) => r.scheduledEventId === "event-123")).toBe(true);
      expect(seeded[0].memberProfileId).toBe("p1");
    });
  });
});
