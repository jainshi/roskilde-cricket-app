import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentSession, requireActivatedSession } from "./session-guard";
import { ActiveSessionData } from "./session.service";

export const ACTIVE_PROFILE_COOKIE_NAME = "rcc_active_profile";

export interface ActiveContextData {
  activeProfileId: string;
  isDelegated: boolean;
  actorProfileId: string;
  targetChild?: {
    id: string;
    name: string;
  };
  session: ActiveSessionData;
}

/**
 * Resolves the current active member context (self vs linked child).
 * If a parent has selected a linked youth player profile, all pitch-side actions
 * (e.g. equipment checkout, RSVP, kit sizes) are scoped to that child.
 */
export async function getActiveContext(): Promise<ActiveContextData | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  const cookieStore = await cookies();
  const activeProfileCookie = cookieStore.get(ACTIVE_PROFILE_COOKIE_NAME)?.value;

  // Default to self if no cookie or cookie matches self
  if (!activeProfileCookie || activeProfileCookie === session.memberProfileId) {
    return {
      activeProfileId: session.memberProfileId,
      isDelegated: false,
      actorProfileId: session.memberProfileId,
      session,
    };
  }

  // Validate delegation: activeProfileCookie must be a child linked to this parent
  const link = await prisma.parentChildLink.findFirst({
    where: {
      parentId: session.memberProfileId,
      playerId: activeProfileCookie,
    },
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (link) {
    return {
      activeProfileId: link.player.id,
      isDelegated: true,
      actorProfileId: session.memberProfileId,
      targetChild: {
        id: link.player.id,
        name: `${link.player.firstName} ${link.player.lastName}`.trim(),
      },
      session,
    };
  }

  // Fallback to self if cookie points to an unlinked profile
  return {
    activeProfileId: session.memberProfileId,
    isDelegated: false,
    actorProfileId: session.memberProfileId,
    session,
  };
}

/**
 * Sets or clears the active context cookie.
 */
export async function setActiveProfileCookie(
  targetProfileId: string
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_PROFILE_COOKIE_NAME, targetProfileId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function clearActiveProfileCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_PROFILE_COOKIE_NAME);
}
