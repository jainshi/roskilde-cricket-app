import { InvoiceStatus } from "@prisma/client";

/**
 * Generates deterministic, human-readable invoice numbers and payment reference codes.
 * Format: RCC-INV-YYYY-#### (e.g., RCC-INV-2026-0042)
 *
 * @param year - 4-digit calendar year
 * @param sequence - 1-based sequential number for that year
 */
export function formatInvoiceNumber(year: number, sequence: number): string {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new RangeError(`Invalid invoice year: ${year}`);
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError(`Invoice sequence must be a positive integer, received: ${sequence}`);
  }
  const paddedSequence = sequence.toString().padStart(4, "0");
  return `RCC-INV-${year}-${paddedSequence}`;
}

/**
 * Validates and parses an RCC invoice reference string.
 */
export function parseInvoiceNumber(
  invoiceNumber: string
): { year: number; sequence: number } | null {
  const match = /^RCC-INV-(\d{4})-(\d{4,})$/.exec(invoiceNumber.trim());
  if (!match) {
    return null;
  }
  return {
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10),
  };
}

/**
 * Allowed invoice lifecycle status transitions:
 *
 * DRAFT -> OPEN | CANCELLED
 * OPEN -> PENDING_VERIFICATION | PARTIALLY_PAID | PAID | OVERDUE | WAIVED | CANCELLED
 * PENDING_VERIFICATION -> PAID | PARTIALLY_PAID | OPEN (if rejected)
 * PARTIALLY_PAID -> PENDING_VERIFICATION | PAID | OVERDUE | WAIVED | CANCELLED
 * OVERDUE -> PENDING_VERIFICATION | PARTIALLY_PAID | PAID | WAIVED | CANCELLED
 * PAID -> Terminal (immutable under Bogføringsloven)
 * WAIVED -> Terminal
 * CANCELLED -> Terminal
 */
const VALID_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  [InvoiceStatus.DRAFT]: [InvoiceStatus.OPEN, InvoiceStatus.CANCELLED],
  [InvoiceStatus.OPEN]: [
    InvoiceStatus.PENDING_VERIFICATION,
    InvoiceStatus.PARTIALLY_PAID,
    InvoiceStatus.PAID,
    InvoiceStatus.OVERDUE,
    InvoiceStatus.WAIVED,
    InvoiceStatus.CANCELLED,
  ],
  [InvoiceStatus.PENDING_VERIFICATION]: [
    InvoiceStatus.PAID,
    InvoiceStatus.PARTIALLY_PAID,
    InvoiceStatus.OPEN, // If payment report is rejected by Treasurer
    InvoiceStatus.OVERDUE,
  ],
  [InvoiceStatus.PARTIALLY_PAID]: [
    InvoiceStatus.PENDING_VERIFICATION,
    InvoiceStatus.PAID,
    InvoiceStatus.OVERDUE,
    InvoiceStatus.WAIVED,
    InvoiceStatus.CANCELLED,
  ],
  [InvoiceStatus.OVERDUE]: [
    InvoiceStatus.PENDING_VERIFICATION,
    InvoiceStatus.PARTIALLY_PAID,
    InvoiceStatus.PAID,
    InvoiceStatus.WAIVED,
    InvoiceStatus.CANCELLED,
  ],
  [InvoiceStatus.PAID]: [], // Immutable under Bogføringsloven § 10
  [InvoiceStatus.WAIVED]: [],
  [InvoiceStatus.CANCELLED]: [],
};

export function canTransitionInvoiceStatus(
  currentStatus: InvoiceStatus,
  nextStatus: InvoiceStatus
): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }
  const allowed = VALID_TRANSITIONS[currentStatus];
  return Boolean(allowed && allowed.includes(nextStatus));
}

/**
 * Evaluates whether an invoice is eligible for modification.
 * Once settled (PAID), WAIVED, or CANCELLED, financial line items are immutable.
 */
export function isInvoiceImmutable(status: InvoiceStatus): boolean {
  return (
    status === InvoiceStatus.PAID ||
    status === InvoiceStatus.WAIVED ||
    status === InvoiceStatus.CANCELLED
  );
}

export interface OverdueEvaluationResult {
  hasOverdueWarning: boolean;
  maxDaysOverdue: number;
  outstandingOere: number;
  overdueInvoiceCount: number;
}

/**
 * Evaluates informational >14 days overdue status for a player's open invoices.
 * Designed for Module 3's Match Squad Selection Console (Clarification Q3).
 *
 * Returns informational warning badge metadata without ever hard-blocking coach selection.
 */
export function evaluateOverdueBadge(
  invoices: {
    dueDate: Date;
    status: InvoiceStatus;
    totalOere: number;
    paidOere: number;
  }[],
  referenceDate: Date = new Date()
): OverdueEvaluationResult {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const referenceTime = referenceDate.getTime();

  let maxDaysOverdue = 0;
  let outstandingOere = 0;
  let overdueInvoiceCount = 0;

  for (const inv of invoices) {
    // Settled, waived, or cancelled invoices do not count as overdue
    if (
      inv.status === InvoiceStatus.PAID ||
      inv.status === InvoiceStatus.WAIVED ||
      inv.status === InvoiceStatus.CANCELLED ||
      inv.status === InvoiceStatus.DRAFT
    ) {
      continue;
    }

    const remainingOere = Math.max(0, inv.totalOere - inv.paidOere);
    if (remainingOere <= 0) {
      continue;
    }

    const dueTime = new Date(inv.dueDate).getTime();
    const diffMs = referenceTime - dueTime;
    const daysLate = Math.floor(diffMs / MS_PER_DAY);

    if (daysLate > 0) {
      outstandingOere += remainingOere;
      if (daysLate > maxDaysOverdue) {
        maxDaysOverdue = daysLate;
      }
      if (daysLate > 14) {
        overdueInvoiceCount++;
      }
    }
  }

  return {
    hasOverdueWarning: maxDaysOverdue > 14,
    maxDaysOverdue,
    outstandingOere,
    overdueInvoiceCount,
  };
}
