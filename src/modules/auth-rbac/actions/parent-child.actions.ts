"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "../services/auth-guard";
import {
  addParentChildLink,
  removeParentChildLink,
} from "../services/parent-child.service";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

export interface ParentLinkActionState {
  success?: boolean;
  error?: string;
}

export async function addParentLinkAction(
  prevState: ParentLinkActionState | null,
  formData: FormData
): Promise<ParentLinkActionState> {
  try {
    const session = await requirePermission("PARENT_CHILD_MANAGE_LINKS");

    const playerId = formData.get("playerId") as string;
    const slot = parseInt(formData.get("slot") as string, 10);
    const relationship = (formData.get("relationship") as string) || "";
    const mode = (formData.get("mode") as "EXISTING" | "NEW") || "EXISTING";

    if (!playerId) {
      return { success: false, error: "Player ID is required." };
    }
    if (isNaN(slot) || slot < 1 || slot > 2) {
      return { success: false, error: "Parent slot must be 1 or 2." };
    }

    let parentId = formData.get("parentId") as string;

    // Handle "NEW" parent created inline
    if (mode === "NEW") {
      const firstName = (formData.get("firstName") as string) || "";
      const lastName = (formData.get("lastName") as string) || "";
      const email = (formData.get("email") as string) || "";
      const phone = (formData.get("phone") as string) || "";

      if (!firstName.trim() || !lastName.trim()) {
        return { success: false, error: "Parent's first and last name are required." };
      }

      const cleanEmail = email.trim().toLowerCase() || null;
      if (cleanEmail) {
        const existingProfile = await prisma.memberProfile.findUnique({
          where: { email: cleanEmail },
        });
        if (existingProfile) {
          return {
            success: false,
            error: `A member profile with email '${cleanEmail}' already exists. Please select them as an existing member.`,
          };
        }
      }

      // Create new Parent profile
      const newParent = await prisma.memberProfile.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: cleanEmail,
          phone: phone.trim() || null,
          roleAssignments: {
            create: {
              role: Role.PARENT,
              assignedById: session.memberProfileId,
            },
          },
        },
      });

      parentId = newParent.id;
    }

    if (!parentId) {
      return { success: false, error: "Parent profile must be selected or created." };
    }

    await addParentChildLink({
      actorProfileId: session.memberProfileId,
      playerId,
      parentId,
      slot,
      relationship,
    });

    revalidatePath("/admin/members");
    revalidatePath(`/admin/members/${playerId}/links`);

    return { success: true };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to add parent link.";
    return { success: false, error: errorMsg };
  }
}

export async function removeParentLinkAction(
  linkId: string,
  playerId: string
): Promise<ParentLinkActionState> {
  try {
    const session = await requirePermission("PARENT_CHILD_MANAGE_LINKS");

    await removeParentChildLink({
      actorProfileId: session.memberProfileId,
      linkId,
    });

    revalidatePath("/admin/members");
    revalidatePath(`/admin/members/${playerId}/links`);

    return { success: true };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to remove parent link.";
    return { success: false, error: errorMsg };
  }
}
