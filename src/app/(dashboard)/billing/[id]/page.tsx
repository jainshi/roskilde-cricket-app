import React from "react";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { Role } from "@prisma/client";
import { getInvoiceById } from "@/modules/finance/services/invoice.service";
import { formatDanishKroner } from "@/modules/finance/domain/money-oere";
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  Building2,
  Calendar,
  User,
  Shield,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Invoice & Receipt | Roskilde Cricket Club",
  description: "Official club billing statement and printable payment receipt.",
};

export default async function InvoiceDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireActivatedSession();
  const { id } = await props.params;

  const invoice = await getInvoiceById(id);
  if (!invoice) {
    notFound();
  }

  // Authorization check: User must be Admin, or beneficiary player, or debtor parent
  const isAdmin = session.roles.includes(Role.ADMIN);
  const isBeneficiary = invoice.memberProfileId === session.memberProfileId;
  const isDebtor = invoice.billedToProfileId === session.memberProfileId;

  if (!isAdmin && !isBeneficiary && !isDebtor) {
    redirect("/billing");
  }

  const isPaid = invoice.status === "PAID";
  const beneficiaryName = `${invoice.memberProfile.firstName} ${invoice.memberProfile.lastName}`;
  const billedToName = `${invoice.billedToProfile.firstName} ${invoice.billedToProfile.lastName}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Navigation & Print Actions */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/billing"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Billing Overview</span>
        </Link>

        <button
          onClick={undefined}
          className="print-trigger min-h-[38px] px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4 text-sky-400" />
          <span>Print Statement</span>
        </button>
      </div>

      {/* Official Receipt Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none print:p-0 space-y-8">
        {/* Header: Club Identity & Invoice Meta */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-800 print:border-black pb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white print:text-black tracking-tight">
              Roskilde Cricket Club
            </h1>
            <p className="text-xs text-sky-400 print:text-gray-600 font-mono mt-0.5">
              Poppelgårdsvej 10 · 4000 Roskilde · CVR: 29841122
            </p>
            <p className="text-xs text-slate-400 print:text-gray-600 mt-1">
              Dansk Cricket-Forbund (DCF) Member Club
            </p>
          </div>

          <div className="sm:text-right space-y-1">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30 print:border-black print:text-black">
              {invoice.invoiceNumber}
            </span>
            <div className="text-xs text-slate-400 print:text-gray-600 pt-1">
              Issue Date:{" "}
              <strong className="text-slate-200 print:text-black font-mono">
                {new Date(invoice.issueDate).toLocaleDateString("da-DK")}
              </strong>
            </div>
            <div className="text-xs text-slate-400 print:text-gray-600">
              Payment Due:{" "}
              <strong className="text-slate-200 print:text-black font-mono">
                {new Date(invoice.dueDate).toLocaleDateString("da-DK")}
              </strong>
            </div>
            {invoice.paidAt && (
              <div className="text-xs text-emerald-400 print:text-green-700 font-semibold flex sm:justify-end items-center gap-1 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Settled: {new Date(invoice.paidAt).toLocaleDateString("da-DK")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Member & Debtor Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs sm:text-sm">
          <div className="p-4 rounded-2xl bg-slate-950/60 print:bg-gray-100 border border-slate-800 print:border-gray-300 space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600 block">
              Billed To (Guardian / Payee)
            </span>
            <p className="font-bold text-white print:text-black text-base">{billedToName}</p>
            {invoice.billedToProfile.email && (
              <p className="text-slate-400 print:text-gray-600 font-mono text-xs">
                {invoice.billedToProfile.email}
              </p>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 print:bg-gray-100 border border-slate-800 print:border-gray-300 space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-600 block">
              Beneficiary Club Member
            </span>
            <p className="font-bold text-white print:text-black text-base">{beneficiaryName}</p>
            <p className="text-slate-400 print:text-gray-600 text-xs">
              Category: <strong className="text-slate-300 print:text-black">{invoice.category}</strong>
            </p>
          </div>
        </div>

        {/* Itemized Charges Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 print:border-gray-300">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-950/80 print:bg-gray-200 border-b border-slate-800 print:border-gray-300 text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-700">
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-gray-300 text-slate-200 print:text-black">
              {invoice.lineItems.map((item) => (
                <tr key={item.id}>
                  <td className="py-3.5 px-4 font-medium">{item.description}</td>
                  <td className="py-3.5 px-4 text-center font-mono">{item.quantity}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-400 print:text-gray-600">
                    {formatDanishKroner(item.unitPriceOere)}
                  </td>
                  <td
                    className={`py-3.5 px-4 text-right font-mono font-bold ${
                      item.totalOere < 0 ? "text-emerald-400 print:text-green-700" : "text-white print:text-black"
                    }`}
                  >
                    {formatDanishKroner(item.totalOere)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-950/90 print:bg-gray-100 border-t border-slate-800 print:border-gray-300">
                <td colSpan={3} className="py-4 px-4 font-bold text-slate-300 print:text-black text-right">
                  Total Amount Due:
                </td>
                <td className="py-4 px-4 font-black font-mono text-xl text-sky-400 print:text-black text-right">
                  {formatDanishKroner(invoice.totalOere)}
                </td>
              </tr>
              {invoice.paidOere > 0 && (
                <tr className="bg-slate-950/90 print:bg-gray-100 border-t border-slate-800/50">
                  <td colSpan={3} className="py-2.5 px-4 text-xs font-semibold text-emerald-400 print:text-green-700 text-right">
                    Amount Settled:
                  </td>
                  <td className="py-2.5 px-4 font-bold font-mono text-sm text-emerald-400 print:text-green-700 text-right">
                    -{formatDanishKroner(invoice.paidOere)}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>

        {/* Payment Metadata / Official Instructions */}
        <div className="p-5 rounded-2xl bg-slate-950/80 print:bg-gray-100 border border-slate-800 print:border-gray-300 text-xs space-y-2">
          <p className="font-bold text-white print:text-black text-sm">
            Danish Payment Methods &amp; Details:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300 print:text-gray-800 pt-1">
            <div>
              <span className="text-slate-400 print:text-gray-600 block">MobilePay Erhverv / Box:</span>
              <strong className="text-sky-400 print:text-black font-mono">#882244</strong>
              <p className="text-[11px] text-slate-400 print:text-gray-600">
                Reference note: <code>{invoice.invoiceNumber}</code>
              </p>
            </div>
            <div>
              <span className="text-slate-400 print:text-gray-600 block">Club Bank Transfer:</span>
              <strong className="font-mono text-slate-200 print:text-black">
                Reg. 2255 · Kontonr. 8899001122
              </strong>
              <p className="text-[11px] text-slate-400 print:text-gray-600">
                Payment message: <code>{invoice.invoiceNumber}</code>
              </p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-slate-500 print:text-gray-500 pt-4 border-t border-slate-800 print:border-gray-300">
          This document serves as an official accounting receipt under the Danish Bookkeeping Act (Bogføringsloven § 10). Retain for 5 years.
        </p>
      </div>
    </div>
  );
}
