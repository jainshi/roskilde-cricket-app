"use server";

import { revalidatePath } from "next/cache";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { reportInvoicePaymentSchema } from "../contracts/payment.contract";
import { reportInvoicePayment } from "../services/payment.service";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action: Member or Parent self-reports payment on an invoice.
 * Accessible to any authenticated member/parent.
 */
export async function reportInvoicePaymentAction(
  formData: unknown
): Promise<ActionResult> {
  try {
    const session = await requireActivatedSession();
    const parsed = reportInvoicePaymentSchema.safeParse(formData);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const effectiveProfileId = session.activeProfileId || session.memberProfileId;
    const result = await reportInvoicePayment(parsed.data, effectiveProfileId);

    revalidatePath("/billing");
    revalidatePath(`/billing/${result.invoiceId}`);
    revalidatePath("/admin/finance");
    revalidatePath("/admin/finance/reconciliation");

    return { success: true, data: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to report payment.";
    return { success: false, error: msg };
  }
}
