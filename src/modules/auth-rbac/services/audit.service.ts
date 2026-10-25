import { prisma } from "@/lib/db";

export interface LogAuditParams {
  actorProfileId?: string | null;
  targetProfileId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}

/**
 * Centralized service to write immutable audit log records (FR-080, T055).
 */
export async function logAuditEvent(params: LogAuditParams): Promise<void> {
  const { actorProfileId, targetProfileId, action, metadata } = params;

  await prisma.auditLog.create({
    data: {
      actorProfileId: actorProfileId || null,
      targetProfileId: targetProfileId || null,
      action,
      metadata: metadata ? (metadata as any) : undefined,
    },
  });
}

/**
 * Retrieves audit logs filtered by target or actor for security & compliance inspection.
 */
export async function getAuditLogs(params: {
  targetProfileId?: string;
  actorProfileId?: string;
  action?: string;
  limit?: number;
}) {
  const { targetProfileId, actorProfileId, action, limit = 100 } = params;

  return prisma.auditLog.findMany({
    where: {
      targetProfileId: targetProfileId || undefined,
      actorProfileId: actorProfileId || undefined,
      action: action || undefined,
    },
    include: {
      actorProfile: {
        select: { id: true, firstName: true, lastName: true },
      },
      targetProfile: {
        select: { id: true, firstName: true, lastName: true, isAnonymized: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
