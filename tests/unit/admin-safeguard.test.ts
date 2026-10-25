import { describe, it, expect } from "vitest";
import {
  canRemoveAdminRole,
  canDeactivateAccount,
  assertCanModifyAdminStatus,
  LastAdminSafeguardError,
} from "@/modules/auth-rbac/domain/admin-safeguard";

describe("Admin Safeguard Rules (FR-005)", () => {
  describe("When target is the ONLY active Administrator", () => {
    const singleAdminContext = {
      activeAdminCount: 1,
      isTargetActiveAdmin: true,
    };

    it("refuses removing the Admin role", () => {
      expect(canRemoveAdminRole(singleAdminContext)).toBe(false);
      expect(() =>
        assertCanModifyAdminStatus("REVOKE_ROLE", singleAdminContext)
      ).toThrow(LastAdminSafeguardError);
    });

    it("refuses deactivating the Admin account", () => {
      expect(canDeactivateAccount(singleAdminContext)).toBe(false);
      expect(() =>
        assertCanModifyAdminStatus("DEACTIVATE_ACCOUNT", singleAdminContext)
      ).toThrow(LastAdminSafeguardError);
    });
  });

  describe("When system has MULTIPLE active Administrators (e.g. 2 or more)", () => {
    const multipleAdminsContext = {
      activeAdminCount: 2,
      isTargetActiveAdmin: true,
    };

    it("allows removing the Admin role from one administrator", () => {
      expect(canRemoveAdminRole(multipleAdminsContext)).toBe(true);
      expect(() =>
        assertCanModifyAdminStatus("REVOKE_ROLE", multipleAdminsContext)
      ).not.toThrow();
    });

    it("allows deactivating one administrator's account", () => {
      expect(canDeactivateAccount(multipleAdminsContext)).toBe(true);
      expect(() =>
        assertCanModifyAdminStatus("DEACTIVATE_ACCOUNT", multipleAdminsContext)
      ).not.toThrow();
    });
  });

  describe("When target is NOT an Administrator", () => {
    const nonAdminContext = {
      activeAdminCount: 1,
      isTargetActiveAdmin: false,
    };

    it("allows modifying roles without affecting admin safeguard", () => {
      expect(canRemoveAdminRole(nonAdminContext)).toBe(true);
      expect(() =>
        assertCanModifyAdminStatus("REVOKE_ROLE", nonAdminContext)
      ).not.toThrow();
    });

    it("allows deactivating the non-admin account even when only 1 admin exists in system", () => {
      expect(canDeactivateAccount(nonAdminContext)).toBe(true);
      expect(() =>
        assertCanModifyAdminStatus("DEACTIVATE_ACCOUNT", nonAdminContext)
      ).not.toThrow();
    });
  });
});
