import React from "react";
import { Metadata } from "next";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getConsolidatedFamilyBilling } from "@/modules/finance/services/invoice.service";
import { FamilyBillingView } from "@/components/finance/family-billing-view";
import { CreditCard, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Billing & Fees | Roskilde Cricket Club",
  description: "View consolidated family dues, itemized invoices, payment receipts, and Danish payment options.",
};

export default async function BillingPage() {
  const session = await requireActivatedSession();

  // Retrieve billing summary for parent or active profile
  const targetProfileId = session.activeProfileId || session.memberProfileId;
  const billingSummary = await getConsolidatedFamilyBilling(targetProfileId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-sky-400 font-mono tracking-wider uppercase mb-1">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Member Portal · Finance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Club Billing &amp; Invoices
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review your household membership subscriptions, event fees, and settled payment receipts.
          </p>
        </div>
      </div>

      {/* Consolidated Family Statement View */}
      <FamilyBillingView summary={billingSummary} />
    </div>
  );
}
