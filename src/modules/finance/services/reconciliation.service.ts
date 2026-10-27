import { prisma } from "@/lib/db";
import {
  InvoiceStatus,
  TransactionStatus,
  PaymentMethod,
  SubscriptionStatus,
} from "@prisma/client";
import {
  VerifyPaymentTransactionInput,
  RecordPartialPaymentInput,
  WaiveInvoiceInput,
  BatchSendOverdueRemindersInput,
} from "../contracts/reconciliation.contract";
import { formatDanishKroner } from "../domain/money-oere";
import { notificationService } from "@/modules/auth-rbac/notifications/notification.service";

/**
 * Service: Retrieves reconciliation queue of reported and unverified payments,
 * plus all overdue invoices requiring administrative action.
 */
export async function getReconciliationQueue() {
  const [pendingTransactions, overdueInvoices, recentVerifiedTransactions] =
    await Promise.all([
      prisma.paymentTransaction.findMany({
        where: {
          status: TransactionStatus.REPORTED,
        },
        include: {
          invoice: {
            include: {
              memberProfile: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
              billedToProfile: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
          reportedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { reportedAt: "desc" },
      }),

      prisma.invoice.findMany({
        where: {
          status: {
            in: [InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE],
          },
          dueDate: {
            lt: new Date(),
          },
        },
        include: {
          memberProfile: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          billedToProfile: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { dueDate: "asc" },
      }),

      prisma.paymentTransaction.findMany({
        where: {
          status: { in: [TransactionStatus.VERIFIED, TransactionStatus.REJECTED] },
        },
        include: {
          invoice: {
            include: {
              memberProfile: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
          verifiedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { verifiedAt: "desc" },
        take: 20,
      }),
    ]);

  return {
    pendingTransactions,
    overdueInvoices,
    recentVerifiedTransactions,
  };
}

/**
 * Service: Verify or reject a member-reported payment transaction.
 */
export async function verifyPaymentTransaction(
  input: VerifyPaymentTransactionInput,
  verifiedByProfileId: string
) {
  const { transactionId, action, rejectionReason } = input;

  const transaction = await prisma.paymentTransaction.findUnique({
    where: { id: transactionId },
    include: {
      invoice: {
        include: {
          subscription: true,
          transactions: true,
          billedToProfile: true,
          memberProfile: true,
        },
      },
      reportedBy: true,
    },
  });

  if (!transaction) {
    throw new Error(`Payment transaction not found: ${transactionId}`);
  }

  const invoice = transaction.invoice;

  if (action === "VERIFY") {
    // 1. Mark transaction as verified
    await prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.VERIFIED,
        verifiedById: verifiedByProfileId,
        verifiedAt: new Date(),
      },
    });

    // 2. Compute total verified payments for this invoice
    const allVerified = await prisma.paymentTransaction.findMany({
      where: {
        invoiceId: invoice.id,
        status: TransactionStatus.VERIFIED,
      },
    });

    const totalPaidOere = allVerified.reduce((sum, t) => sum + t.amountOere, 0);
    const isFullyPaid = totalPaidOere >= invoice.totalOere;

    // 3. Update invoice
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidOere: totalPaidOere,
        status: isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
        paidAt: isFullyPaid ? new Date() : invoice.paidAt,
      },
    });

    // 4. If subscription exists and is fully paid, activate it
    if (invoice.subscriptionId && isFullyPaid) {
      await prisma.memberSubscription.update({
        where: { id: invoice.subscriptionId },
        data: { status: SubscriptionStatus.ACTIVE },
      });
    }

    // 5. Notify debtor
    try {
      if (invoice.billedToProfile.email) {
        await notificationService.sendEmail({
          to: invoice.billedToProfile.email,
          subject: `[RCC Receipt] Payment Verified: ${invoice.invoiceNumber}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
              <h2 style="color: #059669;">Payment Verified</h2>
              <p>Hello ${invoice.billedToProfile.firstName},</p>
              <p>Your payment of <strong>${formatDanishKroner(transaction.amountOere)}</strong> for invoice <strong>${invoice.invoiceNumber}</strong> has been verified by the club treasurer.</p>
              <p><strong>Status:</strong> ${isFullyPaid ? "Fully Settled" : "Partially Paid"}</p>
              <p>Thank you for supporting Roskilde Cricket Club!</p>
            </div>
          `,
        });
      }
    } catch (err) {
      console.error("Failed to send payment verified email:", err);
    }

    return {
      success: true,
      action: "VERIFIED",
      totalPaidOere,
      invoiceStatus: isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
    };
  } else {
    // REJECT action
    await prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.REJECTED,
        verifiedById: verifiedByProfileId,
        verifiedAt: new Date(),
        notes: rejectionReason || "Payment could not be verified by Treasurer",
      },
    });

    // Check remaining verified transactions
    const remainingVerified = await prisma.paymentTransaction.findMany({
      where: {
        invoiceId: invoice.id,
        status: TransactionStatus.VERIFIED,
      },
    });
    const verifiedPaid = remainingVerified.reduce((sum, t) => sum + t.amountOere, 0);

    let nextStatus: InvoiceStatus;
    if (verifiedPaid > 0) {
      nextStatus = InvoiceStatus.PARTIALLY_PAID;
    } else {
      const isPastDue = new Date() > new Date(invoice.dueDate);
      nextStatus = isPastDue ? InvoiceStatus.OVERDUE : InvoiceStatus.OPEN;
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidOere: verifiedPaid,
        status: nextStatus,
      },
    });

    // Notify debtor of rejection
    try {
      if (invoice.billedToProfile.email) {
        await notificationService.sendEmail({
          to: invoice.billedToProfile.email,
          subject: `[RCC Notice] Payment Verification Update: ${invoice.invoiceNumber}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
              <h2 style="color: #e11d48;">Payment Could Not Be Verified</h2>
              <p>Hello ${invoice.billedToProfile.firstName},</p>
              <p>Your reported payment of <strong>${formatDanishKroner(transaction.amountOere)}</strong> for invoice <strong>${invoice.invoiceNumber}</strong> could not be matched by our Treasurer.</p>
              <p><strong>Reason:</strong> ${rejectionReason || "Transaction reference could not be matched on the club bank account."}</p>
              <p>Please double check the payment reference (<strong>${invoice.paymentReference}</strong>) or contact the club treasurer.</p>
            </div>
          `,
        });
      }
    } catch (err) {
      console.error("Failed to send rejection email:", err);
    }

    return {
      success: true,
      action: "REJECTED",
      invoiceStatus: nextStatus,
    };
  }
}

/**
 * Service: Directly record a partial or pitchside payment (Cash, Bank, MobilePay).
 */
export async function recordPartialPayment(
  input: RecordPartialPaymentInput,
  recordedByProfileId: string
) {
  const { invoiceId, amountOere, paymentMethod, transactionReference, settlementDate, notes } =
    input;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { subscription: true },
  });

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  if (invoice.status === InvoiceStatus.PAID) {
    throw new Error("This invoice is already settled.");
  }

  const effectiveSettlement = settlementDate || new Date();

  // Create verified transaction directly
  const transaction = await prisma.paymentTransaction.create({
    data: {
      invoiceId: invoice.id,
      reportedById: recordedByProfileId,
      verifiedById: recordedByProfileId,
      amountOere,
      paymentMethod,
      status: TransactionStatus.VERIFIED,
      transactionReference: transactionReference || null,
      settlementDate: effectiveSettlement,
      verifiedAt: new Date(),
      notes: notes || null,
    },
  });

  const allVerified = await prisma.paymentTransaction.findMany({
    where: {
      invoiceId: invoice.id,
      status: TransactionStatus.VERIFIED,
    },
  });

  const totalPaidOere = allVerified.reduce((sum, t) => sum + t.amountOere, 0);
  const isFullyPaid = totalPaidOere >= invoice.totalOere;

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      paidOere: totalPaidOere,
      status: isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
      paidAt: isFullyPaid ? new Date() : invoice.paidAt,
    },
  });

  if (invoice.subscriptionId && isFullyPaid) {
    await prisma.memberSubscription.update({
      where: { id: invoice.subscriptionId },
      data: { status: SubscriptionStatus.ACTIVE },
    });
  }

  return {
    transaction,
    totalPaidOere,
    invoiceStatus: isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
  };
}

/**
 * Service: Waive an invoice with mandatory audit note.
 */
export async function waiveInvoice(input: WaiveInvoiceInput, waivedByProfileId: string) {
  const { invoiceId, reason } = input;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { subscription: true },
  });

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  if (invoice.status === InvoiceStatus.PAID) {
    throw new Error("Cannot waive an invoice that has already been paid.");
  }

  const remainingOere = Math.max(0, invoice.totalOere - invoice.paidOere);

  // Create waiver transaction
  await prisma.paymentTransaction.create({
    data: {
      invoiceId: invoice.id,
      reportedById: waivedByProfileId,
      verifiedById: waivedByProfileId,
      amountOere: remainingOere,
      paymentMethod: PaymentMethod.WAIVER_CREDIT,
      status: TransactionStatus.VERIFIED,
      transactionReference: "FEE_WAIVER",
      settlementDate: new Date(),
      verifiedAt: new Date(),
      notes: `Fee Waived by Administrator. Reason: ${reason}`,
    },
  });

  // Mark invoice waived
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: InvoiceStatus.WAIVED,
      notes: reason,
    },
  });

  if (invoice.subscriptionId) {
    await prisma.memberSubscription.update({
      where: { id: invoice.subscriptionId },
      data: { status: SubscriptionStatus.ACTIVE },
    });
  }

  return { success: true, waivedOere: remainingOere };
}

/**
 * Service: Send manual overdue payment reminder for an invoice.
 */
export async function sendOverdueReminder(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      billedToProfile: true,
      memberProfile: true,
    },
  });

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  const remainingOere = Math.max(0, invoice.totalOere - invoice.paidOere);

  if (remainingOere <= 0 || invoice.status === InvoiceStatus.PAID) {
    throw new Error("Cannot send reminder for an invoice with no remaining balance.");
  }

  // Update invoice reminder stats
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      lastReminderSentAt: new Date(),
      reminderCount: invoice.reminderCount + 1,
      status: InvoiceStatus.OVERDUE,
    },
  });

  // Dispatch reminder email
  if (invoice.billedToProfile.email) {
    await notificationService.sendEmail({
      to: invoice.billedToProfile.email,
      subject: `[RCC Payment Reminder] Overdue Fee: ${invoice.invoiceNumber} (${formatDanishKroner(remainingOere)})`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <h2 style="color: #f59e0b;">Friendly Payment Reminder</h2>
          <p>Hello ${invoice.billedToProfile.firstName},</p>
          <p>This is a reminder that invoice <strong>${invoice.invoiceNumber}</strong> for <strong>${invoice.memberProfile.firstName} ${invoice.memberProfile.lastName}</strong> has an outstanding balance of <strong>${formatDanishKroner(remainingOere)}</strong>.</p>
          <p><strong>Original Due Date:</strong> ${invoice.dueDate.toLocaleDateString("da-DK")}</p>
          <p>Please settle the payment using MobilePay or Bank Transfer with reference: <strong>${invoice.paymentReference}</strong>.</p>
          <p style="margin-top: 24px; font-size: 12px; color: #64748b;">Roskilde Cricket Club</p>
        </div>
      `,
    });
  }

  return { success: true, reminderCount: invoice.reminderCount + 1 };
}

/**
 * Service: Batch send overdue reminders for all qualifying overdue invoices.
 */
export async function batchSendOverdueReminders(input: BatchSendOverdueRemindersInput) {
  const { invoiceIds, minDaysOverdue } = input;

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - (minDaysOverdue || 1));

  const whereClause: any = {
    status: {
      in: [InvoiceStatus.OPEN, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE],
    },
    dueDate: {
      lt: thresholdDate,
    },
  };

  if (invoiceIds && invoiceIds.length > 0) {
    whereClause.id = { in: invoiceIds };
  }

  const eligibleInvoices = await prisma.invoice.findMany({
    where: whereClause,
    include: {
      billedToProfile: true,
      memberProfile: true,
    },
  });

  let sentCount = 0;
  for (const inv of eligibleInvoices) {
    try {
      await sendOverdueReminder(inv.id);
      sentCount++;
    } catch (err) {
      console.error(`Failed to send reminder for ${inv.id}:`, err);
    }
  }

  return { success: true, sentCount, totalEligible: eligibleInvoices.length };
}
