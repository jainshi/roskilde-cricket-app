import { describe, it, expect } from "vitest";
import {
  getBogfoeringslovenRetentionExpiry,
  isWithinBogfoeringslovenRetention,
  generateBogfoeringslovenCsv,
  LedgerExportRow,
} from "../../../src/modules/finance/domain/bogfoeringsloven-export";

describe("bogfoeringsloven-export domain rules", () => {
  describe("getBogfoeringslovenRetentionExpiry & isWithinBogfoeringslovenRetention", () => {
    it("calculates 5-year statutory retention expiry to December 31 of fiscalYear + 5", () => {
      const expiry2026 = getBogfoeringslovenRetentionExpiry(2026);
      expect(expiry2026.toISOString()).toBe("2031-12-31T23:59:59.999Z");

      const expiry2020 = getBogfoeringslovenRetentionExpiry(2020);
      expect(expiry2020.toISOString()).toBe("2025-12-31T23:59:59.999Z");
    });

    it("evaluates whether transaction is within statutory retention window", () => {
      const tx2026 = new Date("2026-04-15T10:00:00Z");

      // In 2028: well within retention (expires end of 2031)
      expect(isWithinBogfoeringslovenRetention(tx2026, new Date("2028-06-01T00:00:00Z"))).toBe(true);

      // In December 2031: still within retention
      expect(isWithinBogfoeringslovenRetention(tx2026, new Date("2031-12-31T12:00:00Z"))).toBe(true);

      // In January 2032: expired!
      expect(isWithinBogfoeringslovenRetention(tx2026, new Date("2032-01-01T00:00:00Z"))).toBe(false);
    });
  });

  describe("generateBogfoeringslovenCsv", () => {
    const sampleRows: LedgerExportRow[] = [
      {
        invoiceNumber: "RCC-INV-2026-0001",
        issueDate: new Date("2026-04-01T08:00:00Z"),
        dueDate: new Date("2026-05-01T23:59:59Z"),
        paidDate: new Date("2026-04-05T14:30:00Z"),
        memberId: "m-001",
        memberName: "Henrik Mortensen",
        category: "MEMBERSHIP_DUES",
        description: "Annual Senior Competitive 2026",
        amountOere: 180000,
        paymentMethod: "MOBILEPAY",
        status: "PAID",
        transactionReference: "MP-2026-0405-9988",
      },
      {
        invoiceNumber: "RCC-INV-2026-0003",
        issueDate: "2026-04-01T08:00:00Z",
        dueDate: "2026-05-01T23:59:59Z",
        paidDate: null,
        memberId: "m-003",
        memberName: "Emma Hansen",
        category: "MEMBERSHIP_DUES",
        description: "Youth U15 with Sibling; Discount",
        amountOere: 75000,
        paymentMethod: null,
        status: "OPEN",
        transactionReference: null,
      },
    ];

    it("generates UTF-8 BOM CSV with semicolon delimiter for Danish Excel", () => {
      const csv = generateBogfoeringslovenCsv(sampleRows);

      // Starts with UTF-8 BOM
      expect(csv.startsWith("\uFEFF")).toBe(true);

      // Contains header with semicolon delimiter
      expect(csv).toContain("Fakturanummer;Udstedelsesdato;Forfaldsdato;Betalingsdato;Medlems-ID");

      // Formats Danish Kroner decimals with comma
      expect(csv).toContain("180000;1800,00;1.800,00 kr.;MOBILEPAY;PAID;MP-2026-0405-9988");
      expect(csv).toContain("75000;750,00;750,00 kr.;;OPEN;");
    });

    it("escapes semicolons and quotes in description cells correctly", () => {
      const csv = generateBogfoeringslovenCsv(sampleRows);
      // The row with "Youth U15 with Sibling; Discount" has a semicolon, so it must be enclosed in quotes
      expect(csv).toContain('"Youth U15 with Sibling; Discount"');
    });

    it("supports optional comma delimiter and no BOM", () => {
      const csv = generateBogfoeringslovenCsv(sampleRows, { delimiter: ",", includeBom: false });
      expect(csv.startsWith("\uFEFF")).toBe(false);
      expect(csv).toContain("Fakturanummer,Udstedelsesdato,Forfaldsdato");
    });
  });
});
