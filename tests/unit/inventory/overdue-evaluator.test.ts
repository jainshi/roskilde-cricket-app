import { describe, it, expect } from "vitest";
import {
  isLoanOverdue,
  canSendOverdueReminder,
  evaluateLoanOverdueState,
} from "@/modules/inventory/domain/overdue-evaluator";

describe("overdue-evaluator (Overdue Detection & 24h Notification Cooldown)", () => {
  const referenceNow = new Date("2026-06-15T12:00:00.000Z");

  describe("isLoanOverdue", () => {
    it("returns true when current time is strictly after expectedReturnAt", () => {
      const pastDeadline = new Date("2026-06-15T11:59:59.000Z");
      expect(isLoanOverdue({ expectedReturnAt: pastDeadline }, referenceNow)).toBe(true);
    });

    it("returns false when current time is before or equal to expectedReturnAt", () => {
      const futureDeadline = new Date("2026-06-15T12:00:01.000Z");
      const exactDeadline = new Date("2026-06-15T12:00:00.000Z");

      expect(isLoanOverdue({ expectedReturnAt: futureDeadline }, referenceNow)).toBe(false);
      expect(isLoanOverdue({ expectedReturnAt: exactDeadline }, referenceNow)).toBe(false);
    });

    it("returns false if item was returned, regardless of original deadline", () => {
      const pastDeadline = new Date("2026-06-10T12:00:00.000Z");
      const returnTimestamp = new Date("2026-06-12T10:00:00.000Z");

      expect(
        isLoanOverdue(
          { expectedReturnAt: pastDeadline, returnedAt: returnTimestamp },
          referenceNow
        )
      ).toBe(false);
    });
  });

  describe("canSendOverdueReminder (24-Hour Cooldown Guard)", () => {
    it("returns true if no reminder has ever been sent (lastReminderSentAt is null/undefined)", () => {
      expect(canSendOverdueReminder({ lastReminderSentAt: null }, referenceNow)).toBe(true);
      expect(canSendOverdueReminder({}, referenceNow)).toBe(true);
    });

    it("returns false if a reminder was sent less than 24 hours ago", () => {
      // Sent 1 hour ago
      const oneHourAgo = new Date(referenceNow.getTime() - 1 * 60 * 60 * 1000);
      expect(canSendOverdueReminder({ lastReminderSentAt: oneHourAgo }, referenceNow)).toBe(false);

      // Sent 23 hours and 59 minutes ago
      const almostCooldown = new Date(referenceNow.getTime() - (24 * 60 - 1) * 60 * 1000);
      expect(canSendOverdueReminder({ lastReminderSentAt: almostCooldown }, referenceNow)).toBe(false);
    });

    it("returns true once 24 hours have elapsed since the last reminder", () => {
      // Exactly 24 hours ago
      const exactly24hAgo = new Date(referenceNow.getTime() - 24 * 60 * 60 * 1000);
      expect(canSendOverdueReminder({ lastReminderSentAt: exactly24hAgo }, referenceNow)).toBe(true);

      // 48 hours ago
      const twoDaysAgo = new Date(referenceNow.getTime() - 48 * 60 * 60 * 1000);
      expect(canSendOverdueReminder({ lastReminderSentAt: twoDaysAgo }, referenceNow)).toBe(true);
    });
  });

  describe("evaluateLoanOverdueState", () => {
    it("returns not overdue and cannot send reminder for an active on-time loan", () => {
      const futureDeadline = new Date("2026-06-20T12:00:00.000Z");
      const result = evaluateLoanOverdueState(
        { expectedReturnAt: futureDeadline },
        referenceNow
      );

      expect(result.isOverdue).toBe(false);
      expect(result.canSendReminder).toBe(false);
      expect(result.hoursUntilEligible).toBe(0);
    });

    it("returns overdue and eligible for initial reminder", () => {
      const pastDeadline = new Date("2026-06-14T12:00:00.000Z");
      const result = evaluateLoanOverdueState(
        { expectedReturnAt: pastDeadline, lastReminderSentAt: null },
        referenceNow
      );

      expect(result.isOverdue).toBe(true);
      expect(result.canSendReminder).toBe(true);
      expect(result.hoursUntilEligible).toBe(0);
    });

    it("returns overdue but blocked by cooldown with hours remaining calculated", () => {
      const pastDeadline = new Date("2026-06-14T12:00:00.000Z");
      // Reminder sent 6 hours ago
      const sixHoursAgo = new Date(referenceNow.getTime() - 6 * 60 * 60 * 1000);

      const result = evaluateLoanOverdueState(
        { expectedReturnAt: pastDeadline, lastReminderSentAt: sixHoursAgo },
        referenceNow
      );

      expect(result.isOverdue).toBe(true);
      expect(result.canSendReminder).toBe(false);
      expect(result.hoursUntilEligible).toBe(18); // 24 - 6 = 18 hours
    });
  });
});
