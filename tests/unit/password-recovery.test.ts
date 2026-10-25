import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateTemporaryPassword, validatePasswordComplexity } from "@/lib/password";
import { canHaveLoginAccount } from "@/modules/auth-rbac/domain/age-rules";
import {
  computeTemporaryPasswordExpiry,
  TEMPORARY_PASSWORD_VALIDITY_DAYS,
} from "@/modules/auth-rbac/domain/activation";

describe("Password Recovery & Reset Flows (SRS §3.1.3 & FR-014, FR-019)", () => {
  describe("Temporary Password Generation (FR-014)", () => {
    it("generates CSPRNG passwords between 6 and 8 characters long", () => {
      const pwd6 = generateTemporaryPassword(6);
      const pwd8 = generateTemporaryPassword(8);

      expect(pwd6.length).toBe(6);
      expect(pwd8.length).toBe(8);
      // Ensure only alphanumeric unambiguous chars are used
      expect(pwd6).toMatch(/^[2-9A-HJ-NP-Za-km-z]+$/);
      expect(pwd8).toMatch(/^[2-9A-HJ-NP-Za-km-z]+$/);
    });

    it("rejects invalid lengths outside 6-8 characters", () => {
      expect(() => generateTemporaryPassword(5)).toThrow();
      expect(() => generateTemporaryPassword(9)).toThrow();
    });

    it("sets temporary password expiration to 7 days", () => {
      const now = new Date("2026-10-25T12:00:00Z");
      const expiry = computeTemporaryPasswordExpiry(now);
      const expected = new Date("2026-11-01T12:00:00Z");

      expect(expiry.getTime()).toBe(expected.getTime());
      expect(
        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ).toBe(TEMPORARY_PASSWORD_VALIDITY_DAYS);
    });
  });

  describe("Password Complexity Requirements (SRS §3.1.3 / FR-018)", () => {
    it("enforces minimum 8 characters", () => {
      const res = validatePasswordComplexity("Aa1!");
      expect(res.isValid).toBe(false);
      expect(res.failedRules).toContain("MIN_LENGTH");
    });

    it("requires at least one uppercase letter", () => {
      const res = validatePasswordComplexity("alllowercase1!");
      expect(res.isValid).toBe(false);
      expect(res.failedRules).toContain("UPPERCASE");
    });

    it("requires at least one lowercase letter", () => {
      const res = validatePasswordComplexity("ALLUPPERCASE1!");
      expect(res.isValid).toBe(false);
      expect(res.failedRules).toContain("LOWERCASE");
    });

    it("requires at least one digit", () => {
      const res = validatePasswordComplexity("NoDigitsHere!");
      expect(res.isValid).toBe(false);
      expect(res.failedRules).toContain("DIGIT");
    });

    it("requires at least one special symbol", () => {
      const res = validatePasswordComplexity("NoSymbols1234");
      expect(res.isValid).toBe(false);
      expect(res.failedRules).toContain("SYMBOL");
    });

    it("accepts a password meeting all complexity criteria", () => {
      const res = validatePasswordComplexity("R0skilde#Cricket26");
      expect(res.isValid).toBe(true);
      expect(res.failedRules).toEqual([]);
    });
  });

  describe("Age Eligibility for Login Credentials (FR-012)", () => {
    it("allows adults and members aged 13+ to receive login accounts", () => {
      const now = new Date("2026-10-25T00:00:00Z");
      // 14 years old
      const dob14 = new Date("2012-05-10T00:00:00Z");
      expect(canHaveLoginAccount(dob14, now)).toBe(true);

      // Adult without DOB
      expect(canHaveLoginAccount(null, now)).toBe(true);
    });

    it("strictly prohibits login accounts for youth under 13", () => {
      const now = new Date("2026-10-25T00:00:00Z");
      // 10 years old
      const dob10 = new Date("2016-05-10T00:00:00Z");
      expect(canHaveLoginAccount(dob10, now)).toBe(false);

      // 12 years and 11 months old
      const dobAlmost13 = new Date("2013-11-01T00:00:00Z");
      expect(canHaveLoginAccount(dobAlmost13, now)).toBe(false);
    });
  });
});
