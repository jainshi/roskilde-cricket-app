"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, X, ShieldAlert, FileCheck2 } from "lucide-react";
import { MemberComplianceEvaluation } from "@/modules/communications/domain/policy-compliance";
import { DocumentSignOffModal } from "./document-sign-off-modal";

interface PolicyWarningBannerProps {
  evaluation: MemberComplianceEvaluation;
  targetProfileId?: string;
  className?: string;
}

export function PolicyWarningBanner({
  evaluation,
  targetProfileId,
  className = "",
}: PolicyWarningBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [activeDocForModal, setActiveDocForModal] = useState<any | null>(null);

  if (isDismissed || !evaluation.shouldShowWarningBanner || evaluation.unsignedCount === 0) {
    return null;
  }

  const firstUnsignedDoc = evaluation.unsignedDocuments[0];

  return (
    <>
      <div
        className={`bg-amber-500/15 border border-amber-500/35 rounded-2xl p-4 sm:p-5 shadow-md flex items-start justify-between gap-3 animate-in fade-in transition-all ${className}`}
      >
        <div className="flex items-start gap-3.5">
          <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300">
                Mandatory Club Policy Acknowledgment
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-800 dark:text-amber-200">
                {evaluation.unsignedCount} Policy Pending
              </span>
            </div>

            <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed max-w-3xl">
              {evaluation.warningBannerMessage ||
                "One or more required club governance documents require your review and 1-click digital sign-off to ensure club compliance."}
            </p>

            <div className="pt-2 flex items-center gap-3 flex-wrap">
              {firstUnsignedDoc && (
                <button
                  onClick={() => setActiveDocForModal(firstUnsignedDoc)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  Review &amp; Sign {firstUnsignedDoc.title} (1-Click)
                </button>
              )}

              <Link
                href="/documents"
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 dark:text-amber-300 hover:underline"
              >
                <span>View All Policies</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Temporary Session Dismiss Button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-lg text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors shrink-0"
          title="Dismiss for this session"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 1-Click Sign-Off Modal */}
      {activeDocForModal && (
        <DocumentSignOffModal
          document={activeDocForModal}
          isOpen={Boolean(activeDocForModal)}
          onClose={() => setActiveDocForModal(null)}
          targetProfileId={targetProfileId}
        />
      )}
    </>
  );
}
