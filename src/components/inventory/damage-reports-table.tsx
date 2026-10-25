"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resolveDamageReportAction } from "@/modules/inventory/actions/damage.actions";
import { DamageReportStatus } from "@prisma/client";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wrench,
  Archive,
  User,
  Package,
  AlertCircle,
  DollarSign,
  ChevronDown,
} from "lucide-react";

export interface DamageReportItem {
  id: string;
  severity: string;
  description: string;
  status: DamageReportStatus;
  resolutionNotes: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  replacementCostFormatted: string;
  equipmentItem: {
    id: string;
    name: string;
    assetTag: string | null;
    category: string;
    condition: string;
    status: string;
    storageLocation: string;
  };
  loan?: {
    id: string;
    borrowerProfile: {
      id: string;
      firstName: string;
      lastName: string;
    };
  } | null;
  reportedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
  resolvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export function DamageReportsTable({
  reports,
}: {
  reports: DamageReportItem[];
}) {
  const router = useRouter();
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [resolutionType, setResolutionType] = useState<
    "REPAIRED" | "RETIRED_WRITTEN_OFF" | "DISMISSED"
  >("REPAIRED");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleResolve = async (reportId: string) => {
    setError("");
    setProcessing(true);

    try {
      const res = await resolveDamageReportAction({
        reportId,
        resolution: resolutionType,
        resolutionNotes:
          resolutionNotes ||
          (resolutionType === "REPAIRED"
            ? "Equipment repaired and restored to service."
            : resolutionType === "RETIRED_WRITTEN_OFF"
            ? "Asset deemed irreparable and written off from club inventory."
            : "Damage incident report dismissed by coaching staff."),
      });

      if (!res.success) {
        setError(res.error || "Failed to resolve damage report.");
        setProcessing(false);
        return;
      }

      setActiveReportId(null);
      setResolutionNotes("");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setProcessing(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "MINOR":
        return "bg-amber-500/10 text-amber-300 border-amber-500/30";
      case "MAJOR":
        return "bg-orange-500/10 text-orange-300 border-orange-500/30";
      case "BEYOND_REPAIR":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse";
      case "LOST":
        return "bg-purple-500/10 text-purple-300 border-purple-500/30";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  if (reports.length === 0) {
    return (
      <div className="p-12 rounded-xl border border-slate-800 bg-slate-900/40 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        </div>
        <h3 className="text-base font-semibold text-white">No damage reports on file</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          All club assets are operational and free of reported damage incidents.
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

      <div className="space-y-3.5">
        {reports.map((report) => {
          const item = report.equipmentItem;
          const isPending = report.status === "PENDING";
          const isResolving = activeReportId === report.id;

          return (
            <div
              key={report.id}
              className={`p-5 rounded-xl border transition-all ${
                isPending
                  ? "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                  : "bg-slate-900/40 border-slate-800/60 opacity-80"
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 mt-0.5">
                    <Wrench className="w-5 h-5" />
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
                          Bulk Stock
                        </span>
                      )}
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getSeverityBadge(
                          report.severity
                        )}`}
                      >
                        {report.severity.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                      <span>Reported by: {report.reportedBy.firstName} {report.reportedBy.lastName}</span>
                      {report.loan?.borrowerProfile && (
                        <span>
                          • Borrower: {report.loan.borrowerProfile.firstName}{" "}
                          {report.loan.borrowerProfile.lastName}
                        </span>
                      )}
                      <span>• Shed: {item.storageLocation}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 block">Replacement Value</span>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {report.replacementCostFormatted}
                    </span>
                  </div>

                  <div>
                    {isPending ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        Action Required
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                        {report.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 space-y-1">
                <span className="text-slate-400 font-medium">Incident Details:</span>
                <p className="italic">"{report.description}"</p>
                <div className="text-[11px] text-slate-500 pt-1">
                  Reported on {new Date(report.createdAt).toLocaleDateString("da-DK")}
                </div>
              </div>

              {/* Resolved details if closed */}
              {!isPending && report.resolutionNotes && (
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/30 text-xs text-emerald-200 space-y-1">
                  <span className="font-semibold text-emerald-300">Resolution:</span>
                  <p>{report.resolutionNotes}</p>
                  {report.resolvedBy && (
                    <span className="text-[11px] text-emerald-400/80 block">
                      Resolved by {report.resolvedBy.firstName} {report.resolvedBy.lastName} on{" "}
                      {new Date(report.resolvedAt!).toLocaleDateString("da-DK")}
                    </span>
                  )}
                </div>
              )}

              {/* Resolution Action Trigger */}
              {isPending && !isResolving && (
                <div className="flex items-center justify-end pt-2">
                  <Button
                    size="sm"
                    onClick={() => setActiveReportId(report.id)}
                    className="text-xs bg-sky-600 hover:bg-sky-500 text-white font-medium flex items-center gap-1.5"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Resolve Incident</span>
                  </Button>
                </div>
              )}

              {/* Resolution Form Dialog / Dropdown */}
              {isResolving && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 mt-3 text-xs animate-in fade-in">
                  <h4 className="font-semibold text-white">Select Incident Resolution</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setResolutionType("REPAIRED")}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        resolutionType === "REPAIRED"
                          ? "bg-emerald-950/30 border-emerald-600 text-emerald-200"
                          : "bg-slate-900/50 border-slate-800 text-slate-400"
                      }`}
                    >
                      <span className="font-semibold block text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Repaired
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Restores asset to AVAILABLE and GOOD condition
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResolutionType("RETIRED_WRITTEN_OFF")}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        resolutionType === "RETIRED_WRITTEN_OFF"
                          ? "bg-rose-950/30 border-rose-600 text-rose-200"
                          : "bg-slate-900/50 border-slate-800 text-slate-400"
                      }`}
                    >
                      <span className="font-semibold block text-white flex items-center gap-1.5">
                        <Archive className="w-3.5 h-3.5 text-rose-400" />
                        Retire & Write-off
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Permanently retires asset & accounts for stock loss
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResolutionType("DISMISSED")}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        resolutionType === "DISMISSED"
                          ? "bg-slate-800 border-slate-600 text-slate-200"
                          : "bg-slate-900/50 border-slate-800 text-slate-400"
                      }`}
                    >
                      <span className="font-semibold block text-white flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-slate-400" />
                        Dismiss Report
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Closes incident report without modifying asset
                      </span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Resolution Notes:
                    </label>
                    <textarea
                      rows={2}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="e.g. Bat handle re-bound and re-gripped by coach; ready for team practice."
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white placeholder-slate-500 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveReportId(null)}
                      className="text-xs border-slate-700 text-slate-300"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={processing}
                      onClick={() => handleResolve(report.id)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                    >
                      {processing ? "Resolving..." : "Confirm Resolution"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
