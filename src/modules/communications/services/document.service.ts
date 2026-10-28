import { prisma } from "@/lib/db";
import { ClubDocument, DocumentCategory, DocumentSignOff, Role } from "@prisma/client";
import {
  CreateClubDocumentInput,
  UpdateClubDocumentInput,
  SignOffDocumentInput,
} from "../contracts/document.contract";
import {
  evaluateMemberPolicyCompliance,
  validateSignOffSubmission,
  MemberComplianceEvaluation,
  ClubDocumentItem,
  DocumentSignOffRecord,
} from "../domain/policy-compliance";
import { notificationService } from "@/modules/auth-rbac/notifications/notification.service";

export type ClubDocumentWithStatus = ClubDocument & {
  isSigned?: boolean;
  signedAt?: Date | null;
  versionSigned?: string | null;
  signOffCount?: number;
};

export interface DocumentComplianceMetric {
  document: ClubDocument;
  totalEligible: number;
  signedCount: number;
  unsignedCount: number;
  completionRate: number; // 0 to 100
  signedMembers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    signedAt: Date;
    roles: Role[];
  }>;
  unsignedMembers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    roles: Role[];
    squads: string[];
  }>;
}

/**
 * Generate a clean URL-friendly slug from title
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * List club documents with optional category filter and current member's sign-off status.
 */
export async function listClubDocuments(options?: {
  category?: DocumentCategory;
  isActiveOnly?: boolean;
  targetProfileId?: string;
}): Promise<ClubDocumentWithStatus[]> {
  const where: any = {};
  if (options?.category) {
    where.category = options.category;
  }
  if (options?.isActiveOnly !== false) {
    where.isActive = true;
  }

  const documents = await prisma.clubDocument.findMany({
    where,
    include: {
      signOffs: options?.targetProfileId
        ? {
            where: { memberProfileId: options.targetProfileId },
            select: { id: true, versionSigned: true, signedAt: true },
          }
        : {
            select: { id: true, versionSigned: true, signedAt: true },
          },
    },
    orderBy: [{ category: "asc" }, { publishedAt: "desc" }],
  });

  return documents.map((doc) => {
    let isSigned = false;
    let signedAt: Date | null = null;
    let versionSigned: string | null = null;

    if (options?.targetProfileId) {
      const match = doc.signOffs.find((s) => s.versionSigned === doc.version);
      if (match) {
        isSigned = true;
        signedAt = match.signedAt || null;
        versionSigned = match.versionSigned;
      }
    }

    return {
      ...doc,
      isSigned,
      signedAt,
      versionSigned,
      signOffCount: doc.signOffs.length,
    };
  });
}

/**
 * Fetch a single club document by ID or slug.
 */
export async function getClubDocumentById(
  idOrSlug: string,
  targetProfileId?: string
): Promise<ClubDocumentWithStatus | null> {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      idOrSlug
    );

  const document = await prisma.clubDocument.findUnique({
    where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
    include: {
      signOffs: targetProfileId
        ? {
            where: { memberProfileId: targetProfileId },
            select: { id: true, versionSigned: true, signedAt: true },
          }
        : true,
    },
  });

  if (!document) return null;

  let isSigned = false;
  let signedAt: Date | null = null;
  let versionSigned: string | null = null;

  if (targetProfileId) {
    const match = document.signOffs.find((s) => s.versionSigned === document.version);
    if (match) {
      isSigned = true;
      signedAt = match.signedAt || null;
      versionSigned = match.versionSigned;
    }
  }

  return {
    ...document,
    isSigned,
    signedAt,
    versionSigned,
    signOffCount: document.signOffs.length,
  };
}

/**
 * Create a new club governance document (Admin only).
 */
export async function createClubDocument(
  input: CreateClubDocumentInput
): Promise<ClubDocument> {
  let baseSlug = input.slug || slugify(input.title);
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.clubDocument.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return prisma.clubDocument.create({
    data: {
      title: input.title,
      slug,
      category: input.category,
      version: input.version,
      fileUrl: input.fileUrl,
      contentMarkdown: input.contentMarkdown,
      requiresSignOff: input.requiresSignOff,
      targetRole: input.targetRole,
      isActive: input.isActive ?? true,
    },
  });
}

/**
 * Update a club governance document (Admin only).
 */
export async function updateClubDocument(
  input: UpdateClubDocumentInput
): Promise<ClubDocument> {
  const existing = await prisma.clubDocument.findUnique({
    where: { id: input.documentId },
  });

  if (!existing) {
    throw new Error("Club document not found.");
  }

  return prisma.clubDocument.update({
    where: { id: input.documentId },
    data: {
      title: input.title,
      version: input.version,
      fileUrl: input.fileUrl,
      contentMarkdown: input.contentMarkdown,
      requiresSignOff: input.requiresSignOff,
      targetRole: input.targetRole,
      isActive: input.isActive,
    },
  });
}

/**
 * Submit digital policy sign-off recording immutable audit metadata.
 */
export async function signOffDocument(input: {
  documentId: string;
  memberProfileId: string;
  versionSigned: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<DocumentSignOff> {
  const document = await prisma.clubDocument.findUnique({
    where: { id: input.documentId },
  });

  if (!document) {
    throw new Error("Document not found.");
  }

  const docItem: ClubDocumentItem = {
    id: document.id,
    title: document.title,
    slug: document.slug,
    category: document.category,
    version: document.version,
    requiresSignOff: document.requiresSignOff,
    targetRole: document.targetRole,
    isActive: document.isActive,
  };

  const validation = validateSignOffSubmission(docItem, input.versionSigned);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid policy sign-off submission.");
  }

  // Upsert sign-off for idempotency and audit preservation
  return prisma.documentSignOff.upsert({
    where: {
      documentId_memberProfileId_versionSigned: {
        documentId: input.documentId,
        memberProfileId: input.memberProfileId,
        versionSigned: input.versionSigned,
      },
    },
    update: {
      signedAt: new Date(),
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
    },
    create: {
      documentId: input.documentId,
      memberProfileId: input.memberProfileId,
      versionSigned: input.versionSigned,
      signedAt: new Date(),
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
    },
  });
}

/**
 * Evaluate member compliance against all mandatory policies for soft-warning banner rendering.
 */
export async function getMemberPolicyCompliance(
  profileId: string
): Promise<MemberComplianceEvaluation> {
  const profile = await prisma.memberProfile.findUnique({
    where: { id: profileId },
    include: {
      roleAssignments: { select: { role: true } },
    },
  });

  if (!profile) {
    return {
      isCompliant: true,
      totalMandatory: 0,
      signedCount: 0,
      unsignedCount: 0,
      unsignedDocuments: [],
      shouldShowWarningBanner: false,
    };
  }

  const memberRoles = profile.roleAssignments.map((r) => r.role);

  // Active documents requiring sign-off
  const activeDocs = await prisma.clubDocument.findMany({
    where: { isActive: true, requiresSignOff: true },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  const docItems: ClubDocumentItem[] = activeDocs.map((d) => ({
    id: d.id,
    title: d.title,
    slug: d.slug,
    category: d.category,
    version: d.version,
    requiresSignOff: d.requiresSignOff,
    targetRole: d.targetRole,
    isActive: d.isActive,
  }));

  const signOffs = await prisma.documentSignOff.findMany({
    where: { memberProfileId: profileId },
    select: {
      documentId: true,
      versionSigned: true,
      signedAt: true,
    },
  });

  const signOffRecords: DocumentSignOffRecord[] = signOffs.map((s) => ({
    documentId: s.documentId,
    versionSigned: s.versionSigned,
    signedAt: s.signedAt,
  }));

  return evaluateMemberPolicyCompliance(docItems, signOffRecords, memberRoles);
}

/**
 * Generate full compliance audit report across all mandatory governance documents (Admin only).
 */
export async function getDocumentComplianceReport(
  documentId?: string
): Promise<DocumentComplianceMetric[]> {
  const where: any = {
    isActive: true,
    requiresSignOff: true,
  };

  if (documentId) {
    where.id = documentId;
  }

  const documents = await prisma.clubDocument.findMany({
    where,
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  const report: DocumentComplianceMetric[] = [];

  for (const doc of documents) {
    // 1. Identify all eligible active member profiles
    const memberWhere: any = {
      isAnonymized: false,
    };

    if (doc.targetRole) {
      memberWhere.roleAssignments = {
        some: { role: doc.targetRole },
      };
    }

    const eligibleProfiles = await prisma.memberProfile.findMany({
      where: memberWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        roleAssignments: { select: { role: true } },
        rosterMemberships: {
          where: { isActive: true },
          select: { teamSquad: { select: { name: true } } },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    // 2. Fetch current version sign-offs for this document
    const signOffs = await prisma.documentSignOff.findMany({
      where: {
        documentId: doc.id,
        versionSigned: doc.version,
      },
      select: {
        memberProfileId: true,
        signedAt: true,
      },
    });

    const signOffMap = new Map(signOffs.map((s) => [s.memberProfileId, s.signedAt]));

    const signedMembers: DocumentComplianceMetric["signedMembers"] = [];
    const unsignedMembers: DocumentComplianceMetric["unsignedMembers"] = [];

    for (const p of eligibleProfiles) {
      const signedAt = signOffMap.get(p.id);
      const roles = p.roleAssignments.map((r) => r.role);
      const squads = p.rosterMemberships.map((m) => m.teamSquad.name);

      if (signedAt) {
        signedMembers.push({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          signedAt,
          roles,
        });
      } else {
        unsignedMembers.push({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          phone: p.phone,
          roles,
          squads,
        });
      }
    }

    const totalEligible = eligibleProfiles.length;
    const signedCount = signedMembers.length;
    const unsignedCount = unsignedMembers.length;
    const completionRate =
      totalEligible > 0 ? Math.round((signedCount / totalEligible) * 100) : 100;

    report.push({
      document: doc,
      totalEligible,
      signedCount,
      unsignedCount,
      completionRate,
      signedMembers,
      unsignedMembers,
    });
  }

  return report;
}

/**
 * Dispatch policy review reminders to all unsigned members via NotificationService (Admin only).
 */
export async function sendPolicyReminder(
  documentId: string
): Promise<{ remindersSent: number; recipientEmails: string[] }> {
  const document = await prisma.clubDocument.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new Error("Document not found.");
  }

  const reports = await getDocumentComplianceReport(documentId);
  const metric = reports[0];
  if (!metric) {
    return { remindersSent: 0, recipientEmails: [] };
  }

  const recipientEmails: string[] = [];

  for (const member of metric.unsignedMembers) {
    if (member.email) {
      recipientEmails.push(member.email);

      await notificationService.sendEmail({
        to: member.email,
        subject: `[Action Required] Sign Club Policy: ${document.title} (v${document.version})`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
            <h2 style="color: #0f172a;">Roskilde Cricket Club – Policy Acknowledgment Required</h2>
            <p>Dear ${member.firstName},</p>
            <p>The club has published a mandatory governance document that requires your digital review and acknowledgment:</p>
            <blockquote style="background: #f1f5f9; padding: 12px 16px; border-left: 4px solid #0284c7; margin: 16px 0;">
              <strong>${document.title}</strong> (Version ${document.version})<br/>
              <em>Category: ${document.category.replace(/_/g, " ")}</em>
            </blockquote>
            <p>Please log in to your club dashboard and complete the 1-click digital sign-off to ensure club compliance with Danish sport federation guidelines.</p>
            <p><a href="/documents" style="display: inline-block; padding: 10px 20px; background: #0284c7; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">Review and Sign Policy</a></p>
            <p>Best regards,<br/><strong>Roskilde Cricket Club Administration</strong></p>
          </div>
        `,
      });
    }
  }

  return {
    remindersSent: recipientEmails.length,
    recipientEmails,
  };
}
