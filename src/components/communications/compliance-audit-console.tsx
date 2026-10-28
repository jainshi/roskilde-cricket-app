"use client";

import React, { useState } from "react";
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Loader2,
  Clock,
} from "lucide-react";
import { DocumentComplianceMetric } from "@/modules/communications/services/document.service";
import { sendPolicyReminderAction } from "@/modules/communications/actions/document.actions";

interface ComplianceAuditConsoleProps {
  metrics: DocumentComplianceMetric[];
}

interface ComplianceDocumentCardProps {
  metric: DocumentComplianceMetric;
  initiallyExpanded?: boolean;
}

function ComplianceDocumentCard({
  metric,
  initiallyExpanded = false,
}: ComplianceDocumentCardProps) {
  const doc = metric.document;
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleSendReminders = async () => {
    setIsSending(true);
    setStatusMessage(null);

    try {
      const res = await sendPolicyReminderAction(doc.id);
      if (res.success && res.data) {
        setStatusMessage(
          `Dispatched ${res.data.remindersSent} policy review reminder email${
            res.data.remindersSent === 1 ? "" : "s"
          }!`
        );
      } else {
        setStatusMessage(res.error || "Failed to dispatch reminders.");
      }
    } catch (err: any) {
      setStatusMessage(err.message || "Failed to dispatch reminders.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-card border rounded-2xl shadow-sm overflow-hidden transition-all">
      {/* Document Header Summary */}
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                {doc.category.replace(/_/g, " ")}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">
                v{doc.version}
              </span>
              {doc.targetRole && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  Target: {doc.targetRole}s
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-foreground">{doc.title}</h3>
          </div>

          {/* Actions & Completion Rate */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-xl font-bold font-mono text-foreground">
                {metric.completionRate}%
              </div>
              <div className="text-[11px] text-muted-foreground">
                {metric.signedCount} / {metric.totalEligible} signed
              </div>
            </div>

            {metric.unsignedCount > 0 && (
              <button
                onClick={handleSendReminders}
                disabled={isSending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow transition-all active:scale-[0.98] disabled:opacity-50"
                title="Send email reminders to all unsigned members"
              >
                {isSending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Remind Unsigned ({metric.unsignedCount})
              </button>
            )}

            <button
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-2 rounded-xl border hover:bg-muted text-muted-foreground transition-colors"
              title={isExpanded ? "Collapse audit details" : "Expand audit details"}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              metric.completionRate === 100
                ? "bg-emerald-500"
                : metric.completionRate >= 80
                ? "bg-sky-500"
                : "bg-amber-500"
            }`}
            style={{ width: `${metric.completionRate}%` }}
          />
        </div>

        {statusMessage && (
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Expanded Audit Log & Member Lists */}
      {isExpanded && (
        <div className="border-t bg-muted/20 p-5 sm:p-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Unsigned Members */}
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Unsigned Members ({metric.unsignedCount})
                </h4>
              </div>

              {metric.unsignedMembers.length === 0 ? (
                <div className="p-4 rounded-xl bg-card border border-dashed text-center text-xs text-muted-foreground">
                  🎉 100% compliant! All eligible members have digitally signed this policy.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {metric.unsignedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-3 rounded-xl bg-card border text-xs flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div>
                        <p className="font-bold text-foreground">
                          {member.firstName} {member.lastName}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          {member.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {member.email}
                            </span>
                          )}
                          {member.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {member.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/15">
                          Pending
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signed Members Audit Log */}
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Signed Audit Records ({metric.signedCount})
                </h4>
              </div>

              {metric.signedMembers.length === 0 ? (
                <div className="p-4 rounded-xl bg-card border border-dashed text-center text-xs text-muted-foreground">
                  No sign-offs recorded yet for version {doc.version}.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {metric.signedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-3 rounded-xl bg-card border text-xs flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div>
                        <p className="font-bold text-foreground">
                          {member.firstName} {member.lastName}
                        </p>
                        {member.email && (
                          <p className="text-[11px] text-muted-foreground">
                            {member.email}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-500" />
                          {new Date(member.signedAt).toLocaleDateString("en-DK", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ComplianceAuditConsole({ metrics }: ComplianceAuditConsoleProps) {
  const totalMandatory = metrics.length;
  const totalEligibleSlots = metrics.reduce((acc, m) => acc + m.totalEligible, 0);
  const totalSignedSlots = metrics.reduce((acc, m) => acc + m.signedCount, 0);
  const overallRate =
    totalEligibleSlots > 0 ? Math.round((totalSignedSlots / totalEligibleSlots) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-1">
          <p className="text-xs text-muted-foreground font-semibold">Mandatory Policies</p>
          <p className="text-3xl font-bold font-mono text-foreground">{totalMandatory}</p>
          <p className="text-[11px] text-muted-foreground">Active compliance instruments</p>
        </div>

        <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-1">
          <p className="text-xs text-muted-foreground font-semibold">Overall Completion</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold font-mono text-foreground">{overallRate}%</p>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {totalSignedSlots} of {totalEligibleSlots} signed
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                overallRate === 100
                  ? "bg-emerald-500"
                  : overallRate >= 75
                  ? "bg-sky-500"
                  : "bg-amber-500"
              }`}
              style={{ width: `${overallRate}%` }}
            />
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-1">
          <p className="text-xs text-muted-foreground font-semibold">Statutory Compliance</p>
          <div className="flex items-center gap-1.5 pt-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-bold text-foreground">Audit Log Active</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Capturing timestamps, versions &amp; IP addresses
          </p>
        </div>
      </div>

      {/* Policies Compliance List */}
      <div className="space-y-4">
        {metrics.map((m, idx) => (
          <ComplianceDocumentCard
            key={m.document.id}
            metric={m}
            initiallyExpanded={idx === 0}
          />
        ))}
      </div>
    </div>
  );
}
