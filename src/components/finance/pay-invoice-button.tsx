"use client";

import React, { useState } from "react";
import { CreditCard } from "lucide-react";
import { MobilePaymentModal, MobilePaymentInvoiceData } from "./mobile-payment-modal";

interface PayInvoiceButtonProps {
  invoice: MobilePaymentInvoiceData;
}

export function PayInvoiceButton({ invoice }: PayInvoiceButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isSettled = invoice.status === "PAID" || invoice.status === "WAIVED" || invoice.status === "CANCELLED";

  if (isSettled) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="min-h-[40px] px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all cursor-pointer print:hidden"
      >
        <CreditCard className="w-4 h-4" />
        <span>Pay / Mark as Paid</span>
      </button>

      {isOpen && (
        <MobilePaymentModal
          invoice={invoice}
          isOpen={true}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
