import { oereToDkk, formatDanishKroner } from "./money-oere";

export interface LedgerExportRow {
  invoiceNumber: string;
  issueDate: Date | string;
  dueDate: Date | string;
  paidDate: Date | string | null;
  memberId: string;
  memberName: string;
  category: string;
  description: string;
  amountOere: number;
  paymentMethod: string | null;
  status: string;
  transactionReference: string | null;
}

export interface BogfoeringslovenCsvOptions {
  delimiter?: ";" | ",";
  includeBom?: boolean;
}

/**
 * Calculates the statutory retention expiry date under Danish Bookkeeping Act (§ 10).
 * Accounting records must be retained for 5 full fiscal years + remaining current year.
 * e.g., For fiscal year 2026, records must be retained through December 31, 2031.
 */
export function getBogfoeringslovenRetentionExpiry(fiscalYear: number): Date {
  if (!Number.isInteger(fiscalYear) || fiscalYear < 2000 || fiscalYear > 2100) {
    throw new RangeError(`Invalid fiscal year: ${fiscalYear}`);
  }
  // Expiry is 23:59:59.999 on Dec 31 of fiscalYear + 5
  return new Date(Date.UTC(fiscalYear + 5, 11, 31, 23, 59, 59, 999));
}

/**
 * Determines whether a transaction or invoice is still within the mandatory 5-year retention window.
 */
export function isWithinBogfoeringslovenRetention(
  transactionDate: Date,
  referenceDate: Date = new Date()
): boolean {
  const fiscalYear = transactionDate.getUTCFullYear();
  const retentionExpiry = getBogfoeringslovenRetentionExpiry(fiscalYear);
  return referenceDate.getTime() <= retentionExpiry.getTime();
}

/**
 * Generates an RFC 4180 compliant UTF-8 CSV string for Danish bookkeeping ledgers.
 * Includes UTF-8 BOM by default for seamless opening in Danish versions of Microsoft Excel.
 */
export function generateBogfoeringslovenCsv(
  rows: LedgerExportRow[],
  options?: BogfoeringslovenCsvOptions
): string {
  const { delimiter = ";", includeBom = true } = options || {};

  const headers = [
    "Fakturanummer",
    "Udstedelsesdato",
    "Forfaldsdato",
    "Betalingsdato",
    "Medlems-ID",
    "Medlemsnavn",
    "Kategori",
    "Beskrivelse",
    "Beloeb_Oere",
    "Beloeb_DKK",
    "Formateret_DKK",
    "Betalingsmetode",
    "Status",
    "Transaktionsreference",
  ];

  const escapeCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) {
      return "";
    }
    const str = String(val);
    if (str.includes(delimiter) || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const formatDate = (d: Date | string | null): string => {
    if (!d) return "";
    const dateObj = typeof d === "string" ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return "";
    return dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
  };

  const lines: string[] = [];

  // Header line
  lines.push(headers.map(escapeCell).join(delimiter));

  // Data rows
  for (const row of rows) {
    const dkk = oereToDkk(row.amountOere);
    const dkkFormatted = formatDanishKroner(row.amountOere, { includeSuffix: true });

    const values = [
      row.invoiceNumber,
      formatDate(row.issueDate),
      formatDate(row.dueDate),
      formatDate(row.paidDate),
      row.memberId,
      row.memberName,
      row.category,
      row.description,
      row.amountOere.toString(),
      dkk.toFixed(2).replace(".", ","), // Danish decimal comma
      dkkFormatted,
      row.paymentMethod ?? "",
      row.status,
      row.transactionReference ?? "",
    ];

    lines.push(values.map(escapeCell).join(delimiter));
  }

  const csvContent = lines.join("\r\n");
  const BOM = "\uFEFF";

  return includeBom ? `${BOM}${csvContent}` : csvContent;
}
