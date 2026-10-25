import { prisma } from "@/lib/db";
import {
  hasPermission,
  PermissionAction,
  PermissionContext,
} from "../domain/permissions";
import {
  getCurrentSession,
  requireActivatedSession,
} from "./session-guard";
import { ActiveSessionData } from "./session.service";

export class UnauthorizedError extends Error {
  constructor(
    message = "Unauthorized: You do not have permission to perform this action."
  ) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Resolves all linked player profile IDs for a parent profile.
 */
async function getLinkedPlayerIdsForParent(
  parentProfileId: string
): Promise<string[]> {
  const links = await prisma.parentChildLink.findMany({
    where: { parentId: parentProfileId },
    select: { playerId: true },
  });
  return links.map((l) => l.playerId);
}

/**
 * Builds permission context for an active session and optional target.
 */
async function buildPermissionContext(
  session: ActiveSessionData,
  targetProfileId?: string
): Promise<PermissionContext> {
  let linkedPlayerIds: string[] | undefined;

  // If user holds PARENT role, query their linked children for scoped evaluation
  if (session.roles.includes("PARENT")) {
    linkedPlayerIds = await getLinkedPlayerIdsForParent(session.memberProfileId);
  }

  return {
    userId: session.userAccountId,
    userProfileId: session.memberProfileId,
    roles: session.roles,
    targetProfileId,
    linkedPlayerIds,
  };
}

/**
 * Server-side action authorization guard helper (FR-006, FR-007).
 * Throws UnauthorizedError if active user lacks permission for the given action on the target.
 */
export async function requirePermission(
  action: PermissionAction,
  options?: {
    targetProfileId?: string;
  }
): Promise<ActiveSessionData> {
  const session = await requireActivatedSession();
  const ctx = await buildPermissionContext(session, options?.targetProfileId);

  const allowed = hasPermission(action, ctx);
  if (!allowed) {
    throw new UnauthorizedError(
      `Forbidden: Insufficient permissions for action '${action}'.`
    );
  }

  return session;
}

/**
 * Non-throwing permission check helper for conditional UI rendering.
 */
export async function checkPermission(
  action: PermissionAction,
  options?: {
    targetProfileId?: string;
  }
): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session) return false;

  const ctx = await buildPermissionContext(session, options?.targetProfileId);
  return hasPermission(action, ctx);
}
