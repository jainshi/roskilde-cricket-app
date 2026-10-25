import { describe, it, expect } from "vitest";
import {
  resolveMemberContact,
  MemberContactDetails,
} from "@/modules/auth-rbac/domain/contact-resolver";

describe("Contact Fallback Resolution & Notification Routing (FR-022, FR-023, FR-024)", () => {
  const parent1 = {
    parentId: "parent-1",
    firstName: "Maria",
    lastName: "Hansen",
    email: "maria.hansen@example.com",
    phone: "+4511223344",
  };

  const parent2 = {
    parentId: "parent-2",
    firstName: "Lars",
    lastName: "Hansen",
    email: "lars.hansen@example.com",
    phone: "+4555667788",
  };

  describe("Youth Player without own email/phone (FR-022, FR-023)", () => {
    const under13Player: MemberContactDetails = {
      memberId: "child-1",
      firstName: "Mikkel",
      lastName: "Hansen",
      email: null,
      phone: null,
      isMinor: true,
      linkedParents: [parent1, parent2],
    };

    it("falls back to linked parents' contacts for directory display", () => {
      const resolved = resolveMemberContact(under13Player);

      expect(resolved.hasFallback).toBe(true);
      expect(resolved.primaryEmail).toBe(parent1.email);
      expect(resolved.primaryPhone).toBe(parent1.phone);
    });

    it("routes communications to both parents simultaneously (FR-023)", () => {
      const resolved = resolveMemberContact(under13Player);

      expect(resolved.allEmails).toHaveLength(2);
      expect(resolved.allEmails).toContain(parent1.email);
      expect(resolved.allEmails).toContain(parent2.email);

      expect(resolved.notificationRecipients).toHaveLength(2);
      expect(resolved.notificationRecipients.map((r) => r.recipientName)).toEqual([
        "Maria Hansen",
        "Lars Hansen",
      ]);
      expect(resolved.notificationRecipients.every((r) => r.isFallback)).toBe(true);
      expect(resolved.notificationRecipients.every((r) => r.relationship === "PARENT")).toBe(true);
    });
  });

  describe("Youth Player with own email & 2 linked parents (FR-024)", () => {
    const teenagerPlayer: MemberContactDetails = {
      memberId: "youth-1",
      firstName: "Sofie",
      lastName: "Hansen",
      email: "sofie.hansen@example.com",
      phone: "+4599887766",
      isMinor: true,
      linkedParents: [parent1, parent2],
    };

    it("delivers communications to the youth AND both parents simultaneously (FR-024)", () => {
      const resolved = resolveMemberContact(teenagerPlayer);

      expect(resolved.hasFallback).toBe(false);
      expect(resolved.primaryEmail).toBe("sofie.hansen@example.com");

      // 3 recipients total: youth + 2 parents
      expect(resolved.allEmails).toHaveLength(3);
      expect(resolved.allEmails).toContain("sofie.hansen@example.com");
      expect(resolved.allEmails).toContain(parent1.email);
      expect(resolved.allEmails).toContain(parent2.email);

      const selfRecipient = resolved.notificationRecipients.find((r) => r.relationship === "SELF");
      expect(selfRecipient).toBeDefined();
      expect(selfRecipient?.recipientName).toBe("Sofie Hansen");

      const parentRecipients = resolved.notificationRecipients.filter((r) => r.relationship === "PARENT");
      expect(parentRecipients).toHaveLength(2);
    });
  });

  describe("Adult Member with own email", () => {
    const adultPlayer: MemberContactDetails = {
      memberId: "adult-1",
      firstName: "Christian",
      lastName: "Jensen",
      email: "christian@example.com",
      phone: "+4512345678",
      isMinor: false,
      linkedParents: [],
    };

    it("routes exclusively to the adult member without fallback", () => {
      const resolved = resolveMemberContact(adultPlayer);

      expect(resolved.hasFallback).toBe(false);
      expect(resolved.primaryEmail).toBe("christian@example.com");
      expect(resolved.allEmails).toEqual(["christian@example.com"]);
      expect(resolved.notificationRecipients).toHaveLength(1);
      expect(resolved.notificationRecipients[0].relationship).toBe("SELF");
    });
  });
});
