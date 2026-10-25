"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createEquipmentItemAction } from "@/modules/inventory/actions/catalog.actions";
import {
  Package,
  Layers,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

export function CreateEquipmentItemForm() {
  const router = useRouter();
  const [trackingType, setTrackingType] = useState<"SERIALIZED" | "BULK">("SERIALIZED");
  const [name, setName] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [category, setCategory] = useState("BATTING");
  const [ageGroup, setAgeGroup] = useState("SENIOR");
  const [condition, setCondition] = useState("GOOD");
  const [storageLocation, setStorageLocation] = useState("Poppelgårdsvej Shed - Locker 1");
  const [totalQuantity, setTotalQuantity] = useState(1);
  const [lowStockThreshold, setLowStockThreshold] = useState<string>("");
  const [purchasePriceDkk, setPurchasePriceDkk] = useState<string>("");
  const [description, setDescription] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let minorUnits: number | null = null;
      if (purchasePriceDkk.trim()) {
        const parsedPrice = parseFloat(purchasePriceDkk.replace(",", "."));
        if (!isNaN(parsedPrice) && parsedPrice >= 0) {
          minorUnits = Math.round(parsedPrice * 100);
        }
      }

      const payload = {
        trackingType,
        name: name.trim(),
        assetTag: trackingType === "SERIALIZED" && assetTag.trim() ? assetTag.trim() : null,
        category,
        ageGroup,
        condition,
        storageLocation: storageLocation.trim(),
        totalQuantity: trackingType === "SERIALIZED" ? 1 : Number(totalQuantity),
        lowStockThreshold:
          trackingType === "BULK" && lowStockThreshold.trim()
            ? Number(lowStockThreshold)
            : null,
        purchasePriceMinorUnits: minorUnits,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate).toISOString() : null,
        description: description.trim() || undefined,
      };

      const res = await createEquipmentItemAction(payload);
      if (!res.success) {
        setError(res.error || "Failed to create equipment item.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/inventory");
        router.refresh();
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Equipment item created successfully! Redirecting...</span>
        </div>
      )}

      {/* Tracking Type Toggle */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 space-y-3">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
          Asset Tracking Mode
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setTrackingType("SERIALIZED");
              setTotalQuantity(1);
            }}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              trackingType === "SERIALIZED"
                ? "bg-sky-500/10 border-sky-500 text-white"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              <Package className="w-4 h-4 text-sky-400" />
              <span>Serialized Asset</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Individual club gear tracked by unique asset tag (Bats, Helmets, Keys, Machines).
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setTrackingType("BULK");
              if (totalQuantity < 1) setTotalQuantity(10);
            }}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              trackingType === "BULK"
                ? "bg-sky-500/10 border-sky-500 text-white"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Bulk Consumable Stock</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Bulk items tracked by total count & available quantity (Match Balls, Cones, Bibs).
            </p>
          </button>
        </div>
      </div>

      {/* Basic Attributes */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Item Name <span className="text-rose-400">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kookaburra Kahuna Senior Match Bat"
              required
              className="bg-slate-950 border-slate-800 text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Asset Tag / Serial ID {trackingType === "SERIALIZED" && <span className="text-rose-400">*</span>}
            </label>
            <Input
              value={assetTag}
              onChange={(e) => setAssetTag(e.target.value)}
              placeholder={trackingType === "SERIALIZED" ? "e.g. BAT-2026-003" : "Not applicable for bulk stock"}
              disabled={trackingType === "BULK"}
              required={trackingType === "SERIALIZED"}
              className="bg-slate-950 border-slate-800 text-white font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-md text-sm text-slate-200"
            >
              <option value="BATTING">Batting</option>
              <option value="PROTECTIVE">Protective</option>
              <option value="BOWLING_BALLS">Bowling & Balls</option>
              <option value="TRAINING_GROUND">Training & Ground</option>
              <option value="FACILITY_KEYS">Facility Keys</option>
              <option value="APPAREL_KIT">Apparel & Kit</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Age / Size Group</label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-md text-sm text-slate-200"
            >
              <option value="UNIVERSAL">Universal</option>
              <option value="SENIOR">Senior</option>
              <option value="YOUTH">Youth (U15/U17)</option>
              <option value="JUNIOR">Junior (U11/U13)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Initial Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-md text-sm text-slate-200"
            >
              <option value="NEW">New</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="NEEDS_REPAIR">Needs Repair</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Storage Location <span className="text-rose-400">*</span>
            </label>
            <Input
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="e.g. Poppelgårdsvej Shed - Locker 1"
              required
              className="bg-slate-950 border-slate-800 text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Purchase / Replacement Price (DKK)
            </label>
            <Input
              value={purchasePriceDkk}
              onChange={(e) => setPurchasePriceDkk(e.target.value)}
              placeholder="e.g. 1499.00"
              className="bg-slate-950 border-slate-800 text-white font-mono"
            />
            <p className="text-[11px] text-slate-500">
              Stored as integer minor units (øre) in accordance with Constitution.
            </p>
          </div>
        </div>

        {/* Quantities for Bulk */}
        {trackingType === "BULK" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-emerald-400">
                Total Stock Quantity <span className="text-rose-400">*</span>
              </label>
              <Input
                type="number"
                min="1"
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(parseInt(e.target.value) || 1)}
                required
                className="bg-slate-950 border-slate-800 text-white font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-emerald-400">
                Low-Stock Warning Threshold
              </label>
              <Input
                type="number"
                min="0"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="e.g. 6 (prompts low stock badge)"
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Acquisition Date</label>
            <Input
              type="date"
              value={acquisitionDate}
              onChange={(e) => setAcquisitionDate(e.target.value)}
              className="bg-slate-950 border-slate-800 text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Description / Specs</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g. Certified match play willow, special grip, spare pads included."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Link href="/inventory">
          <Button type="button" variant="ghost" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Cancel
          </Button>
        </Link>

        <Button
          type="submit"
          disabled={loading || success}
          className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-6"
        >
          {loading ? "Creating..." : "Save Equipment Item"}
        </Button>
      </div>
    </form>
  );
}
