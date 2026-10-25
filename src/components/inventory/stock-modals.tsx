"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  recordStockConsumptionAction,
  restockBulkEquipmentAction,
} from "@/modules/inventory/actions/stock.actions";
import { updateEquipmentItemAction } from "@/modules/inventory/actions/catalog.actions";
import {
  Flame,
  PlusCircle,
  Edit,
  X,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Archive,
} from "lucide-react";

interface ItemDataProps {
  id: string;
  name: string;
  assetTag: string | null;
  trackingType: string;
  totalQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number | null;
  status: string;
  condition: string;
  storageLocation: string;
  purchasePriceMinorUnits: number | null;
}

export function StockModals({
  item,
  isAdmin,
  isCoach,
}: {
  item: ItemDataProps;
  isAdmin: boolean;
  isCoach: boolean;
}) {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<"CONSUME" | "RESTOCK" | "EDIT" | null>(null);

  // Consume state
  const [consumeQty, setConsumeQty] = useState(1);
  const [consumeReason, setConsumeReason] = useState("");
  const [teamOrSquad, setTeamOrSquad] = useState("");

  // Restock state
  const [restockQty, setRestockQty] = useState(10);
  const [restockReason, setRestockReason] = useState("Club inventory restock order");

  // Edit state
  const [editName, setEditName] = useState(item.name);
  const [editLocation, setEditLocation] = useState(item.storageLocation);
  const [editCondition, setEditCondition] = useState(item.condition);
  const [editStatus, setEditStatus] = useState(item.status);
  const [editRetiredReason, setEditRetiredReason] = useState("");
  const [editThreshold, setEditThreshold] = useState(
    item.lowStockThreshold !== null ? item.lowStockThreshold.toString() : ""
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConsumeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await recordStockConsumptionAction({
      equipmentItemId: item.id,
      quantity: Number(consumeQty),
      reason: consumeReason.trim(),
      teamOrSquadName: teamOrSquad.trim() || undefined,
    });

    if (!res.success) {
      setError(res.error || "Failed to record consumption.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setActiveModal(null);
    setConsumeReason("");
    router.refresh();
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await restockBulkEquipmentAction({
      equipmentItemId: item.id,
      quantityToAdd: Number(restockQty),
      reason: restockReason.trim(),
    });

    if (!res.success) {
      setError(res.error || "Failed to restock.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setActiveModal(null);
    router.refresh();
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await updateEquipmentItemAction({
      id: item.id,
      name: editName.trim(),
      storageLocation: editLocation.trim(),
      condition: editCondition as any,
      status: editStatus as any,
      retiredReason: editStatus === "RETIRED" ? editRetiredReason.trim() : undefined,
      lowStockThreshold: editThreshold.trim() ? Number(editThreshold) : null,
    });

    if (!res.success) {
      setError(res.error || "Failed to update equipment.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setActiveModal(null);
    router.refresh();
  };

  return (
    <>
      {/* Trigger Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {item.trackingType === "BULK" && item.availableQuantity > 0 && (
          <Button
            size="sm"
            onClick={() => {
              setError(null);
              setActiveModal("CONSUME");
            }}
            className="bg-amber-600 hover:bg-amber-500 text-white font-medium flex items-center gap-1.5"
          >
            <Flame className="w-4 h-4" />
            <span>Record Consumption</span>
          </Button>
        )}

        {item.trackingType === "BULK" && isAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setError(null);
              setActiveModal("RESTOCK");
            }}
            className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Restock Stock</span>
          </Button>
        )}

        {(isAdmin || isCoach) && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setError(null);
              setActiveModal("EDIT");
            }}
            className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5"
          >
            <Edit className="w-4 h-4 text-sky-400" />
            <span>Edit Item</span>
          </Button>
        )}
      </div>

      {/* Consumption Modal */}
      {activeModal === "CONSUME" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                Record Direct Consumption
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Direct expenditure with no return expected (e.g. league match balls, scorebooks).
              This decrements both available and total stock immediately.
            </p>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleConsumeSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Quantity to Consume (Available: {item.availableQuantity})
                </label>
                <Input
                  type="number"
                  min="1"
                  max={item.availableQuantity}
                  value={consumeQty}
                  onChange={(e) => setConsumeQty(parseInt(e.target.value) || 1)}
                  required
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Reason / Purpose <span className="text-rose-400">*</span>
                </label>
                <Input
                  value={consumeReason}
                  onChange={(e) => setConsumeReason(e.target.value)}
                  placeholder="e.g. League fixture vs Svanholm CC (Senior 1st XI)"
                  required
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Team or Squad (Optional)
                </label>
                <Input
                  value={teamOrSquad}
                  onChange={(e) => setTeamOrSquad(e.target.value)}
                  placeholder="e.g. Senior 1st XI"
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveModal(null)}
                  className="text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-amber-600 hover:bg-amber-500 text-white"
                >
                  {loading ? "Recording..." : "Confirm Consumption"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {activeModal === "RESTOCK" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                Restock Bulk Inventory
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Increments both total inventory and available stock counts.
            </p>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Quantity to Add
                </label>
                <Input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(parseInt(e.target.value) || 1)}
                  required
                  className="bg-slate-950 border-slate-800 text-white font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Restock Reason / PO Reference
                </label>
                <Input
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  placeholder="e.g. Spring 2026 pre-season club restock"
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveModal(null)}
                  className="text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {loading ? "Restocking..." : "Confirm Restock"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {activeModal === "EDIT" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-sky-400" />
                Edit Equipment Item
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Item Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Storage Location</label>
                <Input
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-md text-sm text-slate-200"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="ON_LOAN">On Loan</option>
                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                    {isAdmin && <option value="RETIRED">Retired (Terminal)</option>}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Condition</label>
                  <select
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-md text-sm text-slate-200"
                  >
                    <option value="NEW">New</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="NEEDS_REPAIR">Needs Repair</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </div>
              </div>

              {editStatus === "RETIRED" && (
                <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 space-y-1.5">
                  <label className="text-xs font-semibold text-rose-400">
                    Reason for Retiring Asset (Required)
                  </label>
                  <Input
                    value={editRetiredReason}
                    onChange={(e) => setEditRetiredReason(e.target.value)}
                    placeholder="e.g. Cracked handle beyond repair; written off for club accounting"
                    required
                    className="bg-slate-950 border-slate-800 text-white text-xs"
                  />
                  <p className="text-[11px] text-slate-400">
                    Warning: Per Constitution v1.1.0, RETIRED is a terminal state.
                  </p>
                </div>
              )}

              {item.trackingType === "BULK" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Low Stock Threshold
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={editThreshold}
                    onChange={(e) => setEditThreshold(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveModal(null)}
                  className="text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-sky-600 hover:bg-sky-500 text-white"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
