"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkoutEquipmentAction } from "@/modules/inventory/actions/loan.actions";
import { calculateDefaultReturnDeadline } from "@/modules/inventory/domain/return-deadline";
import { EquipmentCategory, ItemCondition } from "@prisma/client";
import {
  ArrowRightLeft,
  Search,
  User,
  Shield,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface CandidateItem {
  id: string;
  name: string;
  assetTag: string | null;
  category: EquipmentCategory;
  condition: string;
  trackingType: string;
  availableQuantity: number;
  storageLocation: string;
}

interface CandidateBorrower {
  id: string;
  name: string;
  email: string | null;
  roles: string[];
  isMinor: boolean;
  parents: string[];
}

export function PitchsideCheckoutForm({
  items,
  borrowers,
}: {
  items: CandidateItem[];
  borrowers: CandidateBorrower[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedItemId = searchParams.get("item");

  const [selectedItemId, setSelectedItemId] = useState<string>(preselectedItemId || "");
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>("");
  const [checkoutCondition, setCheckoutCondition] = useState<string>("GOOD");
  const [teamOrSquadName, setTeamOrSquadName] = useState<string>("");
  const [checkoutNotes, setCheckoutNotes] = useState<string>("");

  const [itemSearch, setItemSearch] = useState("");
  const [borrowerSearch, setBorrowerSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    loanId: string;
    isMinor: boolean;
    parentCount: number;
    expectedReturnAt: string;
  } | null>(null);

  const selectedItem = useMemo(() => {
    return items.find((i) => i.id === selectedItemId);
  }, [items, selectedItemId]);

  const selectedBorrower = useMemo(() => {
    return borrowers.find((b) => b.id === selectedBorrowerId);
  }, [borrowers, selectedBorrowerId]);

  // Pre-populate category-based default deadline whenever selected item changes
  useEffect(() => {
    if (selectedItem) {
      const deadline = calculateDefaultReturnDeadline({
        category: selectedItem.category,
        now: new Date(),
      });
      // Format as YYYY-MM-DD
      const yyyy = deadline.getFullYear();
      const mm = String(deadline.getMonth() + 1).padStart(2, "0");
      const dd = String(deadline.getDate()).padStart(2, "0");
      setExpectedReturnDate(`${yyyy}-${mm}-${dd}`);
      setCheckoutCondition(selectedItem.condition);
    }
  }, [selectedItem]);

  // Filter items available for loan
  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (i.availableQuantity <= 0) return false;
      if (!itemSearch.trim()) return true;
      const q = itemSearch.toLowerCase();
      return (
        i.name.toLowerCase().includes(q) ||
        (i.assetTag?.toLowerCase().includes(q) ?? false) ||
        i.category.toLowerCase().includes(q)
      );
    });
  }, [items, itemSearch]);

  // Filter candidate borrowers
  const filteredBorrowers = useMemo(() => {
    if (!borrowerSearch.trim()) return borrowers;
    const q = borrowerSearch.toLowerCase();
    return borrowers.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        (b.email?.toLowerCase().includes(q) ?? false) ||
        b.parents.some((p) => p.toLowerCase().includes(q))
    );
  }, [borrowers, borrowerSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      setError("Please select an equipment item.");
      return;
    }
    if (!selectedBorrowerId) {
      setError("Please select a borrower.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await checkoutEquipmentAction({
        equipmentItemId: selectedItemId,
        borrowerProfileId: selectedBorrowerId,
        quantity: selectedItem?.trackingType === "SERIALIZED" ? 1 : Number(quantity),
        teamOrSquadName: teamOrSquadName.trim() || undefined,
        expectedReturnAt: expectedReturnDate ? new Date(expectedReturnDate).toISOString() : undefined,
        checkoutCondition: checkoutCondition as ItemCondition,
        checkoutNotes: checkoutNotes.trim() || undefined,
      });

      if (!res.success) {
        setError(res.error || "Failed to execute check-out.");
        setLoading(false);
        return;
      }

      setSuccessInfo(res.data as any);
      setTimeout(() => {
        router.push("/inventory");
        router.refresh();
      }, 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected check-out failure.");
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

      {successInfo && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-sm space-y-2">
          <div className="flex items-center gap-2 font-semibold text-emerald-400">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>Check-Out Confirmed!</span>
          </div>
          <p className="text-xs text-slate-300">
            Expected return: <strong>{new Date(successInfo.expectedReturnAt).toLocaleDateString("da-DK")} 23:59</strong>
          </p>
          {successInfo.isMinor && (
            <p className="text-xs text-sky-300 font-medium flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Confirmation dispatched to {successInfo.parentCount} linked guardian(s).
            </p>
          )}
        </div>
      )}

      {/* Step 1: Select Equipment Item */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Package className="w-4 h-4 text-sky-400" />
            1. Select Equipment Item
          </span>
          {selectedItem && (
            <span className="text-xs font-normal text-emerald-400 font-mono">
              Available: {selectedItem.availableQuantity}
            </span>
          )}
        </label>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="Type item name or tag (e.g. Kahuna, BAT-2026-001)..."
            className="pl-9 bg-slate-950 border-slate-800 text-white"
          />
        </div>

        <select
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
          required
          size={5}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 max-h-36 overflow-y-auto"
        >
          {filteredItems.length === 0 ? (
            <option disabled className="text-slate-500 p-2">
              No available items found matching search
            </option>
          ) : (
            filteredItems.map((item) => (
              <option key={item.id} value={item.id} className="p-2 border-b border-slate-900/40">
                {item.assetTag ? `[${item.assetTag}] ` : ""}{item.name} ({item.category}) — Avail: {item.availableQuantity}
              </option>
            ))
          )}
        </select>

        {selectedItem && (
          <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-800/30 flex items-center justify-between text-xs">
            <div>
              <span className="text-white font-medium">{selectedItem.name}</span>
              <span className="text-slate-400 block text-[11px]">
                {selectedItem.category} • Location: {selectedItem.storageLocation}
              </span>
            </div>
            <span className="font-mono text-sky-300 font-semibold px-2 py-0.5 rounded bg-sky-900/40">
              {selectedItem.assetTag || "BULK"}
            </span>
          </div>
        )}
      </div>

      {/* Step 2: Select Borrower (with Minor Parent Indicator) */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <User className="w-4 h-4 text-emerald-400" />
          2. Select Borrower
        </label>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={borrowerSearch}
            onChange={(e) => setBorrowerSearch(e.target.value)}
            placeholder="Type player or coach name..."
            className="pl-9 bg-slate-950 border-slate-800 text-white"
          />
        </div>

        <select
          value={selectedBorrowerId}
          onChange={(e) => setSelectedBorrowerId(e.target.value)}
          required
          size={5}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 max-h-36 overflow-y-auto"
        >
          {filteredBorrowers.length === 0 ? (
            <option disabled className="text-slate-500 p-2">
              No matching club members found
            </option>
          ) : (
            filteredBorrowers.map((borrower) => (
              <option key={borrower.id} value={borrower.id} className="p-2 border-b border-slate-900/40">
                {borrower.name} [{borrower.id}] ({borrower.roles.join("/")}){borrower.isMinor ? " [YOUTH / MINOR]" : ""}
              </option>
            ))
          )}
        </select>

        {selectedBorrower && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
              selectedBorrower.isMinor
                ? "bg-amber-950/20 border-amber-800/40 text-amber-200"
                : "bg-slate-950/40 border-slate-800 text-slate-300"
            }`}
          >
            <div>
              <span className="font-semibold text-white">{selectedBorrower.name}</span>
              {selectedBorrower.isMinor && (
                <div className="text-[11px] text-amber-300/90 mt-0.5 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-amber-400" />
                  <span>
                    Linked Guardian(s):{" "}
                    {selectedBorrower.parents.length > 0
                      ? selectedBorrower.parents.join(", ")
                      : "No parents linked yet"}
                  </span>
                </div>
              )}
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {selectedBorrower.isMinor ? "MINOR ACCOUNTABILITY" : "ADULT MEMBER"}
            </span>
          </div>
        )}
      </div>

      {/* Step 3: Loan Parameters & Return Deadline */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-purple-400" />
          3. Loan Deadlines & Condition
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Expected Return Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Expected Return Date</span>
              <span className="text-[10px] text-sky-400">Category Default Pre-populated</span>
            </label>
            <Input
              type="date"
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              required
              className="bg-slate-950 border-slate-800 text-white font-medium"
            />
          </div>

          {/* Condition at Checkout */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Condition at Checkout</label>
            <select
              value={checkoutCondition}
              onChange={(e) => setCheckoutCondition(e.target.value)}
              className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-md text-sm text-slate-200"
            >
              <option value="NEW">New</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
            </select>
          </div>
        </div>

        {/* Bulk Quantity / Squad Assignment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedItem?.trackingType === "BULK" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-emerald-400">
                Loan Quantity (Available: {selectedItem.availableQuantity})
              </label>
              <Input
                type="number"
                min="1"
                max={selectedItem.availableQuantity}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                required
                className="bg-slate-950 border-slate-800 text-white font-bold"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Team or Squad Assignment (Optional)
            </label>
            <Input
              value={teamOrSquadName}
              onChange={(e) => setTeamOrSquadName(e.target.value)}
              placeholder="e.g. Senior 1st XI, U13 Junior Cup"
              className="bg-slate-950 border-slate-800 text-white text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Checkout Notes / Inspection Remarks
          </label>
          <Input
            value={checkoutNotes}
            onChange={(e) => setCheckoutNotes(e.target.value)}
            placeholder="e.g. Issued with bat cover and extra grip"
            className="bg-slate-950 border-slate-800 text-white text-xs"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Link href="/inventory">
          <Button type="button" variant="ghost" className="text-slate-400 hover:text-white">
            Cancel
          </Button>
        </Link>

        <Button
          type="submit"
          disabled={loading || !selectedItemId || !selectedBorrowerId}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 h-12 shadow-lg shadow-emerald-950/50"
        >
          {loading ? "Confirming..." : "Confirm Pitch-Side Check-Out"}
        </Button>
      </div>
    </form>
  );
}
