import crypto from "crypto";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

export const SESSION_COOKIE_NAME = "rcc_session";
export const SESSION_EXPIRY_DAYS = 30;

export interface ActiveSessionData {
  sessionToken: string;
  userAccountId: string;
  memberProfileId: string;
  email: string;
  mustResetPassword: boolean;
  isAnonymized: boolean;
  roles: Role[];
  activeProfileId: string; // Active context for parents acting on behalf of linked youth
}

/**
 * Creates a database-backed session token.
 */
export async function createSession(params: {
  userAccountId: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<string> {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  await prisma.session.create({
    data: {
      sessionToken,
      userAccountId: params.userAccountId,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      expiresAt,
    },
  });

  return sessionToken;
}

/**
 * Validates session token from database, enforcing expiry, lockout, and active status.
 */
export async function validateSession(
  sessionToken: string
): Promise<ActiveSessionData | null> {
  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: {
      userAccount: {
        include: {
          memberProfile: {
            include: {
              roleAssignments: true,
            },
          },
        },
      },
    },
  });

  if (!session) return null;

  // Check expiration
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const { userAccount } = session;

  // Check account status and lockouts
  if (userAccount.status === "DEACTIVATED") {
    return null;
  }

  if (userAccount.lockedUntil && userAccount.lockedUntil > new Date()) {
    return null;
  }

  const roles = userAccount.memberProfile.roleAssignments.map((ra) => ra.role);

  return {
    sessionToken: session.sessionToken,
    userAccountId: userAccount.id,
    memberProfileId: userAccount.memberProfile.id,
    email: userAccount.email,
    mustResetPassword: userAccount.mustResetPassword,
    isAnonymized: userAccount.memberProfile.isAnonymized,
    roles,
    activeProfileId: userAccount.memberProfile.id,
  };
}

/**
 * Revokes a single session (normal sign out).
 */
export async function revokeSession(sessionToken: string): Promise<void> {
  await prisma.session.delete({ where: { sessionToken } }).catch(() => {});
}

/**
 * Revokes all sessions for a user account across all devices ("Sign out everywhere").
 */
export async function revokeAllSessions(userAccountId: string): Promise<void> {
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userAccountId } }),
    prisma.userAccount.update({
      where: { id: userAccountId },
      data: { sessionVersion: { increment: 1 } },
    }),
  ]);
}
