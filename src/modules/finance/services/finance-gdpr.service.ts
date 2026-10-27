import { prisma } from "@/lib/db";
import { InvoiceStatus } from "@prisma/client";

export interface OpenInvoiceItem {
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  totalOere: number;
  paidOere: number;
  remainingOere: number;
  beneficiaryName: string;
  isLinkedChild: boolean;
}

export interface OpenInvoicesCheckResult {
  hasOpenInvoices: boolean;
  openInvoiceCount: number;
  totalOutstandingOere: number;
  invoices: OpenInvoiceItem[];
  blockingReason?: string;
}

/**
 * Evaluates whether a member profile (or any of their linked minor children)
 * currently holds unpaid club dues or open invoices under Danish Bookkeeping Act
 * (Bogføringsloven § 10) and GDPR Article 17(3)(b) legal obligation exemption.
 *
 * Open statuses: OPEN, PENDING_VERIFICATION, PARTIALLY_PAID, OVERDUE.
 */
export async function hasOpenInvoicesOrBalances(
  targetProfileId: string
): Promise<OpenInvoicesCheckResult> {
  // 1. Direct invoices on target member (either as beneficiary or debtor)
  const directInvoices = await prisma.invoice.findMany({
    where: {
      OR: [
        { memberProfileId: targetProfileId },
        { billedToProfileId: targetProfileId },
      ],
      status: {
        in: [
          InvoiceStatus.OPEN,
          InvoiceStatus.PENDING_VERIFICATION,
          InvoiceStatus.PARTIALLY_PAID,
          InvoiceStatus.OVERDUE,
        ],
      },
    },
    include: {
      memberProfile: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  // 2. Invoices on linked minor children (if target member is a parent)
  const childLinks = await prisma.parentChildLink.findMany({
    where: { parentId: targetProfileId },
    select: { playerId: true },
  });

  const childPlayerIds = childLinks.map((cl) => cl.playerId);

  const childInvoices =
    childPlayerIds.length > 0
      ? await prisma.invoice.findMany({
          where: {
            OR: [
              { memberProfileId: { in: childPlayerIds } },
              { billedToProfileId: { in: childPlayerIds } },
            ],
            status: {
              in: [
                InvoiceStatus.OPEN,
                InvoiceStatus.PENDING_VERIFICATION,
                InvoiceStatus.PARTIALLY_PAID,
                InvoiceStatus.OVERDUE,
              ],
            },
          },
          include: {
            memberProfile: {
              select: { firstName: true, lastName: true },
            },
          },
        })
      : [];

  const seenIds = new Set<string>();
  const items: OpenInvoiceItem[] = [];

  for (const inv of directInvoices) {
    if (!seenIds.has(inv.id)) {
      seenIds.add(inv.id);
      items.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        totalOere: inv.totalOere,
        paidOere: inv.paidOere,
        remainingOere: Math.max(0, inv.totalOere - inv.paidOere),
        beneficiaryName: `${inv.memberProfile.firstName} ${inv.memberProfile.lastName}`.trim(),
        isLinkedChild: false,
      });
    }
  }

  for (const inv of childInvoices) {
    if (!seenIds.has(inv.id)) {
      seenIds.add(inv.id);
      items.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        totalOere: inv.totalOere,
        paidOere: inv.paidOere,
        remainingOere: Math.max(0, inv.totalOere - inv.paidOere),
        beneficiaryName: `${inv.memberProfile.firstName} ${inv.memberProfile.lastName}`.trim(),
        isLinkedChild: true,
      });
    }
  }

  const openInvoiceCount = items.length;
  const totalOutstandingOere = items.reduce((sum, item) => sum + item.remainingOere, 0);

  if (openInvoiceCount > 0) {
    const invoiceSummaries = items
      .map((i) => `${i.invoiceNumber} (${i.isLinkedChild ? `linked youth ${i.beneficiaryName}` : "direct"}, ${(i.remainingOere / 100).toFixed(2)} DKK)`)
      .join(", ");

    return {
      hasOpenInvoices: true,
      openInvoiceCount,
      totalOutstandingOere,
      invoices: items,
      blockingReason: `Member cannot be erased or anonymized: ${openInvoiceCount} unpaid club invoice(s) exist (${invoiceSummaries}). Outstanding dues must be settled or waived prior to account erasure under Danish Bookkeeping Act (Bogføringsloven § 10) and GDPR Article 17(3)(b).`,
    };
  }

  return {
    hasOpenInvoices: false,
    openInvoiceCount: 0,
    totalOutstandingOere: 0,
    invoices: [],
  };
}
