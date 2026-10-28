import { describe, it, expect } from "vitest";
import { DocumentCategory, Role } from "@prisma/client";
import {
  evaluateMemberPolicyCompliance,
  validateSignOffSubmission,
  ClubDocumentItem,
  DocumentSignOffRecord,
} from "@/modules/communications/domain/policy-compliance";

describe("Policy Compliance Domain Logic (T009, T010)", () => {
  const bylawsDoc: ClubDocumentItem = {
    id: "doc-bylaws",
    title: "Club Bylaws 2026",
    slug: "club-bylaws-2026",
    category: DocumentCategory.BYLAWS,
    version: "2026.1",
    requiresSignOff: false,
    targetRole: null,
    isActive: true,
  };

  const childSafetyDoc: ClubDocumentItem = {
    id: "doc-child-safety",
    title: "RCC Child Safety & Børneattest Policy",
    slug: "child-safety-2026",
    category: DocumentCategory.CHILD_SAFETY,
    version: "2026.1",
    requiresSignOff: true,
    targetRole: Role.COACH,
    isActive: true,
  };

  const codeOfConductDoc: ClubDocumentItem = {
    id: "doc-coc",
    title: "Fair Play Code of Conduct",
    slug: "code-of-conduct-2026",
    category: DocumentCategory.CODE_OF_CONDUCT,
    version: "2026.1",
    requiresSignOff: true,
    targetRole: null, // Applies to all members
    isActive: true,
  };

  describe("evaluateMemberPolicyCompliance", () => {
    it("returns compliant when member has no applicable mandatory policies", () => {
      // Member is a player; childSafetyDoc targets COACH
      const docs = [bylawsDoc, childSafetyDoc];
      const signOffs: DocumentSignOffRecord[] = [];
      const roles = [Role.PLAYER];

      const result = evaluateMemberPolicyCompliance(docs, signOffs, roles);

      expect(result.isCompliant).toBe(true);
      expect(result.totalMandatory).toBe(0);
      expect(result.shouldShowWarningBanner).toBe(false);
    });

    it("triggers warning banner when a Coach has not signed mandatory Børneattest policy", () => {
      const docs = [bylawsDoc, childSafetyDoc, codeOfConductDoc];
      const signOffs: DocumentSignOffRecord[] = [];
      const roles = [Role.COACH];

      const result = evaluateMemberPolicyCompliance(docs, signOffs, roles);

      expect(result.isCompliant).toBe(false);
      expect(result.totalMandatory).toBe(2); // childSafetyDoc + codeOfConductDoc
      expect(result.unsignedCount).toBe(2);
      expect(result.shouldShowWarningBanner).toBe(true);
      expect(result.warningBannerMessage).toContain("mandatory club policies require your review");
    });

    it("detects when a policy version has been updated and requires re-signature", () => {
      const updatedChildSafety: ClubDocumentItem = {
        ...childSafetyDoc,
        version: "2026.2", // New version released
      };
      const docs = [updatedChildSafety];
      // Coach signed the older version "2026.1"
      const signOffs: DocumentSignOffRecord[] = [
        {
          documentId: "doc-child-safety",
          versionSigned: "2026.1",
          signedAt: new Date("2026-01-10T10:00:00Z"),
        },
      ];
      const roles = [Role.COACH];

      const result = evaluateMemberPolicyCompliance(docs, signOffs, roles);

      expect(result.isCompliant).toBe(false);
      expect(result.unsignedCount).toBe(1);
      expect(result.unsignedDocuments[0].version).toBe("2026.2");
      expect(result.shouldShowWarningBanner).toBe(true);
      expect(result.warningBannerMessage).toContain("v2026.2");
    });

    it("clears warning banner once all mandatory policies are signed for the current version", () => {
      const docs = [childSafetyDoc, codeOfConductDoc];
      const signOffs: DocumentSignOffRecord[] = [
        {
          documentId: "doc-child-safety",
          versionSigned: "2026.1",
          signedAt: new Date("2026-05-01T10:00:00Z"),
        },
        {
          documentId: "doc-coc",
          versionSigned: "2026.1",
          signedAt: new Date("2026-05-01T10:00:00Z"),
        },
      ];
      const roles = [Role.COACH];

      const result = evaluateMemberPolicyCompliance(docs, signOffs, roles);

      expect(result.isCompliant).toBe(true);
      expect(result.signedCount).toBe(2);
      expect(result.unsignedCount).toBe(0);
      expect(result.shouldShowWarningBanner).toBe(false);
    });
  });

  describe("validateSignOffSubmission", () => {
    it("accepts sign-off submission when document is active and version matches", () => {
      const result = validateSignOffSubmission(childSafetyDoc, "2026.1");
      expect(result.valid).toBe(true);
    });

    it("rejects sign-off submission with mismatched version string", () => {
      const result = validateSignOffSubmission(childSafetyDoc, "2025.1");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Version mismatch");
    });

    it("rejects sign-off on an inactive archived document", () => {
      const inactiveDoc: ClubDocumentItem = { ...childSafetyDoc, isActive: false };
      const result = validateSignOffSubmission(inactiveDoc, "2026.1");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("archived or inactive");
    });
  });
});
