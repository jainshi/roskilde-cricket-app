import { prisma } from "@/lib/db";
import { InvoiceCategory, TransactionStatus } from "@prisma/client";
import { ExportBogfoeringslovenLedgerInput } from "../contracts/ledger.contract";
import {
  generateBogfoeringslovenCsv,
  LedgerExportRow,
  getBogfoeringslovenRetentionExpiry,
  isWithinBogfoeringslovenRetention,
} from "../domain/bogfoeringsloven-export";

export interface LedgerLedgerSummary {
  fiscalYear: number;
  retentionExpiry: Date;
  isWithinRetention: boolean;
  totalInvoices: number;
  totalSettledOere: number;
  totalOutstandingOere: number;
  rows: LedgerExportRow[];
}

/**
 * Service: Retrieves accounting ledger records for a fiscal year under the Danish Bookkeeping Act (Bogføringsloven § 10).
 */
export async function getBogfoeringslovenLedger(
  fiscalYear: number = new Date().getFullYear(),
  categoryFilter?: string,
  includeUnpaid: boolean = true
): Promise<LedgerLedgerSummary> {
  const startOfYear = new Date(Date.UTC(fiscalYear, 0, 1, 0, 0, 0, 0));
  const endOfYear = new Date(Date.UTC(fiscalYear, 11, 31, 23, 59, 59, 999));

  const whereClause: any = {
    issueDate: {
      gte: startOfYear,
      lte: endOfYear,
    },
  };

  if (categoryFilter && categoryFilter !== "ALL") {
    whereClause.category = categoryFilter as InvoiceCategory;
  }

  if (!includeUnpaid) {
    whereClause.status = "PAID";
  }

  const invoices = await prisma.invoice.findMany({
    where: whereClause,
    include: {
      memberProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          isAnonymized: true,
        },
      },
      lineItems: true,
      transactions: {
        where: { status: TransactionStatus.VERIFIED },
        orderBy: { settlementDate: "desc" },
      },
    },
    orderBy: { invoiceNumber: "asc" },
  });

  let totalSettledOere = 0;
  let totalOutstandingOere = 0;

  const rows: LedgerExportRow[] = invoices.map((inv) => {
    totalSettledOere += inv.paidOere;
    const remaining = Math.max(0, inv.totalOere - inv.paidOere);
    if (inv.status !== "PAID" && inv.status !== "WAIVED" && inv.status !== "CANCELLED") {
      totalOutstandingOere += remaining;
    }

    const latestTx = inv.transactions[0];
    const description =
      inv.lineItems.length > 0
        ? inv.lineItems.map((li) => li.description).join(" + ")
        : "Club Fee";

    const memberName = inv.memberProfile.isAnonymized
      ? `Former Member #${inv.memberProfile.id.slice(0, 8)}`
      : `${inv.memberProfile.firstName} ${inv.memberProfile.lastName}`;

    return {
      invoiceNumber: inv.invoiceNumber,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      paidDate: inv.paidAt || (latestTx ? latestTx.settlementDate : null),
      memberId: inv.memberProfile.id,
      memberName,
      category: inv.category,
      description,
      amountOere: inv.totalOere,
      paymentMethod: latestTx ? latestTx.paymentMethod : null,
      status: inv.status,
      transactionReference: latestTx ? latestTx.transactionReference : null,
    };
  });

  const retentionExpiry = getBogfoeringslovenRetentionExpiry(fiscalYear);
  const isWithinRetention = isWithinBogfoeringslovenRetention(startOfYear);

  return {
    fiscalYear,
    retentionExpiry,
    isWithinRetention,
    totalInvoices: rows.length,
    totalSettledOere,
    totalOutstandingOere,
    rows,
  };
}

/**
 * Service: Generates a UTF-8 BOM CSV export for Danish bookkeeping compliance.
 */
export async function exportBogfoeringslovenCsv(
  input: ExportBogfoeringslovenLedgerInput
): Promise<{ csvContent: string; filename: string; rowCount: number }> {
  const { fiscalYear, category, includeUnpaid, delimiter } = input;
  const summary = await getBogfoeringslovenLedger(fiscalYear, category, includeUnpaid);

  const csvContent = generateBogfoeringslovenCsv(summary.rows, {
    delimiter,
    includeBom: true,
  });

  const filename = `RCC-Bogfoeringsloven-Ledger-${fiscalYear}.csv`;

  return {
    csvContent,
    filename,
    rowCount: summary.rows.length,
  };
}
