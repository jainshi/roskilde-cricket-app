import { describe, it, expect } from "vitest";
import {
  sanitizeMemberForDirectory,
  filterDirectoryMembers,
  canViewerSeeContact,
  RawMemberForDirectory,
  DirectoryViewerContext,
} from "@/modules/auth-rbac/domain/directory-privacy";
import { Role, BattingPosition, BowlingStyle, SecondaryRole } from "@prisma/client";

describe("Member Directory & Privacy Masking Rules (FR-053, FR-054, FR-055, FR-056, FR-057, FR-058, FR-059)", () => {
  const testNow = new Date("2026-10-25T00:00:00Z");

  const minorYouthPlayer: RawMemberForDirectory = {
    id: "youth-1",
    firstName: "Liam",
    lastName: "Hansen",
    email: "liam@example.com",
    phone: "+4511223344",
    address: "Strandvej 12",
    city: "Roskilde",
    postalCode: "4000",
    dateOfBirth: new Date("2012-05-10T00:00:00Z"), // 14 yrs old (Youth)
    battingPosition: "TOP_ORDER" as BattingPosition,
    bowlingStyle: "RIGHT_ARM_MEDIUM" as BowlingStyle,
    secondaryRoles: ["ALL_ROUNDER" as SecondaryRole],
    isAnonymized: false,
    roleAssignments: [{ role: "PLAYER" as Role }],
    privacySettings: {
      showEmailInDirectory: true, // Even if set to true, minor rules protect it!
      showPhoneInDirectory: true,
      showAddressInDirectory: true,
    },
    emergencyContacts: [{ name: "Mother", phone: "+45999999" }],
    shirtSize: "YOUTH_M",
    trouserSize: "YOUTH_M",
    capSize: "YOUTH_M",
  };

  const adultPlayerPrivate: RawMemberForDirectory = {
    id: "adult-1",
    firstName: "Mikkel",
    lastName: "Poulsen",
    email: "mikkel@example.com",
    phone: "+4522334455",
    address: "Algade 45",
    city: "Roskilde",
    postalCode: "4000",
    dateOfBirth: new Date("1995-03-15T00:00:00Z"), // Adult
    battingPosition: "OPENING_BATTER" as BattingPosition,
    bowlingStyle: "RIGHT_ARM_FAST" as BowlingStyle,
    secondaryRoles: [],
    isAnonymized: false,
    roleAssignments: [{ role: "PLAYER" as Role }],
    privacySettings: {
      showEmailInDirectory: false, // Default hidden
      showPhoneInDirectory: false,
      showAddressInDirectory: false,
    },
  };

  const adultPlayerPublic: RawMemberForDirectory = {
    id: "adult-2",
    firstName: "Frederik",
    lastName: "Nielsen",
    email: "frederik@example.com",
    phone: "+4533445566",
    address: "Ringvejen 10",
    city: "Roskilde",
    postalCode: "4000",
    dateOfBirth: new Date("1998-08-20T00:00:00Z"), // Adult
    battingPosition: "MIDDLE_ORDER" as BattingPosition,
    bowlingStyle: "OFF_SPIN" as BowlingStyle,
    secondaryRoles: ["WICKETKEEPER" as SecondaryRole],
    isAnonymized: false,
    roleAssignments: [{ role: "PLAYER" as Role }],
    privacySettings: {
      showEmailInDirectory: true, // Opted in
      showPhoneInDirectory: true,
      showAddressInDirectory: false,
    },
  };

  const anonymizedMember: RawMemberForDirectory = {
    id: "former-1",
    firstName: "Former",
    lastName: "Member #123",
    email: null,
    phone: null,
    address: null,
    city: null,
    postalCode: null,
    dateOfBirth: null,
    battingPosition: null,
    bowlingStyle: null,
    secondaryRoles: [],
    isAnonymized: true, // GDPR deleted shell
    roleAssignments: [],
    privacySettings: null,
  };

  describe("Minor Privacy Protection in Directory (FR-056, FR-059)", () => {
    it("strictly hides minor email, phone, city, and exact DOB when viewed by another player", () => {
      const viewer: DirectoryViewerContext = {
        viewerProfileId: "other-player",
        viewerRoles: ["PLAYER"],
        linkedChildIds: [],
      };

      const sanitized = sanitizeMemberForDirectory(minorYouthPlayer, viewer, testNow);
      expect(sanitized).not.toBeNull();
      expect(sanitized!.id).toBe("youth-1");
      expect(sanitized!.fullName).toBe("Liam Hansen");
      expect(sanitized!.email).toBeNull();
      expect(sanitized!.phone).toBeNull();
      expect(sanitized!.city).toBeNull();
      expect(sanitized!.approximateAge).toBeNull(); // exact age hidden from regular viewers
      expect(sanitized!.ageCategory).toBe("YOUTH_13_17");
      expect(sanitized!.battingPosition).toBe("TOP_ORDER");
      expect(sanitized!.bowlingStyle).toBe("RIGHT_ARM_MEDIUM");
    });

    it("strictly hides minor contact details when viewed by an unrelated parent", () => {
      const viewer: DirectoryViewerContext = {
        viewerProfileId: "unrelated-parent",
        viewerRoles: ["PARENT"],
        linkedChildIds: ["different-child-id"],
      };

      const sanitized = sanitizeMemberForDirectory(minorYouthPlayer, viewer, testNow);
      expect(sanitized!.email).toBeNull();
      expect(sanitized!.phone).toBeNull();
      expect(sanitized!.city).toBeNull();
    });

    it("reveals minor contact details to the child's own linked parent", () => {
      const viewer: DirectoryViewerContext = {
        viewerProfileId: "liams-parent",
        viewerRoles: ["PARENT"],
        linkedChildIds: ["youth-1"], // Liam is linked to this parent!
      };

      const sanitized = sanitizeMemberForDirectory(minorYouthPlayer, viewer, testNow);
      expect(sanitized!.email).toBe("liam@example.com");
      expect(sanitized!.phone).toBe("+4511223344");
      expect(sanitized!.city).toBe("Roskilde");
      expect(sanitized!.canViewFullDetails).toBe(true);
    });

    it("reveals minor contact details to Admin and Coach (FR-057)", () => {
      const adminViewer: DirectoryViewerContext = {
        viewerProfileId: "club-admin",
        viewerRoles: ["ADMIN"],
        linkedChildIds: [],
      };

      const coachViewer: DirectoryViewerContext = {
        viewerProfileId: "head-coach",
        viewerRoles: ["COACH"],
        linkedChildIds: [],
      };

      const adminView = sanitizeMemberForDirectory(minorYouthPlayer, adminViewer, testNow);
      expect(adminView!.email).toBe("liam@example.com");
      expect(adminView!.phone).toBe("+4511223344");
      expect(adminView!.city).toBe("Roskilde");
      expect(adminView!.approximateAge).toBe(14);
      expect(adminView!.canViewFullDetails).toBe(true);

      const coachView = sanitizeMemberForDirectory(minorYouthPlayer, coachViewer, testNow);
      expect(coachView!.email).toBe("liam@example.com");
      expect(coachView!.phone).toBe("+4511223344");
    });

    it("treats Ad-Hoc Coaches as regular directory viewers (FR-058)", () => {
      const adHocViewer: DirectoryViewerContext = {
        viewerProfileId: "adhoc-coach-1",
        viewerRoles: ["AD_HOC_COACH"],
        linkedChildIds: [],
      };

      const sanitized = sanitizeMemberForDirectory(minorYouthPlayer, adHocViewer, testNow);
      expect(sanitized!.email).toBeNull();
      expect(sanitized!.phone).toBeNull();
      expect(sanitized!.canViewFullDetails).toBe(false);
    });
  });

  describe("Adult Privacy Toggles (FR-054, FR-055)", () => {
    const regularViewer: DirectoryViewerContext = {
      viewerProfileId: "viewer-1",
      viewerRoles: ["PLAYER"],
      linkedChildIds: [],
    };

    it("hides email, phone, and address by default when toggles are disabled", () => {
      const sanitized = sanitizeMemberForDirectory(adultPlayerPrivate, regularViewer, testNow);
      expect(sanitized!.email).toBeNull();
      expect(sanitized!.phone).toBeNull();
      expect(sanitized!.city).toBeNull();
      expect(sanitized!.fullName).toBe("Mikkel Poulsen");
      expect(sanitized!.battingPosition).toBe("OPENING_BATTER");
    });

    it("displays email and phone when member explicitly opted in, but keeps address hidden if not opted in", () => {
      const sanitized = sanitizeMemberForDirectory(adultPlayerPublic, regularViewer, testNow);
      expect(sanitized!.email).toBe("frederik@example.com");
      expect(sanitized!.phone).toBe("+4533445566");
      expect(sanitized!.city).toBeNull(); // Address toggle was false
    });

    it("allows Admins and Coaches to see adult contact details regardless of privacy toggles (FR-057)", () => {
      const adminViewer: DirectoryViewerContext = {
        viewerProfileId: "admin-1",
        viewerRoles: ["ADMIN"],
        linkedChildIds: [],
      };

      const sanitized = sanitizeMemberForDirectory(adultPlayerPrivate, adminViewer, testNow);
      expect(sanitized!.email).toBe("mikkel@example.com");
      expect(sanitized!.phone).toBe("+4522334455");
      expect(sanitized!.city).toBe("Roskilde");
    });
  });

  describe("Sensitive Fields Excluded from Directory Payload (FR-054)", () => {
    it("never includes emergency contacts or kit sizes in directory serialization", () => {
      const viewer: DirectoryViewerContext = {
        viewerProfileId: "admin-1",
        viewerRoles: ["ADMIN"],
        linkedChildIds: [],
      };

      const sanitized = sanitizeMemberForDirectory(minorYouthPlayer, viewer, testNow);
      expect(sanitized).not.toHaveProperty("emergencyContacts");
      expect(sanitized).not.toHaveProperty("shirtSize");
      expect(sanitized).not.toHaveProperty("trouserSize");
      expect(sanitized).not.toHaveProperty("capSize");
    });

    it("completely excludes anonymized former members from directory (FR-074)", () => {
      const viewer: DirectoryViewerContext = {
        viewerProfileId: "admin-1",
        viewerRoles: ["ADMIN"],
        linkedChildIds: [],
      };

      const sanitized = sanitizeMemberForDirectory(anonymizedMember, viewer, testNow);
      expect(sanitized).toBeNull();
    });
  });

  describe("Directory Filtering & Search (SC-007, FR-053)", () => {
    const viewer: DirectoryViewerContext = {
      viewerProfileId: "viewer-1",
      viewerRoles: ["PLAYER"],
      linkedChildIds: [],
    };

    const members = [
      sanitizeMemberForDirectory(minorYouthPlayer, viewer, testNow)!,
      sanitizeMemberForDirectory(adultPlayerPrivate, viewer, testNow)!,
      sanitizeMemberForDirectory(adultPlayerPublic, viewer, testNow)!,
    ];

    it("filters members by name search query (case-insensitive substring)", () => {
      const liamResults = filterDirectoryMembers(members, { searchQuery: "liam" });
      expect(liamResults).toHaveLength(1);
      expect(liamResults[0].fullName).toBe("Liam Hansen");

      const poulsenResults = filterDirectoryMembers(members, { searchQuery: "POULSEN" });
      expect(poulsenResults).toHaveLength(1);
      expect(poulsenResults[0].fullName).toBe("Mikkel Poulsen");
    });

    it("filters members by batting position", () => {
      const openers = filterDirectoryMembers(members, { battingPosition: "OPENING_BATTER" });
      expect(openers).toHaveLength(1);
      expect(openers[0].fullName).toBe("Mikkel Poulsen");
    });

    it("filters members by bowling style", () => {
      const offSpinners = filterDirectoryMembers(members, { bowlingStyle: "OFF_SPIN" });
      expect(offSpinners).toHaveLength(1);
      expect(offSpinners[0].fullName).toBe("Frederik Nielsen");
    });

    it("filters members by age category", () => {
      const youths = filterDirectoryMembers(members, { ageCategory: "YOUTH_13_17" });
      expect(youths).toHaveLength(1);
      expect(youths[0].fullName).toBe("Liam Hansen");

      const adults = filterDirectoryMembers(members, { ageCategory: "ADULT" });
      expect(adults).toHaveLength(2);
    });
  });
});
