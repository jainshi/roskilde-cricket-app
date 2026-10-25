import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateTemporaryPassword,
  validatePasswordComplexity,
} from "@/lib/password";
import { getDictionary } from "@/i18n/get-dictionary";
import {
  ConsoleNotificationAdapter,
  getNotificationService,
} from "@/modules/auth-rbac/notifications/notification.service";

describe("Phase 2 Foundational Unit Tests", () => {
  describe("Password Utilities (T008)", () => {
    it("should hash and verify passwords using Argon2id", async () => {
      const password = "CricketPassword@2026";
      const hash = await hashPassword(password);
      expect(hash).toMatch(/^\$argon2id\$/);

      const isValid = await verifyPassword(hash, password);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword(hash, "WrongPassword@2026");
      expect(isInvalid).toBe(false);
    });

    it("should generate CSPRNG temporary passwords with 6-8 chars", () => {
      const tempPw8 = generateTemporaryPassword(8);
      expect(tempPw8.length).toBe(8);
      expect(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(tempPw8)).toBe(true);

      const tempPw6 = generateTemporaryPassword(6);
      expect(tempPw6.length).toBe(6);

      expect(() => generateTemporaryPassword(5)).toThrow();
      expect(() => generateTemporaryPassword(9)).toThrow();
    });

    it("should enforce SRS password complexity requirements", () => {
      // Missing symbol
      expect(validatePasswordComplexity("Cricket123").isValid).toBe(false);
      // Missing uppercase
      expect(validatePasswordComplexity("cricket@123").isValid).toBe(false);
      // Missing lowercase
      expect(validatePasswordComplexity("CRICKET@123").isValid).toBe(false);
      // Missing digit
      expect(validatePasswordComplexity("Cricket@Club").isValid).toBe(false);
      // Too short
      expect(validatePasswordComplexity("Cr1@").isValid).toBe(false);

      // Valid
      const valid = validatePasswordComplexity("Cricket@2026");
      expect(valid.isValid).toBe(true);
      expect(valid.errors.length).toBe(0);
    });
  });

  describe("Pluggable NotificationService (T009)", () => {
    it("should deliver emails via console adapter by default", async () => {
      const service = new ConsoleNotificationAdapter();
      const res = await service.sendEmail({
        to: "parent@example.com",
        subject: "Invitation",
        html: "<p>Welcome to RCC</p>",
      });
      expect(res.success).toBe(true);
      expect(res.messageId).toContain("console-");
    });

    it("should return ConsoleNotificationAdapter factory when provider is unset or console", () => {
      const service = getNotificationService();
      expect(service).toBeInstanceOf(ConsoleNotificationAdapter);
    });
  });

  describe("i18n Dictionary Setup (T010)", () => {
    it("should load English dictionary by default", () => {
      const dict = getDictionary("en");
      expect(dict.common.appName).toBe("Roskilde Cricket Club");
      expect(dict.common.signIn).toBe("Sign In");
    });

    it("should load Danish dictionary when requested", () => {
      const dict = getDictionary("da");
      expect(dict.common.appName).toBe("Roskilde Cricket Club");
      expect(dict.common.signIn).toBe("Log ind");
    });

    it("should fall back to English for unknown locales", () => {
      const dict = getDictionary("fr");
      expect(dict.common.signIn).toBe("Sign In");
    });
  });
});
