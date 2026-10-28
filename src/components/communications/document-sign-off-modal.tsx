"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  FileText,
  ExternalLink,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
  FileCheck2,
} from "lucide-react";
import { signOffDocumentAction } from "@/modules/communications/actions/document.actions";

export interface SignOffDocumentTarget {
  id: string;
  title: string;
  category: string;
  version: string;
  contentMarkdown?: string | null;
  fileUrl?: string | null;
  targetRole?: string | null;
}

interface DocumentSignOffModalProps {
  document: SignOffDocumentTarget | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  targetProfileId?: string;
}

export function DocumentSignOffModal({
  document,
  isOpen,
  onClose,
  onSuccess,
  targetProfileId,
}: DocumentSignOffModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !document) return null;

  const handleSignOff = () => {
    setError(null);

    startTransition(async () => {
      const res = await signOffDocumentAction({
        documentId: document.id,
        versionSigned: document.version,
        targetProfileId,
      });

      if (!res.success) {
        setError(res.error || "Failed to record digital policy sign-off.");
        return;
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                  {document.category.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Version {document.version}
                </span>
                {document.targetRole && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    Required for {document.targetRole}s
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-foreground mt-1">
                {document.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Policy Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-foreground/90 leading-relaxed bg-muted/30 p-4 rounded-2xl border border-border/80">
          {document.contentMarkdown ? (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-sans">
              {document.contentMarkdown}
            </div>
          ) : (
            <p className="text-muted-foreground italic text-center py-8">
              No inlined text preview available for this document.
            </p>
          )}

          {document.fileUrl && (
            <div className="pt-3 border-t border-border">
              <a
                href={document.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Download Official Document PDF
              </a>
            </div>
          )}
        </div>

        {/* Statutory Audit Notice & 1-Click Sign Button */}
        <div className="space-y-3 shrink-0 pt-2 border-t">
          <div className="bg-muted/60 border border-border rounded-xl p-3 text-[11px] text-muted-foreground flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p>
              By clicking <strong>&quot;Confirm &amp; Sign (1-Click)&quot;</strong>, you digitally certify that you have read, understood, and agreed to adhere to this club governance policy under Danish Sports Federation guidelines. Your signature is recorded with an immutable timestamp and audit trail.
            </p>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSignOff}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/30 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Confirm &amp; Sign (1-Click)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
