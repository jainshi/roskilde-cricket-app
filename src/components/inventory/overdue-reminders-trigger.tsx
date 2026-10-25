"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Loader2, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { sendOverdueRemindersAction } from "@/modules/inventory/actions/reminder.actions";
import { ReminderDispatchResult } from "@/modules/inventory/services/reminder.service";

export function OverdueRemindersTrigger() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReminderDispatchResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showStatus, setShowStatus] = useState(false);

  const handleTrigger = async () => {
    setLoading(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const res = await sendOverdueRemindersAction({ dryRun: false });
      if (!res.success) {
        setErrorMessage(res.error || "Failed to dispatch reminders");
      } else if (res.result) {
        setResult(res.result);
      }
      setShowStatus(true);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred");
      setShowStatus(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-flex flex-col items-end">
      <Button
        size="sm"
        variant="outline"
        onClick={handleTrigger}
        disabled={loading}
        className="border-amber-600/50 bg-amber-950/20 hover:bg-amber-900/30 text-amber-300 font-medium flex items-center gap-1.5 shadow-sm"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        ) : (
          <Bell className="w-4 h-4 text-amber-400" />
        )}
        <span>Send Overdue Reminders</span>
      </Button>

      {showStatus && (
        <div className="absolute top-10 right-0 z-50 w-80 p-4 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl animate-in fade-in slide-in-from-top-2 text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Overdue Reminder Results
            </span>
            <button
              onClick={() => setShowStatus(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {errorMessage && (
            <div className="p-2 rounded bg-red-950/50 border border-red-800 text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {result && (
            <div className="space-y-2 text-slate-300">
              <div className="flex items-center justify-between">
                <span>Overdue Loans Evaluated:</span>
                <span className="font-bold text-white">{result.evaluatedCount}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Reminders Sent:
                </span>
                <span className="font-bold">{result.remindersSentCount}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Skipped (24h Cooldown):</span>
                <span>{result.skippedCooldownCount}</span>
              </div>
              {result.loansNotified.some((l) => l.isMinor && l.recipients.length > 1) && (
                <div className="text-[11px] text-amber-300 bg-amber-950/30 p-1.5 rounded border border-amber-900/40">
                  Dual-parent escalation: notifications dispatched simultaneously to both linked parents for unreturned youth gear.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
