import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getEquipmentCatalog } from "@/modules/inventory/services/catalog.service";
import { getCandidateBorrowers } from "@/modules/inventory/services/loan.service";
import { PitchsideCheckoutForm } from "@/components/inventory/pitchside-checkout-form";
import { EquipmentCategory } from "@prisma/client";
import { ArrowLeft, ArrowRightLeft } from "lucide-react";

export const metadata = {
  title: "Pitch-Side Check-Out | Roskilde Cricket Club",
  description: "Fast mobile equipment check-out with intelligent return deadlines and minor guardian accountability",
};

export default async function PitchsideCheckoutPage() {
  const session = await requireActivatedSession();

  const isOfficial = session.roles.some(
    (r) => r === "ADMIN" || r === "COACH" || r === "AD_HOC_COACH"
  );

  if (!isOfficial) {
    redirect("/profile/gear");
  }

  const [catalogItems, borrowers] = await Promise.all([
    getEquipmentCatalog(),
    getCandidateBorrowers(),
  ]);

  // Filter items available for loan: not retired, not under maintenance, available quantity > 0
  const availableItems = catalogItems
    .filter(
      (item) =>
        item.status === "AVAILABLE" &&
        item.availableQuantity > 0
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      assetTag: item.assetTag,
      category: item.category as EquipmentCategory,
      condition: item.condition,
      trackingType: item.trackingType,
      availableQuantity: item.availableQuantity,
      storageLocation: item.storageLocation,
    }));

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inventory</span>
        </Link>
        <span className="text-xs uppercase tracking-wider text-emerald-400/80 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
          Pitch-Side Mode
        </span>
      </div>

      {/* Title */}
      <div>
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
            Pitch-Side Check-Out
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400">
          Fast mobile check-out with automatic category deadline calculation and minor guardian accountability binding.
        </p>
      </div>

      {/* Main Form Component */}
      <PitchsideCheckoutForm items={availableItems} borrowers={borrowers} />
    </div>
  );
}
