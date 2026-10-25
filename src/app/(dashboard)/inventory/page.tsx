import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getEquipmentCatalog } from "@/modules/inventory/services/catalog.service";
import { CatalogTable } from "@/components/inventory/catalog-table";
import { OverdueRemindersTrigger } from "@/components/inventory/overdue-reminders-trigger";
import { Button } from "@/components/ui/button";
import {
  Package,
  PlusCircle,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
} from "lucide-react";

export default async function InventoryPage() {
  const session = await requireActivatedSession();

  const isOfficial = session.roles.some(
    (r) => r === "ADMIN" || r === "COACH" || r === "AD_HOC_COACH"
  );

  if (!isOfficial) {
    redirect("/profile/gear");
  }

  const isAdmin = session.roles.includes("ADMIN");
  const isCoach = session.roles.includes("COACH") || session.roles.includes("AD_HOC_COACH");

  const items = await getEquipmentCatalog();

  // Metrics summary
  const totalItemsCount = items.length;
  const availableCount = items.filter((i) => i.status === "AVAILABLE").length;
  const onLoanCount = items.filter((i) => i.status === "ON_LOAN").length;
  const maintenanceCount = items.filter((i) => i.status === "UNDER_MAINTENANCE").length;
  const lowStockCount = items.filter((i) => i.isLowStock).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Fast Pitch-Side Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
                Equipment & Inventory
              </h1>
              <p className="text-sm text-slate-400">
                Roskilde Cricket Club master asset catalog & stock accounting
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/inventory/checkout">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Pitch-Side Check-Out</span>
            </Button>
          </Link>

          <Link href="/inventory/checkin">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-slate-200 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Check-In</span>
            </Button>
          </Link>

          <Link href="/inventory/extensions">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-slate-200 flex items-center gap-1.5"
            >
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Extensions</span>
            </Button>
          </Link>

          <Link href="/inventory/damage">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-slate-200 flex items-center gap-1.5"
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>Damage</span>
            </Button>
          </Link>

          <OverdueRemindersTrigger />

          {isAdmin && (
            <Link href="/inventory/new">
              <Button
                size="sm"
                className="bg-sky-600 hover:bg-sky-500 text-white font-medium flex items-center gap-1.5 shadow-lg shadow-sky-950/40"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Equipment</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Catalog</span>
            <Package className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-white">{totalItemsCount}</p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-950/50 bg-emerald-950/20 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-emerald-400/80 mb-1">
            <span>Available</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{availableCount}</p>
        </div>

        <div className="p-4 rounded-xl border border-amber-950/50 bg-amber-950/20 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-amber-400/80 mb-1">
            <span>On Loan</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">{onLoanCount}</p>
        </div>

        <div className="p-4 rounded-xl border border-orange-950/50 bg-orange-950/20 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-orange-400/80 mb-1">
            <span>Maintenance</span>
            <Wrench className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-orange-400">{maintenanceCount}</p>
        </div>

        <div className="p-4 rounded-xl border border-rose-950/50 bg-rose-950/20 backdrop-blur-sm col-span-2 sm:col-span-4 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-rose-400/80 mb-1">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400">{lowStockCount}</p>
        </div>
      </div>

      {/* Main Filterable Catalog Table */}
      <CatalogTable items={items} isAdmin={isAdmin} isCoach={isCoach} />
    </div>
  );
}
