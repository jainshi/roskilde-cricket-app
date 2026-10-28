import React from "react";
import Link from "next/link";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { listClubDocuments } from "@/modules/communications/services/document.service";
import { DocumentLibrary } from "@/components/communications/document-library";
import { FileText, BarChart3 } from "lucide-react";

export const metadata = {
  title: "Club Documents & Policies | Roskilde Cricket Club",
  description:
    "Official club bylaws (vedtægter), child-safety guidelines (børneattest), and mandatory digital policy sign-offs.",
};

export default async function DocumentsPage() {
  const session = await requireActivatedSession();
  const targetProfileId = session.activeProfileId || session.memberProfileId;
  const isAdmin = session.roles.includes("ADMIN");

  const documents = await listClubDocuments({ targetProfileId });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="bg-card border rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                <FileText className="w-6 h-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-serif">
                Club Documents &amp; Governance
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Official Roskilde Cricket Club bylaws (*vedtægter*), child-safety guidelines (*børneattest*), and mandatory digital sign-offs ensuring compliance with Danish sports federation rules.
            </p>
          </div>

          {isAdmin && (
            <Link
              href="/admin/compliance"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border border-border transition-all self-start sm:self-auto"
            >
              <BarChart3 className="w-4 h-4 text-primary" />
              Compliance Audit Report
            </Link>
          )}
        </div>
      </div>

      {/* Document Library Repository */}
      <DocumentLibrary
        documents={documents}
        isAdmin={isAdmin}
        currentProfileId={targetProfileId}
      />
    </div>
  );
}
