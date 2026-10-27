"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Send,
  DollarSign,
  FileText,
  Filter,
  Search,
  Check,
  X,
  CreditCard,
  Building2,
  Smartphone,
  Banknote,
  Ban,
  Receipt,
  User,
} from "lucide-react";
import { formatDanishKroner, dkkToOere } from "@/modules/finance/domain/money-oere";
import { PaymentMethod, TransactionStatus, InvoiceStatus } from "@prisma/client";
import {
  verifyPaymentTransactionAction,
  recordPartialPaymentAction,
  waiveInvoiceAction,
  sendOverdueReminderAction,
  batchSendOverdueRemindersAction,
} from "@/modules/finance/actions/reconciliation.actions";

export interface PendingTransactionItem {
  id: string;
  amountOere: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  transactionReference: string | null;
  reportedAt: Date | string;
  notes: string | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    paymentReference: string;
    totalOere: number;
    paidOere: number;
    status: InvoiceStatus;
    memberProfile: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
    };
    billedToProfile: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
    };
  };
  reportedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
}

export interface OverdueInvoiceItem {
  id: string;
  invoiceNumber: string;
  paymentReference: string;
  category: string;
  status: InvoiceStatus;
  totalOere: number;
  paidOere: number;
  dueDate: Date | string;
  lastReminderSentAt: Date | string | null;
  reminderCount: number;
  memberProfile: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
  billedToProfile: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
}

export interface RecentAuditTransaction {
  id: string;
  amountOere: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  transactionReference: string | null;
  settlementDate: Date | string;
  verifiedAt: Date | string | null;
  notes: string | null;
  invoice: {
    invoiceNumber: string;
    memberProfile: {
      firstName: string;
      lastName: string;
    };
  };
  verifiedBy: {
    firstName: string;
    lastName: string;
  } | null;
}

interface TreasurerReconciliationProps {
  pendingTransactions: PendingTransactionItem[];
  overdueInvoices: OverdueInvoiceItem[];
  recentVerifiedTransactions: RecentAuditTransaction[];
}

export function TreasurerReconciliation({
  pendingTransactions,
  overdueInvoices,
  recentVerifiedTransactions,
}: TreasurerReconciliationProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"PENDING" | "OVERDUE" | "AUDIT">("PENDING");
  const [search, setSearch] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Rejection modal state
  const [rejectingTx, setRejectingTx] = useState<PendingTransactionItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Waiver modal state
  const [waivingInvoice, setWaivingInvoice] = useState<OverdueInvoiceItem | null>(null);
  const [waiverReason, setWaiverReason] = useState("");

  // Partial Payment modal state
  const [partialInvoice, setPartialInvoice] = useState<OverdueInvoiceItem | null>(null);
  const [partialAmountDkk, setPartialAmountDkk] = useState("");
  const [partialMethod, setPartialMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [partialRef, setPartialRef] = useState("");

  const totalPendingOere = pendingTransactions.reduce((acc, t) => acc + t.amountOere, 0);
  const totalOverdueOere = overdueInvoices.reduce(
    (acc, inv) => acc + Math.max(0, inv.totalOere - inv.paidOere),
    0
  );

  // 1-Click Verification
  const handleVerify = (txId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await verifyPaymentTransactionAction({
        transactionId: txId,
        action: "VERIFY",
      });
      if (!res.success) {
        setErrorMsg(res.error || "Failed to verify payment transaction.");
      } else {
        setSuccessMsg("Payment verified and recorded in club accounting ledger!");
        router.refresh();
      }
    });
  };

  // Reject Submit
  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTx) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await verifyPaymentTransactionAction({
        transactionId: rejectingTx.id,
        action: "REJECT",
        rejectionReason,
      });
      if (!res.success) {
        setErrorMsg(res.error || "Failed to reject transaction.");
      } else {
        setSuccessMsg("Payment transaction rejected. Member has been notified.");
        setRejectingTx(null);
        setRejectionReason("");
        router.refresh();
      }
    });
  };

  // 1-Click Overdue Reminder
  const handleSendReminder = (invoiceId: string, invoiceNumber: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await sendOverdueReminderAction({ invoiceId });
      if (!res.success) {
        setErrorMsg(res.error || "Failed to send reminder.");
      } else {
        setSuccessMsg(`Overdue reminder dispatched for invoice ${invoiceNumber}.`);
        router.refresh();
      }
    });
  };

  // Batch Send Overdue Reminders
  const handleBatchSendReminders = () => {
    if (
      !window.confirm(
        `Are you sure you want to dispatch overdue reminder emails to all ${overdueInvoices.length} outstanding accounts?`
      )
    ) {
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await batchSendOverdueRemindersAction({ minDaysOverdue: 1 });
      if (!res.success) {
        setErrorMsg(res.error || "Failed to batch send reminders.");
      } else {
        const data = res.data as { sentCount: number };
        setSuccessMsg(`Successfully dispatched ${data.sentCount} overdue reminder email(s)!`);
        router.refresh();
      }
    });
  };

  // Waive Submit
  const handleWaiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waivingInvoice) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await waiveInvoiceAction({
        invoiceId: waivingInvoice.id,
        reason: waiverReason,
      });
      if (!res.success) {
        setErrorMsg(res.error || "Failed to waive invoice.");
      } else {
        setSuccessMsg(
          `Invoice ${waivingInvoice.invoiceNumber} waived with documented justification.`
        );
        setWaivingInvoice(null);
        setWaiverReason("");
        router.refresh();
      }
    });
  };

  // Partial Payment Submit
  const handlePartialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partialInvoice) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const dkkNum = parseFloat(partialAmountDkk);
    if (isNaN(dkkNum) || dkkNum <= 0) {
      setErrorMsg("Please enter a valid payment amount in DKK.");
      return;
    }
    const oere = dkkToOere(dkkNum);

    startTransition(async () => {
      const res = await recordPartialPaymentAction({
        invoiceId: partialInvoice.id,
        amountOere: oere,
        paymentMethod: partialMethod,
        transactionReference: partialRef || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to record payment.");
      } else {
        setSuccessMsg(
          `Payment of ${formatDanishKroner(oere)} recorded for invoice ${partialInvoice.invoiceNumber}.`
        );
        setPartialInvoice(null);
        setPartialAmountDkk("");
        setPartialRef("");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI cards */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-sky-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Treasurer Administrative Console</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
              Payment Reconciliation &amp; Overdue Control
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Verify member-reported MobilePay &amp; bank deposits, log pitchside cash, issue waivers, and dispatch reminders.
            </p>
          </div>

          {overdueInvoices.length > 0 && (
            <button
              onClick={handleBatchSendReminders}
              disabled={isPending}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Dispatch All Reminders ({overdueInvoices.length})</span>
            </button>
          )}
        </div>

        {/* 3 Metric Summary Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Awaiting Verification</p>
              <p className="text-lg font-bold text-purple-400 font-mono">
                {pendingTransactions.length} transaction(s)
              </p>
            </div>
            <span className="text-sm font-mono font-bold text-purple-300">
              {formatDanishKroner(totalPendingOere)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Overdue Unpaid Dues</p>
              <p className="text-lg font-bold text-rose-400 font-mono">
                {overdueInvoices.length} account(s)
              </p>
            </div>
            <span className="text-sm font-mono font-bold text-rose-300">
              {formatDanishKroner(totalOverdueOere)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Recent Audit Entries</p>
              <p className="text-lg font-bold text-emerald-400 font-mono">
                {recentVerifiedTransactions.length} settled
              </p>
            </div>
            <span className="text-xs text-slate-500">Bogføringsloven § 10</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs sm:text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs sm:text-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab("PENDING")}
          className={`min-h-[40px] px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "PENDING"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              : "text-slate-400 hover:text-white bg-slate-900 border border-slate-800/80"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Verification Queue ({pendingTransactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("OVERDUE")}
          className={`min-h-[40px] px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "OVERDUE"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              : "text-slate-400 hover:text-white bg-slate-900 border border-slate-800/80"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Overdue Invoices ({overdueInvoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("AUDIT")}
          className={`min-h-[40px] px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "AUDIT"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "text-slate-400 hover:text-white bg-slate-900 border border-slate-800/80"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Settled Audit Log ({recentVerifiedTransactions.length})</span>
        </button>
      </div>

      {/* TAB 1: PENDING VERIFICATION QUEUE */}
      {activeTab === "PENDING" && (
        <div className="space-y-4">
          {pendingTransactions.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
              <p className="font-semibold text-white">Reconciliation Queue Clear</p>
              <p className="text-xs text-slate-500 mt-1">
                No member-reported transactions currently awaiting verification.
              </p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Invoice / Ref</th>
                      <th className="py-3 px-4">Player &amp; Debtor</th>
                      <th className="py-3 px-4">Method &amp; Tx Ref</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Reported At</th>
                      <th className="py-3 px-4 text-center">Reconciliation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {pendingTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-sky-400 block">
                            {tx.invoice.invoiceNumber}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            Ref: {tx.invoice.paymentReference}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">
                            {tx.invoice.memberProfile.firstName}{" "}
                            {tx.invoice.memberProfile.lastName}
                          </div>
                          {tx.invoice.billedToProfile.id !== tx.invoice.memberProfile.id && (
                            <div className="text-[11px] text-slate-400">
                              Billed to: {tx.invoice.billedToProfile.firstName}{" "}
                              {tx.invoice.billedToProfile.lastName}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-300">
                            {tx.paymentMethod === PaymentMethod.MOBILEPAY ? (
                              <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                            ) : tx.paymentMethod === PaymentMethod.BANK_TRANSFER ? (
                              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Banknote className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            <span>{tx.paymentMethod}</span>
                          </span>
                          {tx.transactionReference && (
                            <span className="block font-mono text-[10px] text-slate-400 mt-0.5">
                              ID: {tx.transactionReference}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-white text-sm">
                          {formatDanishKroner(tx.amountOere)}
                        </td>

                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(tx.reportedAt).toLocaleDateString("da-DK", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleVerify(tx.id)}
                              disabled={isPending}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                              title="Verify payment matches bank deposit"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Verify</span>
                            </button>

                            <button
                              onClick={() => setRejectingTx(tx)}
                              disabled={isPending}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs transition-colors cursor-pointer"
                              title="Reject payment notification"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OVERDUE INVOICES */}
      {activeTab === "OVERDUE" && (
        <div className="space-y-4">
          {overdueInvoices.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
              <p className="font-semibold text-white">All Accounts Current</p>
              <p className="text-xs text-slate-500 mt-1">No overdue club invoices found.</p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Invoice</th>
                      <th className="py-3 px-4">Player &amp; Responsible</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-right">Outstanding</th>
                      <th className="py-3 px-4 text-center">Reminders</th>
                      <th className="py-3 px-4 text-center">Administrative Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {overdueInvoices.map((inv) => {
                      const outstandingOere = Math.max(0, inv.totalOere - inv.paidOere);
                      const daysOverdue = Math.floor(
                        (Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                      );

                      return (
                        <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-sky-400 block">
                              {inv.invoiceNumber}
                            </span>
                            <span className="text-[10px] text-slate-500">{inv.category}</span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white">
                              {inv.memberProfile.firstName} {inv.memberProfile.lastName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {inv.billedToProfile.email || "No email"}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono">
                            <span className="text-rose-400 font-semibold block">
                              {new Date(inv.dueDate).toLocaleDateString("da-DK")}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {daysOverdue > 0 ? `${daysOverdue}d overdue` : "Due today"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-300 text-sm">
                            {formatDanishKroner(outstandingOere)}
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                inv.reminderCount > 0
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "text-slate-500"
                              }`}
                            >
                              {inv.reminderCount} sent
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleSendReminder(inv.id, inv.invoiceNumber)}
                                disabled={isPending}
                                className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Send reminder email"
                              >
                                <Send className="w-3 h-3" />
                                <span>Remind</span>
                              </button>

                              <button
                                onClick={() => {
                                  setPartialInvoice(inv);
                                  setPartialAmountDkk(
                                    (
                                      Math.max(0, inv.totalOere - inv.paidOere) / 100
                                    ).toString()
                                  );
                                }}
                                disabled={isPending}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Record partial / cash payment"
                              >
                                <Banknote className="w-3 h-3" />
                                <span>Record Paid</span>
                              </button>

                              <button
                                onClick={() => setWaivingInvoice(inv)}
                                disabled={isPending}
                                className="px-2 py-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-colors cursor-pointer"
                                title="Waive fee with documented note"
                              >
                                <Ban className="w-3 h-3" />
                                <span>Waive</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUDIT LOG */}
      {activeTab === "AUDIT" && (
        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Invoice</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4">Method &amp; Ref</th>
                  <th className="py-3 px-4 text-right">Settled Amount</th>
                  <th className="py-3 px-4">Verified By</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {recentVerifiedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">
                      {tx.invoice.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-white">
                      {tx.invoice.memberProfile.firstName} {tx.invoice.memberProfile.lastName}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {tx.paymentMethod} {tx.transactionReference ? `(${tx.transactionReference})` : ""}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatDanishKroner(tx.amountOere)}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {tx.verifiedBy ? `${tx.verifiedBy.firstName} ${tx.verifiedBy.lastName}` : "System"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          tx.status === TransactionStatus.VERIFIED
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" />
              <span>Reject Payment Notification</span>
            </h3>
            <p className="text-xs text-slate-400">
              Rejecting payment of{" "}
              <strong className="text-white">
                {formatDanishKroner(rejectingTx.amountOere)}
              </strong>{" "}
              on invoice{" "}
              <strong className="text-sky-400">{rejectingTx.invoice.invoiceNumber}</strong>.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Rejection Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Transaction could not be found on club bank statement..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingTx(null)}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs"
                >
                  {isPending ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WAIVE MODAL */}
      {waivingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Ban className="w-5 h-5 text-amber-400" />
              <span>Waive Invoice Fee</span>
            </h3>
            <p className="text-xs text-slate-400">
              Waiving remaining fee of{" "}
              <strong className="text-white">
                {formatDanishKroner(
                  Math.max(0, waivingInvoice.totalOere - waivingInvoice.paidOere)
                )}
              </strong>{" "}
              for{" "}
              <strong className="text-white">
                {waivingInvoice.memberProfile.firstName} {waivingInvoice.memberProfile.lastName}
              </strong>{" "}
              ({waivingInvoice.invoiceNumber}).
            </p>
            <form onSubmit={handleWaiveSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Audit Justification Reason <span className="text-amber-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={waiverReason}
                  onChange={(e) => setWaiverReason(e.target.value)}
                  placeholder="e.g. Board financial hardship exemption, municipal grant covered..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWaivingInvoice(null)}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  {isPending ? "Waiving..." : "Confirm Fee Waiver"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PARTIAL PAYMENT MODAL */}
      {partialInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-400" />
              <span>Record Payment (Direct / Pitchside)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Record verified payment for{" "}
              <strong className="text-sky-400">{partialInvoice.invoiceNumber}</strong>.
            </p>
            <form onSubmit={handlePartialSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Amount (DKK) <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={partialAmountDkk}
                  onChange={(e) => setPartialAmountDkk(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      PaymentMethod.BANK_TRANSFER,
                      PaymentMethod.MOBILEPAY,
                      PaymentMethod.CASH,
                    ] as const
                  ).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPartialMethod(m)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border ${
                        partialMethod === m
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Optional Reference / Note
                </label>
                <input
                  type="text"
                  value={partialRef}
                  onChange={(e) => setPartialRef(e.target.value)}
                  placeholder="e.g. Bank statement transfer ID or pitchside receipt"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPartialInvoice(null)}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs"
                >
                  {isPending ? "Recording..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
