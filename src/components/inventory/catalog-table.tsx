"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { CatalogItemView } from "@/modules/inventory/services/catalog.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Filter,
  AlertTriangle,
  Package,
  Layers,
  ArrowRight,
  Flame,
  PlusCircle,
  Wrench,
  CheckCircle2,
  Clock,
  Archive,
} from "lucide-react";

interface CatalogTableProps {
  items: CatalogItemView[];
  isAdmin: boolean;
  isCoach: boolean;
}

export function CatalogTable({ items, isAdmin, isCoach }: CatalogTableProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const categories = [
    { label: "All Categories", value: "ALL" },
    { label: "Batting", value: "BATTING" },
    { label: "Protective", value: "PROTECTIVE" },
    { label: "Balls", value: "BOWLING_BALLS" },
    { label: "Training & Ground", value: "TRAINING_GROUND" },
    { label: "Facility Keys", value: "FACILITY_KEYS" },
    { label: "Apparel & Kit", value: "APPAREL_KIT" },
  ];

  const statuses = [
    { label: "All Statuses", value: "ALL" },
    { label: "Available", value: "AVAILABLE" },
    { label: "On Loan", value: "ON_LOAN" },
    { label: "Maintenance", value: "UNDER_MAINTENANCE" },
    { label: "Retired", value: "RETIRED" },
  ];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesTag = item.assetTag?.toLowerCase().includes(q) ?? false;
        const matchesLocation = item.storageLocation.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesTag && !matchesLocation && !matchesDesc) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== "ALL" && item.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "ALL" && item.status !== selectedStatus) {
        return false;
      }

      // Tracking type filter
      if (selectedType !== "ALL" && item.trackingType !== selectedType) {
        return false;
      }

      // Low stock filter
      if (onlyLowStock && !item.isLowStock) {
        return false;
      }

      return true;
    });
  }, [items, search, selectedCategory, selectedStatus, selectedType, onlyLowStock]);

  const lowStockCount = useMemo(() => {
    return items.filter((i) => i.isLowStock).length;
  }, [items]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Available
          </span>
        );
      case "ON_LOAN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> On Loan
          </span>
        );
      case "UNDER_MAINTENANCE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/30">
            <Wrench className="w-3 h-3" /> Maintenance
          </span>
        );
      case "RETIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/30">
            <Archive className="w-3 h-3" /> Retired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-slate-300 bg-slate-800">
            {status}
          </span>
        );
    }
  };

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case "NEW":
        return <span className="text-xs text-sky-400 font-medium">New</span>;
      case "GOOD":
        return <span className="text-xs text-emerald-400">Good</span>;
      case "FAIR":
        return <span className="text-xs text-yellow-400">Fair</span>;
      case "NEEDS_REPAIR":
        return <span className="text-xs text-rose-400 font-semibold">Needs Repair</span>;
      case "RETIRED":
        return <span className="text-xs text-slate-500">Retired</span>;
      default:
        return <span className="text-xs text-slate-400">{condition}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Quick Filters Header */}
      <div className="grid grid-cols-2 md:grid-cols-12 gap-2 sm:gap-3 items-center">
        <div className="relative col-span-2 md:col-span-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search equipment by name, tag, location..."
            className="pl-9 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 h-10"
          />
        </div>

        {/* Category Selector */}
        <div className="col-span-1 md:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full h-10 px-3 py-2 bg-slate-900 border border-slate-800 rounded-md text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Selector */}
        <div className="col-span-1 md:col-span-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full h-10 px-3 py-2 bg-slate-900 border border-slate-800 rounded-md text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Low Stock Toggle Button */}
        <div className="col-span-2 md:col-span-2 flex justify-end">
          <Button
            variant={onlyLowStock ? "destructive" : "outline"}
            size="sm"
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`w-full text-xs h-10 flex items-center justify-center gap-1.5 ${
              onlyLowStock
                ? "bg-rose-600 hover:bg-rose-500 text-white"
                : "border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300"
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${onlyLowStock ? "text-white" : "text-amber-400"}`} />
            <span>Low Stock ({lowStockCount})</span>
          </Button>
        </div>
      </div>

      {/* Item Counts & Active Filters Info */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Showing <strong className="text-white">{filteredItems.length}</strong> of{" "}
          <strong className="text-white">{items.length}</strong> equipment items
        </span>
        {(search || selectedCategory !== "ALL" || selectedStatus !== "ALL" || onlyLowStock) && (
          <button
            onClick={() => {
              setSearch("");
              setSelectedCategory("ALL");
              setSelectedStatus("ALL");
              setSelectedType("ALL");
              setOnlyLowStock(false);
            }}
            className="text-sky-400 hover:text-sky-300 underline font-medium"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Mobile Card List View (Visible on < md) */}
      <div className="space-y-2.5 md:hidden">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 rounded-xl border border-slate-800 text-slate-500">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No equipment found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting search or filters.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <Link
              key={item.id}
              href={`/inventory/${item.id}`}
              className="block p-3.5 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800/80 active:scale-[0.99] transition-all shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{item.name}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {item.assetTag ? (
                      <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800/50">
                        {item.assetTag}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Bulk Stock</span>
                    )}
                    <span className="text-[11px] text-slate-400">
                      • {item.category.replace("_", " ")} ({item.ageGroup})
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`text-base font-bold ${
                      item.isLowStock ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {item.availableQuantity}
                  </span>
                  <span className="text-xs text-slate-400"> / {item.totalQuantity}</span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {getStatusBadge(item.status)}
                  <span className="text-slate-400 text-[11px] truncate max-w-[130px]">
                    {item.storageLocation}
                  </span>
                </div>
                <span className="text-sky-400 font-medium text-xs flex items-center gap-0.5">
                  Details →
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Main Desktop Catalog Table (Hidden on < md) */}
      <div className="hidden md:block rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-200">
            <thead className="bg-[#0c2340]/90 text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th scope="col" className="px-4 py-3.5">
                  Item & Asset Tag
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Category & Size
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Status & Condition
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Stock / Available
                </th>
                <th scope="col" className="px-4 py-3.5 hidden md:table-cell">
                  Location
                </th>
                <th scope="col" className="px-4 py-3.5 hidden lg:table-cell">
                  Value (DKK)
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-60" />
                    <p className="text-sm font-medium text-slate-400">No equipment items found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try adjusting your search terms or filter criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* Item & Tag */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <Link
                          href={`/inventory/${item.id}`}
                          className="font-medium text-white hover:text-sky-400 transition-colors flex items-center gap-1.5"
                        >
                          <span>{item.name}</span>
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          {item.assetTag ? (
                            <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800/50">
                              {item.assetTag}
                            </span>
                          ) : (
                            <span className="font-sans text-[11px] text-slate-400 flex items-center gap-1">
                              <Layers className="w-3 h-3 text-slate-500" /> Bulk Stock
                            </span>
                          )}
                          {item.isLowStock && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                              <AlertTriangle className="w-2.5 h-2.5" /> Low Stock
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category & Age */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-slate-300 font-medium">
                          {item.category.replace("_", " ")}
                        </span>
                        <span className="text-xs text-slate-500">{item.ageGroup}</span>
                      </div>
                    </td>

                    {/* Status & Condition */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        {getStatusBadge(item.status)}
                        <span className="text-[11px] text-slate-400">
                          Condition: {getConditionBadge(item.condition)}
                        </span>
                      </div>
                    </td>

                    {/* Stock Quantities */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={`text-base font-bold ${
                              item.isLowStock ? "text-rose-400 font-extrabold" : "text-white"
                            }`}
                          >
                            {item.availableQuantity}
                          </span>
                          <span className="text-xs text-slate-400">/ {item.totalQuantity}</span>
                        </div>
                        {item.lowStockThreshold !== null && (
                          <span className="text-[10px] text-slate-500">
                            Min alert: {item.lowStockThreshold}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3.5 hidden md:table-cell text-xs text-slate-300">
                      {item.storageLocation}
                    </td>

                    {/* Purchase Price (DKK) */}
                    <td className="px-4 py-3.5 hidden lg:table-cell text-xs font-mono text-slate-300">
                      {item.purchasePriceFormatted}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/inventory/${item.id}`}
                          className="px-2.5 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white transition-colors"
                        >
                          Details
                        </Link>
                      </div>
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
