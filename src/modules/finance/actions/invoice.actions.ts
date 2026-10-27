"use server";

import { revalidatePath } from "next/cache";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { Role } from "@prisma/client";
import {
  generateSeasonalInvoicesSchema,
  createAdHocInvoiceSchema,
} from "../contracts/invoice.contract";
import {
  generateSeasonalInvoices,
  createAdHocInvoice,
} from "../services/invoice.service";
import { ActionResult } from "./plan.actions";

/**
 * Server Action: Batch-generates seasonal invoices for active subscriptions.
 * Authorized for: Admin only.
 */
export async function generateSeasonalInvoicesAction(
  formData: unknown
): Promise<ActionResult<{ count: number }>> {
  try {
    const session = await requireActivatedSession();
    if (!session.roles.includes(Role.ADMIN)) {
      return {
        success: false,
        error: "Unauthorized: Only Club Administrators/Treasurers can generate seasonal batch invoices.",
      };
    }

    const parsed = generateSeasonalInvoicesSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const result = await generateSeasonalInvoices(parsed.data, session.memberProfileId);
    revalidatePath("/admin/finance");
    revalidatePath("/billing");
    return { success: true, data: { count: result.count } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate seasonal invoices.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Creates an ad-hoc fee invoice (Module 2 equipment charge or Module 3 event fee).
 * Authorized for: Admin only.
 */
export async function createAdHocInvoiceAction(
  formData: unknown
): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();
    if (!session.roles.includes(Role.ADMIN)) {
      return {
        success: false,
        error: "Unauthorized: Only Club Administrators/Treasurers can issue ad-hoc invoices.",
      };
    }

    const parsed = createAdHocInvoiceSchema.safeParse(formData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const invoice = await createAdHocInvoice(parsed.data, session.memberProfileId);
    revalidatePath("/admin/finance");
    revalidatePath("/billing");
    return { success: true, data: invoice };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create ad-hoc invoice.";
    return { success: false, error: msg };
  }
}
