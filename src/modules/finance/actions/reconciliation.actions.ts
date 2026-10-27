"use server";

import { revalidatePath } from "next/cache";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { Role } from "@prisma/client";
import {
  verifyPaymentTransactionSchema,
  recordPartialPaymentSchema,
  waiveInvoiceSchema,
  sendOverdueReminderSchema,
  batchSendOverdueRemindersSchema,
} from "../contracts/reconciliation.contract";
import {
  verifyPaymentTransaction,
  recordPartialPayment,
  waiveInvoice,
  sendOverdueReminder,
  batchSendOverdueReminders,
} from "../services/reconciliation.service";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function requireAdmin() {
  const session = await requireActivatedSession();
  if (!session.roles.includes(Role.ADMIN)) {
    throw new Error("Unauthorized: Only Club Administrators/Treasurers can perform this action.");
  }
  return session;
}

/**
 * Server Action: Verify or reject a member-reported payment transaction.
 */
export async function verifyPaymentTransactionAction(
  formData: unknown
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const parsed = verifyPaymentTransactionSchema.safeParse(formData);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const effectiveProfileId = session.activeProfileId || session.memberProfileId;
    const result = await verifyPaymentTransaction(parsed.data, effectiveProfileId);

    revalidatePath("/admin/finance");
    revalidatePath("/admin/finance/reconciliation");
    revalidatePath("/billing");

    return { success: true, data: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to verify transaction.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Directly record a partial or verified pitchside payment.
 */
export async function recordPartialPaymentAction(
  formData: unknown
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const parsed = recordPartialPaymentSchema.safeParse(formData);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const effectiveProfileId = session.activeProfileId || session.memberProfileId;
    const result = await recordPartialPayment(parsed.data, effectiveProfileId);

    revalidatePath("/admin/finance");
    revalidatePath("/admin/finance/reconciliation");
    revalidatePath("/billing");

    return { success: true, data: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record payment.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Waive an invoice with mandatory justification notes.
 */
export async function waiveInvoiceAction(
  formData: unknown
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();
    const parsed = waiveInvoiceSchema.safeParse(formData);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const effectiveProfileId = session.activeProfileId || session.memberProfileId;
    const result = await waiveInvoice(parsed.data, effectiveProfileId);

    revalidatePath("/admin/finance");
    revalidatePath("/admin/finance/reconciliation");
    revalidatePath("/billing");

    return { success: true, data: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to waive invoice.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Send an individual overdue payment reminder.
 */
export async function sendOverdueReminderAction(
  formData: unknown
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = sendOverdueReminderSchema.safeParse(formData);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const result = await sendOverdueReminder(parsed.data.invoiceId);
    revalidatePath("/admin/finance");
    revalidatePath("/admin/finance/reconciliation");

    return { success: true, data: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send reminder.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Batch send overdue payment reminders.
 */
export async function batchSendOverdueRemindersAction(
  formData: unknown
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = batchSendOverdueRemindersSchema.safeParse(formData);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        success: false,
        error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Validation failed.",
      };
    }

    const result = await batchSendOverdueReminders(parsed.data);
    revalidatePath("/admin/finance");
    revalidatePath("/admin/finance/reconciliation");

    return { success: true, data: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to batch send reminders.";
    return { success: false, error: msg };
  }
}
