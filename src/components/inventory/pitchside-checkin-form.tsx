"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkinEquipmentAction } from "@/modules/inventory/actions/loan.actions";
import { ItemCondition, LoanStatus } from "@prisma/client";
import {
  CheckCircle2,
  Search,
  Wrench,
  AlertTriangle,
  Clock,
  User,
  Package,
  Layers,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

interface ActiveLoanData {
  id: string;
  quantity: number;
  expectedReturnAt: Date;
  status: LoanStatus;
  checkoutCondition: string;
  equipmentItem: {
    id: string;
    name: string;
    assetTag: string | null;
    category: string;
    condition: string;
    trackingType: string;
    storageLocation: string;
  };
  borrowerProfile: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date | null;
  };
}

export function PitchsideCheckinForm({ loans }: { loans: ActiveLoanData[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [returnCondition, setReturnCondition] = useState<ItemCondition>(ItemCondition.GOOD);
  const [returnNotes, setReturnNotes] = useState("");
  const [returnedQuantity, setReturnedQuantity] = useState<number>(1);
  const [lostQuantity, setLostQuantity] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    loanId: string;
    newStatus: string;
  } | null>(null);

  const selectedLoan = useMemo(() => {
    return loans.find((l) => l.id === selectedLoanId);
  }, [loans, selectedLoanId]);

  // When selected loan changes, set initial quantity
  const handleSelectLoan = (loan: ActiveLoanData) => {
    setSelectedLoanId(loan.id);
    setReturnCondition((loan.checkoutCondition as ItemCondition) || ItemCondition.GOOD);
    setReturnedQuantity(loan.quantity);
    setLostQuantity(0);
    setReturnNotes("");
    setError(null);
    setSuccessInfo(null);
  };

  const filteredLoans = useMemo(() => {
    if (!search.trim()) return loans;
    const q = search.toLowerCase();
    return loans.filter((l) => {
      const borrowerName = `${l.borrowerProfile.firstName} ${l.borrowerProfile.lastName}`.toLowerCase();
      const itemName = l.equipmentItem.name.toLowerCase();
      const tag = l.equipmentItem.assetTag?.toLowerCase() ?? "";
      return borrowerName.includes(q) || itemName.includes(q) || tag.includes(q);
    });
  }, [loans, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    setLoading(true);
    setError(null);

    try {
      const res = await checkinEquipmentAction({
        loanId: selectedLoan.id,
        returnCondition,
        returnNotes: returnNotes.trim() || undefined,
        returnedQuantity:
          selectedLoan.equipmentItem.trackingType === "BULK"
            ? Number(returnedQuantity)
            : undefined,
        lostQuantity:
          selectedLoan.equipmentItem.trackingType === "BULK"
            ? Number(lostQuantity)
            : 0,
      });

      if (!res.success) {
        setError(res.error || "Failed to check in equipment.");
        setLoading(false);
        return;
      }

      setSuccessInfo(res.data as any);
      setTimeout(() => {
        router.push("/inventory");
        router.refresh();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected check-in error.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successInfo && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-sm space-y-1">
          <div className="flex items-center gap-2 font-semibold text-emerald-400">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>Equipment Returned Successfully!</span>
          </div>
          <p className="text-xs text-slate-300">
            Asset status transitioned to: <strong className="text-white">{successInfo.newStatus}</strong>
          </p>
        </div>
      )}

      {/* Loan Selector Card */}
      <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-sky-400" />
            1. Select Active Loan to Check In
          </span>
          <span className="text-xs font-normal text-slate-400">
            {filteredLoans.length} active loans
          </span>
        </label>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by borrower name, bat name, or tag..."
            className="pl-9 bg-slate-950 border-slate-800 text-white"
          />
        </div>

        <div className="grid grid-cols-1 gap-2.5 max-h-72 overflow-y-auto pt-1">
          {filteredLoans.length === 0 ? (
            <div className="p-6 text-center text-slate-500 border border-slate-800/80 rounded-lg">
              <Package className="w-8 h-8 mx-auto mb-1 opacity-50" />
              <p className="text-xs">No active equipment loans matching your query.</p>
            </div>
          ) : (
            filteredLoans.map((loan) => {
              const isSelected = loan.id === selectedLoanId;
              const isOverdue = new Date().getTime() > new Date(loan.expectedReturnAt).getTime();

              return (
                <button
                  key={loan.id}
                  type="button"
                  onClick={() => handleSelectLoan(loan)}
                  className={`p-3.5 rounded-lg border text-left transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-sky-500/10 border-sky-500 text-white shadow-md shadow-sky-950/30"
                      : "bg-slate-950 border-slate-800/80 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">
                        {loan.equipmentItem.name}
                      </span>
                      {loan.equipmentItem.assetTag && (
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-sky-300">
                          {loan.equipmentItem.assetTag}
                        </span>
                      )}
                      {isOverdue && (
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded border border-rose-500/30">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-500" />
                      <span>
                        Borrower: {loan.borrowerProfile.firstName} {loan.borrowerProfile.lastName}
                      </span>
                      <span>• Qty: {loan.quantity}</span>
                    </p>
                  </div>

                  <div className="text-right text-[11px] text-slate-400 font-mono">
                    Due: {new Date(loan.expectedReturnAt).toLocaleDateString("da-DK")}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Step 2: Inspection & Return Action Form */}
      {selectedLoan && (
        <form onSubmit={handleSubmit} className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            2. Inspect Condition & Check In
          </label>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
            <p className="font-semibold text-white">
              Returning: {selectedLoan.equipmentItem.name} {selectedLoan.equipmentItem.assetTag ? `[${selectedLoan.equipmentItem.assetTag}]` : ""}
            </p>
            <p className="text-slate-400">
              Borrower: {selectedLoan.borrowerProfile.firstName} {selectedLoan.borrowerProfile.lastName}
            </p>
            <p className="text-slate-400">
              Condition at Checkout: <strong>{selectedLoan.checkoutCondition}</strong>
            </p>
          </div>

          {/* Condition Assessment Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Inspected Condition upon Return <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Good / Ready", value: ItemCondition.GOOD, color: "text-emerald-400", desc: "Available for next loan" },
                { label: "Fair (Normal Wear)", value: ItemCondition.FAIR, color: "text-yellow-400", desc: "Available for training" },
                { label: "Needs Repair", value: ItemCondition.NEEDS_REPAIR, color: "text-rose-400", desc: "Routes to Maintenance" },
                { label: "Retired / Lost", value: ItemCondition.RETIRED, color: "text-slate-400", desc: "Decommissions asset" },
              ].map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setReturnCondition(c.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    returnCondition === c.value
                      ? "bg-sky-500/10 border-sky-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <p className={`font-semibold text-xs ${c.color}`}>{c.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{c.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Damaged Alert */}
          {returnCondition === ItemCondition.NEEDS_REPAIR && (
            <div className="p-3.5 rounded-lg bg-orange-950/20 border border-orange-800/40 text-orange-300 text-xs flex items-center gap-2">
              <Wrench className="w-4 h-4 flex-shrink-0 text-orange-400" />
              <span>
                Item will automatically transition to <strong>UNDER_MAINTENANCE</strong> and be locked from check-out until an official completes servicing.
              </span>
            </div>
          )}

          {/* Bulk Item Return / Lost Split */}
          {selectedLoan.equipmentItem.trackingType === "BULK" && selectedLoan.quantity > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Returned Units</label>
                <Input
                  type="number"
                  min="0"
                  max={selectedLoan.quantity}
                  value={returnedQuantity}
                  onChange={(e) => {
                    const ret = parseInt(e.target.value) || 0;
                    setReturnedQuantity(ret);
                    setLostQuantity(Math.max(0, selectedLoan.quantity - ret));
                  }}
                  className="bg-slate-900 border-slate-800 text-white font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-rose-400">Lost / Missing Units</label>
                <Input
                  type="number"
                  min="0"
                  max={selectedLoan.quantity}
                  value={lostQuantity}
                  onChange={(e) => {
                    const lost = parseInt(e.target.value) || 0;
                    setLostQuantity(lost);
                    setReturnedQuantity(Math.max(0, selectedLoan.quantity - lost));
                  }}
                  className="bg-slate-900 border-slate-800 text-white font-bold"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Return Notes / Inspection Remarks
            </label>
            <Input
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="e.g. Returned clean; new rubber grip recommended before league match"
              className="bg-slate-950 border-slate-800 text-white text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedLoanId("")}
              className="text-slate-400"
            >
              Cancel Selection
            </Button>

            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 h-12 shadow-lg shadow-emerald-950/50"
            >
              {loading ? "Completing Return..." : "Confirm Return & Update Status"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
