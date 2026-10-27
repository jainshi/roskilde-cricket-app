"use server";

import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { Role } from "@prisma/client";
import { exportBogfoeringslovenLedgerSchema } from "../contracts/ledger.contract";
import { exportBogfoeringslovenCsv } from "../services/bogfoeringsloven.service";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action: Exports statutory Bogføringsloven CSV for a fiscal year.
 * Restricted to Club Administrators and Treasurers.
 */
export async function exportBogfoeringslovenLedgerAction(
  formData: unknown
): Promise<ActionResult<{ csvContent: string; filename: string; rowCount: number }>> {
  try {
    const session = await requireActivatedSession();
    if (!session.roles.includes(Role.ADMIN)) {
      return {
        success: false,
        error: "Unauthorized: Only Club Administrators/Treasurers can export accounting records.",
      };
    }

    const parsed = exportBogfoeringslovenLedgerSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const result = await exportBogfoeringslovenCsv(parsed.data);
    return { success: true, data: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate Bogføringsloven CSV.";
    return { success: false, error: msg };
  }
}
