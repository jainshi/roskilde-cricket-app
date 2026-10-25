"use client";

import { useActionState, useState } from "react";
import {
  requestAccountDeletionAction,
  parentConsentForYouthAction,
  GdprActionState,
} from "@/modules/auth-rbac/actions/gdpr.actions";
import {
  ShieldCheck,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrivacyCenterProps {
  member: {
    id: string;
    fullName: string;
    email: string | null;
    hasConsent: boolean;
    consentDate: string | null;
    policyVersion: string;
  };
  linkedYouth: {
    id: string;
    name: string;
    hasConsent: boolean;
    consentDate: string | null;
  }[];
  activeProfileId: string;
}

export function PrivacyCenterClient({
  member,
  linkedYouth,
  activeProfileId,
}: PrivacyCenterProps) {
  const [deleteState, deleteAction, isDeletePending] = useActionState<
    GdprActionState | null,
    FormData
  >(requestAccountDeletionAction, null);

  const [consentState, consentAction, isConsentPending] = useActionState<
    GdprActionState | null,
    FormData
  >(parentConsentForYouthAction, null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState(activeProfileId || member.id);

  const currentTargetName =
    selectedTargetId === member.id
      ? member.fullName
      : linkedYouth.find((y) => y.id === selectedTargetId)?.name || member.fullName;

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {(deleteState?.success || consentState?.success) && (
        <div
          role="status"
          className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/80 text-emerald-300 flex items-center gap-3 text-sm shadow-md"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{deleteState?.message || consentState?.message}</span>
        </div>
      )}

      {(deleteState?.error || consentState?.error) && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-950/60 border border-red-700/80 text-red-300 flex items-center gap-3 text-sm shadow-md"
        >
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{deleteState?.error || consentState?.error}</span>
        </div>
      )}

      {/* Target Selector if parent has linked youth */}
      {linkedYouth.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <Users className="w-4 h-4 text-sky-400" />
            <span className="font-semibold">Managing GDPR rights for:</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTargetId(member.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedTargetId === member.id
                  ? "bg-sky-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {member.fullName} (Self)
            </button>
            {linkedYouth.map((y) => (
              <button
                key={y.id}
                onClick={() => setSelectedTargetId(y.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedTargetId === y.id
                    ? "bg-sky-500 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {y.name} (Youth)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Card 1: Article 15 & 20 - Data Portability / Download My Data */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 text-sky-400">
          <Download className="w-5 h-5" />
          <h2 className="text-lg font-bold text-white">Download Personal Data Archive (GDPR Art. 15 & 20)</h2>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          You are entitled to obtain a copy of all personal data held by Roskilde Cricket Club. This machine-readable JSON archive includes your contact details, club roles, cricket specializations, apparel sizes, emergency contacts, consent history, and audit records.
        </p>

        <div className="pt-2">
          <a
            href={`/api/gdpr/export?targetProfileId=${selectedTargetId}`}
            download
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-950/40 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Data Archive for {currentTargetName} (.JSON)</span>
          </a>
        </div>
      </div>

      {/* Card 2: Article 7 - GDPR Privacy Policy Consent */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
          <h2 className="text-lg font-bold text-white">Privacy Policy Consent Status</h2>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">
              RCC Privacy Notice &bull; Version {member.policyVersion}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {member.hasConsent
                ? `Consented on ${new Date(member.consentDate!).toLocaleDateString("da-DK", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}`
                : "Awaiting explicit consent"}
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 border border-emerald-800 text-emerald-300">
            Active Consent
          </span>
        </div>

        {/* Parental Consent for Linked Youth (FR-070) */}
        {linkedYouth.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Parental Guardian Consent for Linked Youth (FR-070)
            </h3>
            <div className="space-y-2">
              {linkedYouth.map((youth) => (
                <div
                  key={youth.id}
                  className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/80 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{youth.name}</p>
                    <p className="text-xs text-slate-400">
                      {youth.hasConsent
                        ? `Parental consent active (${new Date(youth.consentDate!).toLocaleDateString()})`
                        : "No guardian consent on file (Account shielded)"}
                    </p>
                  </div>

                  {youth.hasConsent ? (
                    <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-950 border border-emerald-800 text-emerald-300">
                      Consented
                    </span>
                  ) : (
                    <form action={consentAction}>
                      <input type="hidden" name="youthPlayerId" value={youth.id} />
                      <Button
                        type="submit"
                        disabled={isConsentPending}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold h-8"
                      >
                        Grant Guardian Consent
                      </Button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Card 3: Article 17 - Right to Erasure / Account Deletion (FR-074) */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 text-rose-400">
          <Trash2 className="w-5 h-5" />
          <h2 className="text-lg font-bold text-white">Account Deletion &amp; Right to Erasure (FR-074)</h2>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Under GDPR Article 17, you may request permanent deletion of your account. Upon review and execution by club administration, all personal identifiable information (name, email, phone, physical address, emergency contacts, date of birth) will be permanently purged and credentials revoked. An anonymized shell record (e.g. &quot;Former Member #123&quot;) is retained indefinitely to preserve historical cricket match statistics and immutable audit references.
        </p>

        <div className="pt-2">
          <Button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            variant="destructive"
            className="bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-bold h-10 px-5 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Request Account Deletion for {currentTargetName}</span>
          </Button>
        </div>
      </div>

      {/* Confirmation Modal for Deletion Request */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">
                Confirm Deletion Request &bull; {currentTargetName}
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to request deletion of this profile? This request will be submitted to Club Administrators. Once executed, your login account will be terminated, parent-child links severed, and personal details permanently scrubbed.
            </p>

            <form action={deleteAction} className="space-y-4">
              <input type="hidden" name="targetProfileId" value={selectedTargetId} />
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reason for Request (Optional)
                </label>
                <textarea
                  name="reason"
                  rows={3}
                  placeholder="e.g. Moving away from Roskilde, leaving cricket club..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="border-slate-700 bg-slate-800 text-slate-300 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isDeletePending}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-9 px-4"
                >
                  {isDeletePending ? "Submitting..." : "Submit Deletion Request"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
