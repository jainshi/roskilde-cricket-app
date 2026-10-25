import { describe, it, expect } from "vitest";
import {
  generateTemporaryPassword,
  validatePasswordComplexity,
} from "@/lib/password";
import {
  getFailedPasswordRules,
  PASSWORD_RULES,
  PASSWORD_MIN_LENGTH,
} from "@/modules/auth-rbac/domain/password-rules";
import {
  ResetPasswordSchema,
  CreateMemberProfileSchema,
} from "@/modules/auth-rbac/contracts/schemas";

describe("T013: Password complexity validator & CSPRNG generator", () => {
  describe("generateTemporaryPassword", () => {
    it("generates an 8-character password by default", () => {
      const pwd = generateTemporaryPassword();
      expect(pwd).toHaveLength(8);
      // Only unambiguous characters (no 0, O, 1, I, l)
      expect(pwd).toMatch(/^[2-9A-HJ-NP-Za-km-z]+$/);
      expect(pwd).not.toMatch(/[0O1Il]/);
    });

    it("generates lengths between 6 and 8", () => {
      const p6 = generateTemporaryPassword(6);
      const p7 = generateTemporaryPassword(7);
      const p8 = generateTemporaryPassword(8);
      expect(p6).toHaveLength(6);
      expect(p7).toHaveLength(7);
      expect(p8).toHaveLength(8);
    });

    it("throws for invalid lengths", () => {
      expect(() => generateTemporaryPassword(5)).toThrow();
      expect(() => generateTemporaryPassword(9)).toThrow();
    });

    it("does not include ambiguous characters (0, O, 1, I, l)", () => {
      for (let i = 0; i < 50; i++) {
        const pwd = generateTemporaryPassword(8);
        expect(pwd).not.toMatch(/[0O1Il]/);
      }
    });
  });

  describe("validatePasswordComplexity & getFailedPasswordRules", () => {
    it("fails when password is under 8 characters", () => {
      const failed = getFailedPasswordRules("Ab1!");
      expect(failed).toContain("MIN_LENGTH");
      const res = validatePasswordComplexity("Ab1!");
      expect(res.isValid).toBe(false);
      expect(res.failedRules).toContain("MIN_LENGTH");
    });

    it("fails when missing uppercase", () => {
      const failed = getFailedPasswordRules("lowercase1!");
      expect(failed).toContain("UPPERCASE");
    });

    it("fails when missing lowercase", () => {
      const failed = getFailedPasswordRules("UPPERCASE1!");
      expect(failed).toContain("LOWERCASE");
    });

    it("fails when missing digit", () => {
      const failed = getFailedPasswordRules("Uppercase!");
      expect(failed).toContain("DIGIT");
    });

    it("fails when missing symbol", () => {
      const failed = getFailedPasswordRules("Uppercase12");
      expect(failed).toContain("SYMBOL");
    });

    it("passes when all rules are satisfied", () => {
      const failed = getFailedPasswordRules("Roskilde#2026");
      expect(failed).toHaveLength(0);
      const res = validatePasswordComplexity("Roskilde#2026");
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });
  });

  describe("ResetPasswordSchema", () => {
    it("validates compliant matching passwords", () => {
      const parsed = ResetPasswordSchema.safeParse({
        password: "Valid#Password1",
        confirmPassword: "Valid#Password1",
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects non-matching passwords", () => {
      const parsed = ResetPasswordSchema.safeParse({
        password: "Valid#Password1",
        confirmPassword: "Different#Password2",
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const issues = parsed.error.issues;
        expect(issues.some((i) => i.path.includes("confirmPassword"))).toBe(true);
      }
    });

    it("reports specific rule error codes on password field", () => {
      const parsed = ResetPasswordSchema.safeParse({
        password: "short",
        confirmPassword: "short",
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const messages = parsed.error.issues.map((i) => i.message);
        expect(messages).toContain("auth.passwordRules.MIN_LENGTH");
        expect(messages).toContain("auth.passwordRules.UPPERCASE");
        expect(messages).toContain("auth.passwordRules.DIGIT");
        expect(messages).toContain("auth.passwordRules.SYMBOL");
      }
    });
  });

  describe("CreateMemberProfileSchema conditional dateOfBirth", () => {
    it("fails when PLAYER role is selected but dateOfBirth is empty", () => {
      const parsed = CreateMemberProfileSchema.safeParse({
        firstName: "Player",
        lastName: "Batter",
        email: "player@example.com",
        dateOfBirth: "",
        roles: ["PLAYER"],
        grantLoginAccess: false,
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues.some((i) => i.path.includes("dateOfBirth"))).toBe(true);
      }
    });

    it("succeeds when non-player roles (COACH, ADMIN, PARENT) omit dateOfBirth", () => {
      const parsed = CreateMemberProfileSchema.safeParse({
        firstName: "Coach",
        lastName: "Admin",
        email: "coach@example.com",
        dateOfBirth: "",
        roles: ["COACH", "ADMIN"],
        grantLoginAccess: true,
      });
      expect(parsed.success).toBe(true);
    });

    it("succeeds when PLAYER role includes valid dateOfBirth", () => {
      const parsed = CreateMemberProfileSchema.safeParse({
        firstName: "Adult",
        lastName: "Player",
        email: "adult.player@example.com",
        dateOfBirth: "1998-05-15",
        roles: ["PLAYER"],
        grantLoginAccess: true,
      });
      expect(parsed.success).toBe(true);
    });
  });
});
