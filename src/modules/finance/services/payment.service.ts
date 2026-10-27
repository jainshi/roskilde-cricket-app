import { prisma } from "@/lib/db";
import {
  InvoiceStatus,
  TransactionStatus,
  PaymentMethod,
  Role,
} from "@prisma/client";
import { ReportInvoicePaymentInput } from "../contracts/payment.contract";
import { canTransitionInvoiceStatus } from "../domain/invoice-lifecycle";
import { formatDanishKroner } from "../domain/money-oere";
import { notificationService } from "@/modules/auth-rbac/notifications/notification.service";

export interface PaymentReceiptData {
  transactionId: string;
  invoiceId: string;
  invoiceNumber: string;
  amountOere: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  settlementDate: Date;
  reportedAt: Date;
  transactionReference?: string | null;
  beneficiaryName: string;
  debtorName: string;
}

/**
 * Service: Self-report a payment on an invoice (MobilePay, Bank Transfer, or Cash).
 * Creates a REPORTED PaymentTransaction and transitions invoice to PENDING_VERIFICATION.
 */
export async function reportInvoicePayment(
  input: ReportInvoicePaymentInput,
  reportedByProfileId: string
): Promise<PaymentReceiptData> {
  const {
    invoiceId,
    amountOere,
    paymentMethod,
    transactionReference,
    settlementDate,
    notes,
  } = input;

  const invoice = await prisma.invoice.findFirst({
    where: {
      OR: [{ id: invoiceId }, { invoiceNumber: invoiceId }],
    },
    include: {
      memberProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      billedToProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new Error(`Invoice not found for reference: ${invoiceId}`);
  }

  if (invoice.status === InvoiceStatus.PAID) {
    throw new Error("This invoice is already fully paid and settled.");
  }
  if (invoice.status === InvoiceStatus.CANCELLED || invoice.status === InvoiceStatus.WAIVED) {
    throw new Error(`Cannot record payment on a ${invoice.status.toLowerCase()} invoice.`);
  }

  const effectiveSettlementDate = settlementDate || new Date();

  // Create reported payment transaction
  const transaction = await prisma.paymentTransaction.create({
    data: {
      invoiceId: invoice.id,
      reportedById: reportedByProfileId,
      amountOere,
      paymentMethod,
      status: TransactionStatus.REPORTED,
      transactionReference: transactionReference?.trim() || null,
      settlementDate: effectiveSettlementDate,
      notes: notes?.trim() || null,
    },
  });

  // If valid, transition invoice to PENDING_VERIFICATION
  if (canTransitionInvoiceStatus(invoice.status, InvoiceStatus.PENDING_VERIFICATION)) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: InvoiceStatus.PENDING_VERIFICATION },
    });
  }

  // Notify Treasurers/Admins of reported payment
  try {
    const adminProfiles = await prisma.memberProfile.findMany({
      where: {
        roleAssignments: {
          some: {
            role: Role.ADMIN,
          },
        },
      },
      select: { email: true, firstName: true },
    });

    for (const admin of adminProfiles) {
      if (admin.email) {
        await notificationService.sendEmail({
          to: admin.email,
          subject: `[RCC Finance] Payment Reported: ${invoice.invoiceNumber} (${formatDanishKroner(amountOere)})`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
              <h2 style="color: #0284c7;">Payment Self-Reported</h2>
              <p>Hello ${admin.firstName},</p>
              <p>A member has reported a payment of <strong>${formatDanishKroner(amountOere)}</strong> for invoice <strong>${invoice.invoiceNumber}</strong> via <strong>${paymentMethod}</strong>.</p>
              <p><strong>Reference / Note:</strong> ${transactionReference || "None provided"}</p>
              <p>Please review and verify this transaction in the Treasurer Reconciliation Queue.</p>
              <p style="margin-top: 24px; font-size: 12px; color: #64748b;">Roskilde Cricket Club Finance System</p>
            </div>
          `,
        });
      }
    }
  } catch (err) {
    console.error("Failed to notify admins of reported payment:", err);
  }

  return {
    transactionId: transaction.id,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    amountOere: transaction.amountOere,
    paymentMethod: transaction.paymentMethod,
    status: transaction.status,
    settlementDate: transaction.settlementDate,
    reportedAt: transaction.reportedAt,
    transactionReference: transaction.transactionReference,
    beneficiaryName: `${invoice.memberProfile.firstName} ${invoice.memberProfile.lastName}`,
    debtorName: `${invoice.billedToProfile.firstName} ${invoice.billedToProfile.lastName}`,
  };
}
