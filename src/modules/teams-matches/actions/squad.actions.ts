"use server";

import { revalidatePath } from "next/cache";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import {
  createSquadSchema,
  updateSquadSchema,
  assignRosterMemberSchema,
  removeRosterMemberSchema,
  assignSquadCoachSchema,
  removeSquadCoachSchema,
} from "../contracts/squad.contract";
import {
  createSquad,
  updateSquad,
  assignRosterMember,
  removeRosterMember,
  assignSquadCoach,
  removeSquadCoach,
} from "../services/squad.service";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Helper: Check if caller is Admin or Coach
 */
function isStaff(roles: string[]): boolean {
  return roles.includes("ADMIN") || roles.includes("COACH");
}

/**
 * Server Action: Create a new club squad (Admin / Coach only).
 */
export async function createSquadAction(formData: unknown): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!isStaff(session.roles)) {
      return { success: false, error: "Unauthorized: Only Admins and Coaches can create squads." };
    }

    const parsed = createSquadSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const squad = await createSquad(parsed.data);
    revalidatePath("/teams");
    return { success: true, data: squad };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create squad.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Update squad settings (Admin / Coach only).
 */
export async function updateSquadAction(formData: unknown): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!isStaff(session.roles)) {
      return { success: false, error: "Unauthorized: Only Admins and Coaches can update squads." };
    }

    const parsed = updateSquadSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const squad = await updateSquad(parsed.data);
    revalidatePath("/teams");
    revalidatePath(`/teams/${parsed.data.id}`);
    return { success: true, data: squad };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update squad.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Assign a player to a squad roster with automated age verification.
 */
export async function assignRosterMemberAction(formData: unknown): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!isStaff(session.roles)) {
      return { success: false, error: "Unauthorized: Only Admins and Coaches can modify squad rosters." };
    }

    const parsed = assignRosterMemberSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const result = await assignRosterMember(parsed.data);
    revalidatePath("/teams");
    revalidatePath(`/teams/${parsed.data.teamSquadId}`);
    revalidatePath(`/teams/${parsed.data.teamSquadId}/roster`);
    return { success: true, data: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to assign roster member.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Remove a player from a squad roster.
 */
export async function removeRosterMemberAction(formData: unknown): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!isStaff(session.roles)) {
      return { success: false, error: "Unauthorized: Only Admins and Coaches can modify squad rosters." };
    }

    const parsed = removeRosterMemberSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: "Invalid request parameters." };
    }

    await removeRosterMember(parsed.data.teamSquadId, parsed.data.memberProfileId);
    revalidatePath("/teams");
    revalidatePath(`/teams/${parsed.data.teamSquadId}`);
    revalidatePath(`/teams/${parsed.data.teamSquadId}/roster`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to remove roster member.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Assign a coach to a squad.
 */
export async function assignSquadCoachAction(formData: unknown): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!session.roles.includes("ADMIN")) {
      return { success: false, error: "Unauthorized: Only Club Admins can assign coaching staff." };
    }

    const parsed = assignSquadCoachSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const assignment = await assignSquadCoach(parsed.data);
    revalidatePath("/teams");
    revalidatePath(`/teams/${parsed.data.teamSquadId}`);
    return { success: true, data: assignment };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to assign coach.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Remove a coach from a squad.
 */
export async function removeSquadCoachAction(formData: unknown): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!session.roles.includes("ADMIN")) {
      return { success: false, error: "Unauthorized: Only Club Admins can remove coaching staff." };
    }

    const parsed = removeSquadCoachSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: "Invalid request parameters." };
    }

    await removeSquadCoach(parsed.data.teamSquadId, parsed.data.coachProfileId);
    revalidatePath("/teams");
    revalidatePath(`/teams/${parsed.data.teamSquadId}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to remove coach.";
    return { success: false, error: msg };
  }
}
