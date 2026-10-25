"use client";

import { useActionState, useState } from "react";
import { executeAnonymizationAction, GdprActionState } from "@/modules/auth-rbac/actions/gdpr.actions";
import { DeletionRequestItem } from "@/modules/auth-rbac/services/gdpr-deletion.service";
import {
  ShieldAlert,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserX,
  Search,
  AlertTriangle,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminGdprClientProps {
  pendingRequests: DeletionRequestItem[];
  allActiveMembers: { id: string; fullName: string; email: string | null; roles: string[] }[];
  anonymizedShells: { id: string; fullName: string; updatedAt: string }[];
}

export function AdminGdprClient({
  pendingRequests,
  allActiveMembers,
  anonymizedShells,
}: AdminGdprClientProps) {
  const [state, formAction, isPending] = useActionState<GdprActionState | null, FormData>(
    executeAnonymizationAction,
    null
  );

  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string } | null>(null);
  const [searchMemberQuery, setSearchMemberQuery] = useState("");

  const filteredMembers = allActiveMembers.filter(
    (m) =>
      m.fullName.toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
      (m.email && m.email.toLowerCase().includes(searchMemberQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Notifications */}
      {state?.success && (
        <div
          role="status"
          className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/80 text-emerald-300 flex items-center gap-3 text-sm shadow-md"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{state.message}</span>
        </div>
      )}

      {state?.error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-950/60 border border-red-700/80 text-red-300 flex items-center gap-3 text-sm shadow-md"
        >
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Section 1: Pending Deletion Requests (FR-074) */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-rose-400">
            <Clock className="w-5 h-5" />
            <h2 className="text-lg font-bold text-white">Pending Deletion &amp; Erasure Requests</h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950 border border-rose-800 text-rose-300">
            {pendingRequests.filter((r) => !r.isAlreadyAnonymized).length} Pending
          </span>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs italic">
            No pending GDPR deletion requests in queue.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{req.targetName}</span>
                    {req.isAlreadyAnonymized && (
                      <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                        Already Anonymized
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Requested by <strong className="text-slate-300">{req.requesterName}</strong> on{" "}
                    {new Date(req.requestedAt).toLocaleDateString()}
                  </p>
                  {req.reason && (
                    <p className="text-xs text-slate-500 italic mt-1 bg-slate-800/40 px-2.5 py-1 rounded w-fit">
                      &quot;{req.reason}&quot;
                    </p>
                  )}
                </div>

                {!req.isAlreadyAnonymized && (
                  <Button
                    type="button"
                    onClick={() => setConfirmTarget({ id: req.targetProfileId, name: req.targetName })}
                    variant="destructive"
                    size="sm"
                    className="bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-bold h-8 shrink-0"
                  >
                    Approve &amp; Anonymize
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Quick Anonymize Active Member */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 text-amber-400">
          <UserX className="w-5 h-5" />
          <h2 className="text-lg font-bold text-white">Execute Immediate Erasure (Right to be Forgotten)</h2>
        </div>

        <p className="text-xs text-slate-300">
          Search for any member who has resigned or withdrawn consent to purge their personal details and convert their profile into a statistical shell.
        </p>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchMemberQuery}
            onChange={(e) => setSearchMemberQuery(e.target.value)}
            placeholder="Search active member by name or email..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {searchMemberQuery && (
          <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 divide-y divide-slate-800/80 bg-slate-950/60">
            {filteredMembers.length === 0 ? (
              <div className="p-3 text-xs text-slate-500 text-center">No matching members found</div>
            ) : (
              filteredMembers.slice(0, 5).map((m) => (
                <div key={m.id} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white">{m.fullName}</span>
                    <span className="text-slate-400 ml-2">({m.email || "No email"})</span>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setConfirmTarget({ id: m.id, name: m.fullName })}
                    size="sm"
                    variant="destructive"
                    className="h-7 text-[11px] bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 font-bold"
                  >
                    Anonymize
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Section 3: Anonymized Shell History */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 text-slate-400">
          <History className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-bold text-white">Anonymized Statistical Shell Records ({anonymizedShells.length})</h2>
        </div>

        <p className="text-xs text-slate-400">
          These profiles have had all PII permanently scrubbed. Their shell record is retained indefinitely to maintain immutable match scores, wickets, runs, and audit integrity (FR-074).
        </p>

        {anonymizedShells.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs italic">
            No anonymized shell records in club database.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {anonymizedShells.map((shell) => (
              <div
                key={shell.id}
                className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/80 text-xs space-y-1"
              >
                <span className="font-bold text-slate-200 block">{shell.fullName}</span>
                <span className="text-[10px] font-mono text-slate-500 block truncate">
                  ID: {shell.id}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium block">
                  Scrubbed: {new Date(shell.updatedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {confirmTarget && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-400">
              <ShieldAlert className="w-7 h-7 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-white">Irreversible Anonymization</h3>
                <p className="text-xs text-red-300">GDPR Article 17 Execution</p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-800/80 text-xs text-red-200 space-y-2 leading-relaxed">
              <p>
                You are about to permanently anonymize <strong>{confirmTarget.name}</strong>.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-red-300">
                <li>All personal names, email, phone, address, and DOB will be permanently wiped.</li>
                <li>Login credentials and active sessions will be terminated immediately.</li>
                <li>All parent-child links will be severed.</li>
                <li>The record will be transformed into &quot;Former Member #...&quot;.</li>
              </ul>
              <p className="font-bold text-white">This action CANNOT be undone.</p>
            </div>

            <form action={formAction} className="flex items-center justify-end gap-3 pt-2">
              <input type="hidden" name="targetProfileId" value={confirmTarget.id} />
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmTarget(null)}
                className="border-slate-700 bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs h-9 px-4"
              >
                {isPending ? "Anonymizing..." : "Yes, Purge and Anonymize"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
