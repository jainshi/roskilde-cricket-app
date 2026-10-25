import { describe, it, expect } from "vitest";
import {
  calculateAge,
  isMinor,
  canHaveLoginAccount,
  getAllowedRolesForAge,
  MIN_LOGIN_AGE,
  ADULT_AGE,
} from "@/modules/auth-rbac/domain/age-rules";
import {
  getActivationStep,
  computeTemporaryPasswordExpiry,
  isTemporaryPasswordExpired,
  isAccountLocked,
  registerFailedLogin,
  MAX_FAILED_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
} from "@/modules/auth-rbac/domain/activation";
import { validateOnboardingRules } from "@/modules/auth-rbac/domain/onboarding-rules";

describe("T014: Account activation state transitions & domain rules", () => {
  const fixedNow = new Date("2026-06-15T12:00:00Z");

  describe("Age Rules", () => {
    it("calculates age correctly across leap years and birthdays", () => {
      expect(calculateAge(new Date("2010-06-14T00:00:00Z"), fixedNow)).toBe(16);
      expect(calculateAge(new Date("2010-06-16T00:00:00Z"), fixedNow)).toBe(15);
      expect(calculateAge(new Date("2010-06-15T00:00:00Z"), fixedNow)).toBe(16);
    });

    it("evaluates minor status (under 18)", () => {
      expect(isMinor(new Date("2008-06-14T00:00:00Z"), fixedNow)).toBe(false); // 18
      expect(isMinor(new Date("2008-06-16T00:00:00Z"), fixedNow)).toBe(true);  // 17
      expect(isMinor(null, fixedNow)).toBe(false); // No DOB defaults to adult
    });

    it("evaluates login eligibility (>= 13)", () => {
      // 12 year old
      expect(canHaveLoginAccount(new Date("2014-06-16T00:00:00Z"), fixedNow)).toBe(false);
      // 13 year old
      expect(canHaveLoginAccount(new Date("2013-06-15T00:00:00Z"), fixedNow)).toBe(true);
      // null DOB defaults to eligible
      expect(canHaveLoginAccount(null, fixedNow)).toBe(true);
    });

    it("restricts minor roles to PLAYER only", () => {
      const minorDob = new Date("2012-01-01T00:00:00Z");
      expect(getAllowedRolesForAge(minorDob, fixedNow)).toEqual(["PLAYER"]);

      const adultDob = new Date("2000-01-01T00:00:00Z");
      expect(getAllowedRolesForAge(adultDob, fixedNow)).toContain("ADMIN");
      expect(getAllowedRolesForAge(adultDob, fixedNow)).toContain("COACH");
    });
  });

  describe("Activation State Transitions", () => {
    it("requires RESET_PASSWORD first if mustResetPassword is true", () => {
      const step = getActivationStep({
        mustResetPassword: true,
        hasCurrentConsent: false,
        isMinor: false,
      });
      expect(step).toBe("RESET_PASSWORD");
    });

    it("routes adult to CONSENT when password is reset but no consent given", () => {
      const step = getActivationStep({
        mustResetPassword: false,
        hasCurrentConsent: false,
        isMinor: false,
      });
      expect(step).toBe("CONSENT");
    });

    it("routes minor to AWAITING_GUARDIAN_CONSENT when no consent given", () => {
      const step = getActivationStep({
        mustResetPassword: false,
        hasCurrentConsent: false,
        isMinor: true,
      });
      expect(step).toBe("AWAITING_GUARDIAN_CONSENT");
    });

    it("returns COMPLETE when password reset and consent given", () => {
      const step = getActivationStep({
        mustResetPassword: false,
        hasCurrentConsent: true,
        isMinor: false,
      });
      expect(step).toBe("COMPLETE");
    });
  });

  describe("Temporary Password Expiry", () => {
    it("sets expiry 7 days in future", () => {
      const expiry = computeTemporaryPasswordExpiry(fixedNow);
      const diffDays = (expiry.getTime() - fixedNow.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(7);
    });

    it("detects expired temporary passwords", () => {
      const expiredDate = new Date(fixedNow.getTime() - 1000);
      expect(
        isTemporaryPasswordExpired(
          { mustResetPassword: true, temporaryPasswordExpiresAt: expiredDate },
          fixedNow
        )
      ).toBe(true);

      const validDate = new Date(fixedNow.getTime() + 10000);
      expect(
        isTemporaryPasswordExpired(
          { mustResetPassword: true, temporaryPasswordExpiresAt: validDate },
          fixedNow
        )
      ).toBe(false);

      // Not expired if mustResetPassword is false
      expect(
        isTemporaryPasswordExpired(
          { mustResetPassword: false, temporaryPasswordExpiresAt: expiredDate },
          fixedNow
        )
      ).toBe(false);
    });
  });

  describe("Account Lockout", () => {
    it("increments failed attempts up to threshold", () => {
      let state = registerFailedLogin(0, fixedNow);
      expect(state.failedLoginAttempts).toBe(1);
      expect(state.locked).toBe(false);
      expect(state.lockedUntil).toBeNull();

      state = registerFailedLogin(4, fixedNow);
      expect(state.failedLoginAttempts).toBe(0);
      expect(state.locked).toBe(true);
      expect(state.lockedUntil).not.toBeNull();
      const lockDurationMs = state.lockedUntil!.getTime() - fixedNow.getTime();
      expect(lockDurationMs).toBe(LOCKOUT_DURATION_MINUTES * 60 * 1000);
    });

    it("checks isAccountLocked correctly", () => {
      const futureLock = new Date(fixedNow.getTime() + 60000);
      expect(isAccountLocked(futureLock, fixedNow)).toBe(true);

      const pastLock = new Date(fixedNow.getTime() - 1000);
      expect(isAccountLocked(pastLock, fixedNow)).toBe(false);
      expect(isAccountLocked(null, fixedNow)).toBe(false);
    });
  });

  describe("Onboarding Cross-Field Rules", () => {
    it("flags player without date of birth", () => {
      const violations = validateOnboardingRules(
        {
          roles: ["PLAYER"],
          dateOfBirth: null,
          email: "player@example.com",
          grantLoginAccess: false,
        },
        fixedNow
      );
      expect(violations).toContain("PLAYER_REQUIRES_DOB");
    });

    it("flags minor given non-PLAYER roles", () => {
      const minorDob = new Date("2012-01-01T00:00:00Z");
      const violations = validateOnboardingRules(
        {
          roles: ["PLAYER", "COACH"],
          dateOfBirth: minorDob,
          email: "minor@example.com",
          grantLoginAccess: false,
        },
        fixedNow
      );
      expect(violations).toContain("MINOR_ROLES_RESTRICTED");
    });

    it("flags login access for youth under 13", () => {
      const under13Dob = new Date("2015-01-01T00:00:00Z");
      const violations = validateOnboardingRules(
        {
          roles: ["PLAYER"],
          dateOfBirth: under13Dob,
          email: "youth@example.com",
          grantLoginAccess: true,
        },
        fixedNow
      );
      expect(violations).toContain("LOGIN_REQUIRES_AGE_13");
    });

    it("passes for valid adult with login credentials", () => {
      const adultDob = new Date("1995-01-01T00:00:00Z");
      const violations = validateOnboardingRules(
        {
          roles: ["COACH", "ADMIN"],
          dateOfBirth: adultDob,
          email: "coach@example.com",
          grantLoginAccess: true,
        },
        fixedNow
      );
      expect(violations).toHaveLength(0);
    });

    it("explicitly supports standalone Adult/Senior Players (Senior 1st XI, Senior 2nd XI, Social XI)", () => {
      const seniorPlayerDob = new Date("1998-04-12T00:00:00Z");
      // Adult player with PLAYER role, own email, and login credentials granted (no parent link needed)
      const violations = validateOnboardingRules(
        {
          roles: ["PLAYER"],
          dateOfBirth: seniorPlayerDob,
          email: "senior.batter@roskildecricket.dk",
          grantLoginAccess: true,
        },
        fixedNow
      );
      expect(violations).toHaveLength(0);

      // Verify that age calculation confirms adult status
      expect(isMinor(seniorPlayerDob, fixedNow)).toBe(false);
      expect(canHaveLoginAccount(seniorPlayerDob, fixedNow)).toBe(true);
      expect(getAllowedRolesForAge(seniorPlayerDob, fixedNow)).toContain("PLAYER");
    });

    it("explicitly allows non-player roles (PARENT, COACH, AD_HOC_COACH, ADMIN) without a date of birth", () => {
      // Coach/Admin/Parent with NO date of birth
      const violations = validateOnboardingRules(
        {
          roles: ["COACH", "ADMIN"],
          dateOfBirth: null,
          email: "coach.only@roskildecricket.dk",
          grantLoginAccess: true,
        },
        fixedNow
      );
      expect(violations).toHaveLength(0);

      // Verify that null DOB is safely treated as adult account
      expect(isMinor(null, fixedNow)).toBe(false);
      expect(canHaveLoginAccount(null, fixedNow)).toBe(true);
      expect(getAllowedRolesForAge(null, fixedNow)).toContain("ADMIN");
      expect(getAllowedRolesForAge(null, fixedNow)).toContain("COACH");
      expect(getAllowedRolesForAge(null, fixedNow)).toContain("PARENT");
    });
  });
});
