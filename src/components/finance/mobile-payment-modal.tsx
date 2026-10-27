"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Smartphone,
  Building2,
  Copy,
  Check,
  X,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { formatDanishKroner } from "@/modules/finance/domain/money-oere";
import { PaymentMethod } from "@prisma/client";
import { reportInvoicePaymentAction } from "@/modules/finance/actions/payment.actions";

export interface MobilePaymentInvoiceData {
  id: string;
  invoiceNumber: string;
  paymentReference: string;
  totalOere: number;
  paidOere: number;
  dueDate: Date | string;
  beneficiaryName: string;
  status: string;
}

interface MobilePaymentModalProps {
  invoice: MobilePaymentInvoiceData;
  isOpen: boolean;
  onClose: () => void;
}

// Club standard Danish payment details
const CLUB_PAYMENT_DETAILS = {
  mobilePayNumber: "987654",
  mobilePayBoxName: "Roskilde Cricket Club - Kontingent",
  bankName: "Danske Bank",
  bankRegNumber: "3420",
  bankAccountNumber: "0012345678",
};

export function MobilePaymentModal({
  invoice,
  isOpen,
  onClose,
}: MobilePaymentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const remainingOere = Math.max(0, invoice.totalOere - invoice.paidOere);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.MOBILEPAY);
  const [txRef, setTxRef] = useState("");
  const [notes, setNotes] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isReported, setIsReported] = useState(
    invoice.status === "PENDING_VERIFICATION"
  );

  if (!isOpen) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleMarkAsPaid = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await reportInvoicePaymentAction({
        invoiceId: invoice.id,
        amountOere: remainingOere,
        paymentMethod,
        transactionReference: txRef || undefined,
        notes: notes || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to report payment.");
      } else {
        setIsReported(true);
        setSuccessMsg(
          "Payment reported! Our club treasurer will verify your transaction against bank records."
        );
        router.refresh();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header - Compact for 360px */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Pay Invoice</h3>
              <p className="text-[11px] font-mono text-sky-400">{invoice.invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs">
          {/* Amount Due Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-sky-950/40 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Amount Due</span>
              <span className="text-2xl font-black text-white font-mono">
                {formatDanishKroner(remainingOere)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-mono block">Beneficiary</span>
              <span className="text-xs font-semibold text-slate-300">
                {invoice.beneficiaryName}
              </span>
            </div>
          </div>

          {/* Feedback Banners */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {isReported ? (
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-3 text-center">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-300 mx-auto flex items-center justify-center">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Payment Pending Verification</h4>
                <p className="text-slate-400 text-[11px] mt-1">
                  You have reported payment for this invoice. The club treasurer will reconcile it
                  with the club bank statement shortly.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          ) : (
            <>
              {/* Payment Reference Code (Mandatory for Reconciliation) */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>Payment Reference (Important)</span>
                  <span className="text-[10px] text-sky-400">Include in payment message</span>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-700/60 font-mono">
                  <span className="text-sm font-bold text-sky-300">
                    {invoice.paymentReference}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(invoice.paymentReference, "ref")}
                    className="px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[11px] font-sans font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedField === "ref" ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* MobilePay Card */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  <span>MobilePay</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    ({CLUB_PAYMENT_DETAILS.mobilePayBoxName})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-700/60 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block">MobilePay Box ID</span>
                    <span className="text-sm font-bold text-white">
                      {CLUB_PAYMENT_DETAILS.mobilePayNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(CLUB_PAYMENT_DETAILS.mobilePayNumber, "mobilepay")
                    }
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-sans font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedField === "mobilepay" ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Bank Transfer Card */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>Bank Transfer ({CLUB_PAYMENT_DETAILS.bankName})</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-700/60 font-mono flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Reg. nr.</span>
                      <span className="text-xs font-bold text-white">
                        {CLUB_PAYMENT_DETAILS.bankRegNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(CLUB_PAYMENT_DETAILS.bankRegNumber, "reg")
                      }
                      className="p-1 rounded text-slate-400 hover:text-white"
                      title="Copy Reg. nr."
                    >
                      {copiedField === "reg" ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-700/60 font-mono flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Kontonr.</span>
                      <span className="text-xs font-bold text-white">
                        {CLUB_PAYMENT_DETAILS.bankAccountNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(CLUB_PAYMENT_DETAILS.bankAccountNumber, "konto")
                      }
                      className="p-1 rounded text-slate-400 hover:text-white"
                      title="Copy Kontonr."
                    >
                      {copiedField === "konto" ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Mark as Paid Self-Reporting Form */}
              <form onSubmit={handleMarkAsPaid} className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-xs">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span>Step 2: Notify Club (Mark as Paid)</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { method: PaymentMethod.MOBILEPAY, label: "MobilePay" },
                      { method: PaymentMethod.BANK_TRANSFER, label: "Bank Transfer" },
                      { method: PaymentMethod.CASH, label: "Cash" },
                    ] as const
                  ).map(({ method, label }) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 px-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                        paymentMethod === method
                          ? "bg-sky-500/20 border-sky-500/40 text-sky-300"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Optional Transaction ID / Note
                  </label>
                  <input
                    type="text"
                    value={txRef}
                    onChange={(e) => setTxRef(e.target.value)}
                    placeholder="e.g. MobilePay transfer code or bank note"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <span>Submitting Notification...</span>
                  ) : (
                    <>
                      <span>I Have Sent {formatDanishKroner(remainingOere)}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
