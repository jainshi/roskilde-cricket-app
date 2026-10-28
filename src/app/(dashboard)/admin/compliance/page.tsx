import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getDocumentComplianceReport } from "@/modules/communications/services/document.service";
import { ComplianceAuditConsole } from "@/components/communications/compliance-audit-console";
import { ShieldCheck, ArrowLeft, FileText } from "lucide-react";

export const metadata = {
  title: "Document Compliance & Audit Report | Roskilde Cricket Club",
  description:
    "Statutory compliance reporting, child-safety guideline sign-offs, and administrative reminder dispatches.",
};

export default async function AdminCompliancePage() {
  const session = await requireActivatedSession();

  if (!session.roles.includes("ADMIN")) {
    redirect("/dashboard");
  }

  const metrics = await getDocumentComplianceReport();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/documents"
            className="p-2 rounded-xl bg-card border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Back to documents"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Governance &amp; Statutory Compliance
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-foreground tracking-tight">
              Policy Sign-Off Audit Report
            </h1>
          </div>
        </div>

        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border transition-all self-start sm:self-auto"
        >
          <FileText className="w-4 h-4 text-primary" />
          View Document Library
        </Link>
      </div>

      {/* Main Compliance Audit Console */}
      <ComplianceAuditConsole metrics={metrics} />
    </div>
  );
}
