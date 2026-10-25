"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "../services/session-guard";
import {
  setActiveProfileCookie,
  clearActiveProfileCookie,
} from "../services/context.service";
import { prisma } from "@/lib/db";

export async function switchContextAction(
  targetProfileId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  // If switching back to self
  if (targetProfileId === session.memberProfileId) {
    await clearActiveProfileCookie();
    revalidatePath("/", "layout");
    return { success: true };
  }

  // Validate that the targetProfileId is a linked child
  const link = await prisma.parentChildLink.findFirst({
    where: {
      parentId: session.memberProfileId,
      playerId: targetProfileId,
    },
  });

  if (!link) {
    return {
      success: false,
      error: "You are not authorized to switch to this member context.",
    };
  }

  await setActiveProfileCookie(targetProfileId);
  revalidatePath("/", "layout");

  return { success: true };
}
