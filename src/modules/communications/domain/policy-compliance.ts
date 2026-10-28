import { DocumentCategory, Role } from "@prisma/client";

export interface ClubDocumentItem {
  id: string;
  title: string;
  slug: string;
  category: DocumentCategory;
  version: string;
  requiresSignOff: boolean;
  targetRole: Role | null;
  isActive: boolean;
}

export interface DocumentSignOffRecord {
  documentId: string;
  versionSigned: string;
  signedAt: Date;
}

export interface MemberComplianceEvaluation {
  isCompliant: boolean;
  totalMandatory: number;
  signedCount: number;
  unsignedCount: number;
  unsignedDocuments: ClubDocumentItem[];
  shouldShowWarningBanner: boolean;
  warningBannerMessage?: string;
}

/**
 * Pure domain evaluator: Evaluates member compliance against active mandatory club governance policies
 * and determines if a persistent amber soft-warning banner should be rendered on their dashboard.
 */
export function evaluateMemberPolicyCompliance(
  documents: ClubDocumentItem[],
  signOffs: DocumentSignOffRecord[],
  memberRoles: Role[]
): MemberComplianceEvaluation {
  // 1. Filter mandatory active documents applicable to member's roles
  const applicableMandatory = documents.filter((doc) => {
    if (!doc.isActive || !doc.requiresSignOff) return false;
    // If targetRole is null, applies to all club members
    if (!doc.targetRole) return true;
    // Otherwise, member must have the target role (e.g. COACH for Børneattest)
    return memberRoles.includes(doc.targetRole);
  });

  const totalMandatory = applicableMandatory.length;

  if (totalMandatory === 0) {
    return {
      isCompliant: true,
      totalMandatory: 0,
      signedCount: 0,
      unsignedCount: 0,
      unsignedDocuments: [],
      shouldShowWarningBanner: false,
    };
  }

  // 2. Identify which documents have not been signed for the current version
  const unsignedDocuments: ClubDocumentItem[] = [];

  for (const doc of applicableMandatory) {
    const isSignedForVersion = signOffs.some(
      (s) => s.documentId === doc.id && s.versionSigned === doc.version
    );

    if (!isSignedForVersion) {
      unsignedDocuments.push(doc);
    }
  }

  const unsignedCount = unsignedDocuments.length;
  const signedCount = totalMandatory - unsignedCount;
  const isCompliant = unsignedCount === 0;

  if (!isCompliant) {
    const docNames = unsignedDocuments.map((d) => `${d.title} (v${d.version})`).join(", ");
    const warningBannerMessage =
      unsignedCount === 1
        ? `Mandatory Policy Sign-Off: ${docNames} requires your digital acknowledgment.`
        : `${unsignedCount} mandatory club policies require your review and digital acknowledgment (${docNames}).`;

    return {
      isCompliant: false,
      totalMandatory,
      signedCount,
      unsignedCount,
      unsignedDocuments,
      shouldShowWarningBanner: true,
      warningBannerMessage,
    };
  }

  return {
    isCompliant: true,
    totalMandatory,
    signedCount,
    unsignedCount: 0,
    unsignedDocuments: [],
    shouldShowWarningBanner: false,
  };
}

/**
 * Pure domain evaluator: Validates whether a sign-off submission accurately references the active document version.
 */
export function validateSignOffSubmission(
  document: ClubDocumentItem,
  versionSubmitted: string
): { valid: boolean; error?: string } {
  if (!document.isActive) {
    return { valid: false, error: "Cannot sign off on an archived or inactive document." };
  }

  if (document.version !== versionSubmitted) {
    return {
      valid: false,
      error: `Version mismatch: document is currently at version ${document.version}, but submission referenced ${versionSubmitted}.`,
    };
  }

  return { valid: true };
}
