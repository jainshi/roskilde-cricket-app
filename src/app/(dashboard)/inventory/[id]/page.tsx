import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getEquipmentItemById } from "@/modules/inventory/services/catalog.service";
import { StockModals } from "@/components/inventory/stock-modals";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Package,
  Layers,
  CheckCircle2,
  Clock,
  Wrench,
  Archive,
  AlertTriangle,
  History,
  ArrowRightLeft,
  User,
  Calendar,
  MapPin,
  Tag,
} from "lucide-react";

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireActivatedSession();
  const { id } = await params;

  const isOfficial = session.roles.some(
    (r) => r === "ADMIN" || r === "COACH" || r === "AD_HOC_COACH"
  );

  if (!isOfficial) {
    redirect("/profile/gear");
  }

  const isAdmin = session.roles.includes("ADMIN");
  const isCoach = session.roles.includes("COACH") || session.roles.includes("AD_HOC_COACH");

  const item = await getEquipmentItemById(id);
  if (!item) {
    notFound();
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Available
          </span>
        );
      case "ON_LOAN":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> On Loan
          </span>
        );
      case "UNDER_MAINTENANCE":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
            <Wrench className="w-3.5 h-3.5" /> Under Maintenance
          </span>
        );
      case "RETIRED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">
            <Archive className="w-3.5 h-3.5" /> Retired
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
                {item.name}
              </h1>
              {item.assetTag && (
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                  {item.assetTag}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {item.category.replace("_", " ")} • {item.ageGroup} • {item.storageLocation}
            </p>
          </div>
        </div>

        {/* Action Controls & Pitch-side Check-out link */}
        <div className="flex flex-wrap items-center gap-2.5">
          {item.status === "AVAILABLE" && item.availableQuantity > 0 && (
            <Link href={`/inventory/checkout?item=${item.id}`}>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Check-Out This Item</span>
              </Button>
            </Link>
          )}

          <StockModals
            item={{
              id: item.id,
              name: item.name,
              assetTag: item.assetTag,
              trackingType: item.trackingType,
              totalQuantity: item.totalQuantity,
              availableQuantity: item.availableQuantity,
              lowStockThreshold: item.lowStockThreshold,
              status: item.status,
              condition: item.condition,
              storageLocation: item.storageLocation,
              purchasePriceMinorUnits: item.purchasePriceMinorUnits,
            }}
            isAdmin={isAdmin}
            isCoach={isCoach}
          />
        </div>
      </div>

      {/* Specifications & Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Status & Stock */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-sky-400" />
            Asset Status & Stock
          </h2>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-slate-400">Current Status</span>
            {getStatusBadge(item.status)}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Condition</span>
            <span className="text-sm font-semibold text-white capitalize">{item.condition.toLowerCase()}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Tracking Type</span>
            <span className="text-xs font-mono font-medium text-slate-300 px-2 py-0.5 rounded bg-slate-800">
              {item.trackingType}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Stock Availability</p>
              <p className="text-xl font-bold text-white">
                <span className={item.isLowStock ? "text-rose-400 font-extrabold" : "text-emerald-400"}>
                  {item.availableQuantity}
                </span>{" "}
                <span className="text-xs text-slate-500 font-normal">/ {item.totalQuantity} total</span>
              </p>
            </div>
            {item.isLowStock && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-3 h-3" /> Low Stock
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Location & Economics */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            Location & Asset Value
          </h2>

          <div className="space-y-1">
            <span className="text-xs text-slate-400">Storage Location</span>
            <p className="text-sm font-medium text-white flex items-center gap-1.5">
              <span>{item.storageLocation}</span>
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400">Purchase / Replacement Value</span>
            <p className="text-lg font-mono font-bold text-sky-400">
              {item.purchasePriceFormatted}
            </p>
            <p className="text-[10px] text-slate-500">
              Stored as integer minor units (øre) per Constitution Principle IV.
            </p>
          </div>

          {item.acquisitionDate && (
            <div className="space-y-1">
              <span className="text-xs text-slate-400">Acquisition Date</span>
              <p className="text-xs text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {new Date(item.acquisitionDate).toLocaleDateString("da-DK")}
              </p>
            </div>
          )}
        </div>

        {/* Card 3: Notes & Decommission */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-400" />
            Description & Notes
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed">
            {item.description || "No special descriptions or specifications recorded."}
          </p>

          {item.isRetired && (
            <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-900/50 space-y-1 text-xs">
              <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5" /> Decommissioned Asset
              </span>
              <p className="text-slate-300">Reason: {item.retiredReason || "Decommissioned."}</p>
              {item.retiredAt && (
                <p className="text-[11px] text-slate-500">
                  Retired on {new Date(item.retiredAt).toLocaleDateString("da-DK")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Relational Tabs / History */}
      <div className="space-y-6">
        {/* 1. Loan History */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
          <div className="p-4 bg-[#0c2340]/60 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-sky-400" />
              Borrowing & Loan History
            </h3>
            <span className="text-xs text-slate-400">{item.loans.length} recorded loans</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Borrower</th>
                  <th className="px-4 py-2.5">Loaned Date</th>
                  <th className="px-4 py-2.5">Expected Return</th>
                  <th className="px-4 py-2.5">Actual Return</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Issued By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {item.loans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      No loan records for this equipment item yet.
                    </td>
                  </tr>
                ) : (
                  item.loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium text-white flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-sky-400" />
                        <span>
                          {loan.borrowerProfile.firstName} {loan.borrowerProfile.lastName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(loan.checkedOutAt).toLocaleDateString("da-DK")}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {new Date(loan.expectedReturnAt).toLocaleDateString("da-DK")}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {loan.returnedAt
                          ? new Date(loan.returnedAt).toLocaleDateString("da-DK")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {loan.issuedBy.firstName} {loan.issuedBy.lastName}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Stock Ledger Transactions (Bulk Consumptions & Restocks) */}
        {item.stockTransactions.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
            <div className="p-4 bg-[#0c2340]/60 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Stock Ledger & Consumption Transactions
              </h3>
              <span className="text-xs text-slate-400">
                {item.stockTransactions.length} ledger events
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Delta</th>
                    <th className="px-4 py-2.5">Available After</th>
                    <th className="px-4 py-2.5">Total After</th>
                    <th className="px-4 py-2.5">Reason / Recipient</th>
                    <th className="px-4 py-2.5">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {item.stockTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(tx.createdAt).toLocaleString("da-DK")}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {tx.transactionType}
                      </td>
                      <td
                        className={`px-4 py-3 font-mono font-bold ${
                          tx.quantityDelta < 0 ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        {tx.quantityDelta > 0 ? `+${tx.quantityDelta}` : tx.quantityDelta}
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-mono">
                        {tx.availableQuantityAfter}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono">
                        {tx.totalQuantityAfter}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {tx.reason || "—"}
                        {tx.teamOrSquadName && (
                          <span className="block text-[10px] text-slate-500">
                            Squad: {tx.teamOrSquadName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {tx.recordedBy.firstName} {tx.recordedBy.lastName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
