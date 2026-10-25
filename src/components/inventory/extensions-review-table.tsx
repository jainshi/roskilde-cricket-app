"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { reviewLoanExtensionAction } from "@/modules/inventory/actions/extension.actions";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Package,
  AlertCircle,
  Shield,
  Layers,
} from "lucide-react";

export interface ExtensionReviewItem {
  id: string;
  proposedReturnAt: Date;
  reason: string;
  createdAt: Date;
  loan: {
    id: string;
    expectedReturnAt: Date;
    quantity: number;
    checkoutCondition: string;
    equipmentItem: {
      id: string;
      name: string;
      assetTag: string | null;
      category: string;
      storageLocation: string;
    };
    borrowerProfile: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      dateOfBirth: Date | null;
      parentLinksAsPlayer: Array<{
        parent: { id: string; firstName: string; lastName: string };
      }>;
    };
  };
  requestedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export function ExtensionsReviewTable({
  extensions,
}: {
  extensions: ExtensionReviewItem[];
}) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");

  const handleDecision = async (
    extensionId: string,
    decision: "APPROVED" | "REJECTED",
    reason?: string
  ) => {
    setError("");
    setProcessingId(extensionId);

    try {
      const res = await reviewLoanExtensionAction({
        extensionId,
        decision,
        rejectionReason: reason,
      });

      if (!res.success) {
        setError(res.error || `Failed to ${decision.toLowerCase()} extension.`);
        setProcessingId(null);
        return;
      }

      setRejectingId(null);
      setRejectionReason("");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setProcessingId(null);
    }
  };

  if (extensions.length === 0) {
    return (
      <div className="p-12 rounded-xl border border-slate-800 bg-slate-900/40 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        </div>
        <h3 className="text-base font-semibold text-white">No pending extension requests</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          All equipment return deadlines are up to date. New member requests will appear here for 1-click coaching review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-3">
        {extensions.map((ext) => {
          const item = ext.loan.equipmentItem;
          const borrower = ext.loan.borrowerProfile;
          const isProcessing = processingId === ext.id;
          const isPromptingReject = rejectingId === ext.id;

          const linkedParents = borrower.parentLinksAsPlayer.map(
            (p) => `${p.parent.firstName} ${p.parent.lastName}`
          );

          return (
            <div
              key={ext.id}
              className="p-5 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-all space-y-4"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 mt-0.5">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-base">{item.name}</span>
                      {item.assetTag ? (
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {item.assetTag}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          Bulk ({ext.loan.quantity} units)
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800/50">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-slate-300">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Borrower: {borrower.firstName} {borrower.lastName}
                      </span>
                      {linkedParents.length > 0 && (
                        <span className="text-amber-300/90 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-amber-400" />
                          Guardians: {linkedParents.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right sm:text-right">
                  <span className="text-[11px] text-slate-500 block">Requested on</span>
                  <span className="text-xs text-slate-300">
                    {new Date(ext.createdAt).toLocaleDateString("da-DK")}
                  </span>
                </div>
              </div>

              {/* Deadline Comparison Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Current Return Deadline</span>
                  <span className="text-slate-200 font-medium">
                    {new Date(ext.loan.expectedReturnAt).toLocaleDateString("da-DK")} 23:59
                  </span>
                </div>

                <div>
                  <span className="text-emerald-400 block mb-0.5 font-semibold">
                    Proposed Extended Deadline
                  </span>
                  <span className="text-white font-bold font-mono">
                    {new Date(ext.proposedReturnAt).toLocaleDateString("da-DK")} 23:59
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/40 text-xs space-y-1">
                <span className="text-slate-400 font-medium">Borrower's Reason:</span>
                <p className="text-slate-200 italic">"{ext.reason}"</p>
                <div className="text-[11px] text-slate-500 pt-1">
                  Submitted by: {ext.requestedBy.firstName} {ext.requestedBy.lastName}
                </div>
              </div>

              {/* Rejection Note Prompt */}
              {isPromptingReject && (
                <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-800/40 space-y-2 text-xs">
                  <label className="block text-rose-200 font-medium">
                    Reason for Rejection (sent to member/guardians):
                  </label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Gear required for upcoming senior league match..."
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white placeholder-slate-500 text-xs"
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectingId(null)}
                      className="text-xs border-slate-700 text-slate-300"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={isProcessing}
                      onClick={() => handleDecision(ext.id, "REJECTED", rejectionReason)}
                      className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium"
                    >
                      {isProcessing ? "Rejecting..." : "Confirm Rejection"}
                    </Button>
                  </div>
                </div>
              )}

              {/* 1-Click Action Buttons */}
              {!isPromptingReject && (
                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isProcessing}
                    onClick={() => setRejectingId(ext.id)}
                    className="text-xs border-slate-700 hover:bg-rose-950/20 hover:text-rose-300 hover:border-rose-800/50 text-slate-300 flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Reject</span>
                  </Button>

                  <Button
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleDecision(ext.id, "APPROVED")}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isProcessing ? "Approving..." : "Approve Extension"}</span>
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
