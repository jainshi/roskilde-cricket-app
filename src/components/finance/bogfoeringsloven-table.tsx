"use client";

import React, { useState, useTransition } from "react";
import {
  Download,
  FileSpreadsheet,
  Calendar,
  ShieldCheck,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  FileText,
} from "lucide-react";
import { formatDanishKroner } from "@/modules/finance/domain/money-oere";
import { LedgerExportRow } from "@/modules/finance/domain/bogfoeringsloven-export";
import { exportBogfoeringslovenLedgerAction } from "@/modules/finance/actions/ledger.actions";

interface BogfoeringslovenTableProps {
  initialFiscalYear: number;
  initialRetentionExpiry: Date | string;
  initialRows: LedgerExportRow[];
  totalSettledOere: number;
  totalOutstandingOere: number;
}

export function BogfoeringslovenTable({
  initialFiscalYear,
  initialRetentionExpiry,
  initialRows,
  totalSettledOere,
  totalOutstandingOere,
}: BogfoeringslovenTableProps) {
  const [fiscalYear, setFiscalYear] = useState<number>(initialFiscalYear);
  const [category, setCategory] = useState<string>("ALL");
  const [includeUnpaid, setIncludeUnpaid] = useState(true);
  const [delimiter, setDelimiter] = useState<";" | ",">(";");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Filter rows locally for table view
  const filteredRows = initialRows.filter((r) => {
    if (category !== "ALL" && r.category !== category) return false;
    if (!includeUnpaid && r.status !== "PAID") return false;
    return true;
  });

  const handleDownloadCsv = () => {
    setErrorMsg(null);
    setDownloadSuccess(false);

    startTransition(async () => {
      const res = await exportBogfoeringslovenLedgerAction({
        fiscalYear,
        category: category as any,
        includeUnpaid,
        delimiter,
      });

      if (!res.success || !res.data) {
        setErrorMsg(res.error || "Failed to generate CSV export.");
      } else {
        const { csvContent, filename } = res.data;
        // Trigger browser file download
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 4000);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Statutory Compliance Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Danish Bookkeeping Act · Bogføringsloven § 10</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
              Financial Accounting Ledger Export
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Statutory 5-year accounting records formatted in UTF-8 BOM CSV with semicolon delimiter for Danish Excel.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={isPending}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isPending ? "Generating CSV..." : "Download Statutory CSV"}</span>
          </button>
        </div>

        {/* 3 Metric Summary Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-xs text-slate-400 block">5-Year Statutory Retention Expiry</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {new Date(initialRetentionExpiry).toLocaleDateString("da-DK", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">Mandatory retention under § 10</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Settled Turnover</span>
            <span className="text-lg font-bold text-white font-mono">
              {formatDanishKroner(totalSettledOere)}
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {filteredRows.filter((r) => r.status === "PAID").length} settled payments
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Outstanding Receivables</span>
            <span className="text-lg font-bold text-amber-400 font-mono">
              {formatDanishKroner(totalOutstandingOere)}
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {filteredRows.filter((r) => r.status !== "PAID").length} open / overdue accounts
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {downloadSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Statutory CSV generated and downloaded successfully!</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs sm:text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter and Option Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Fiscal Year */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono cursor-pointer"
            >
              <option value={2026}>Fiscal Year 2026</option>
              <option value={2025}>Fiscal Year 2025</option>
              <option value={2024}>Fiscal Year 2024</option>
            </select>
          </div>

          {/* Category */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="MEMBERSHIP_DUES">Membership Dues</option>
              <option value="EVENT_FEE">Tournament / Match Fees</option>
              <option value="EQUIPMENT_CHARGE">Equipment Incident Fees</option>
              <option value="AD_HOC">Ad-Hoc Fees</option>
            </select>
          </div>

          {/* CSV Delimiter */}
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-400">Delimiter:</span>
            <button
              type="button"
              onClick={() => setDelimiter(";")}
              className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${
                delimiter === ";"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-slate-950 text-slate-400 border-slate-800"
              }`}
            >
              Semicolon (;)
            </button>
            <button
              type="button"
              onClick={() => setDelimiter(",")}
              className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${
                delimiter === ","
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-slate-950 text-slate-400 border-slate-800"
              }`}
            >
              Comma (,)
            </button>
          </div>
        </div>

        {/* Include unpaid toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeUnpaid}
            onChange={(e) => setIncludeUnpaid(e.target.checked)}
            className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 w-4 h-4"
          />
          <span className="text-slate-300">Include Open / Unpaid Accounts</span>
        </label>
      </div>

      {/* Ledger Table Preview */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60 shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Accounting Ledger Preview ({filteredRows.length} rows)</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-500">
            Compliant with Bogføringsloven standard accounting columns
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Fakturanummer</th>
                <th className="py-3 px-4">Dato (Udstedt / Betalt)</th>
                <th className="py-3 px-4">Medlemsnavn</th>
                <th className="py-3 px-4">Kategori &amp; Beskrivelse</th>
                <th className="py-3 px-4 text-right">Beløb (DKK)</th>
                <th className="py-3 px-4">Metode &amp; Ref</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No accounting records found matching this fiscal filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">
                      {row.invoiceNumber}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300">
                      <span>{new Date(row.issueDate).toLocaleDateString("da-DK")}</span>
                      {row.paidDate && (
                        <span className="block text-[10px] text-emerald-400">
                          Betalt: {new Date(row.paidDate).toLocaleDateString("da-DK")}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-semibold text-white">
                      {row.memberName}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold text-slate-300 block">
                        {row.category}
                      </span>
                      <span className="text-[10px] text-slate-400 line-clamp-1">
                        {row.description}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-white text-sm">
                      {formatDanishKroner(row.amountOere)}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      <span>{row.paymentMethod || "—"}</span>
                      {row.transactionReference && (
                        <span className="block text-[10px] text-slate-500">
                          {row.transactionReference}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          row.status === "PAID"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : row.status === "OVERDUE"
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            : "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
