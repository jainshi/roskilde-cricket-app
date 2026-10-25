"use client";

import { useState } from "react";
import Link from "next/link";
import {
  adminResetMemberPasswordAction,
  adminProvisionLoginAction,
  AdminPasswordActionState,
} from "@/modules/auth-rbac/actions/admin-password.actions";
import {
  Shield,
  KeyRound,
  UserPlus,
  Users,
  Copy,
  Check,
  AlertCircle,
  X,
  Lock,
} from "lucide-react";

interface MemberActionCellProps {
  memberId: string;
  memberName: string;
  memberEmail: string | null;
  hasAccount: boolean;
  canCreateLogin: boolean;
  isMinor: boolean;
}

export function MemberActionCell({
  memberId,
  memberName,
  memberEmail,
  hasAccount,
  canCreateLogin,
  isMinor,
}: MemberActionCellProps) {
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isCreateLoginOpen, setIsCreateLoginOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState(memberEmail || "");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<AdminPasswordActionState | null>(null);
  const [copied, setCopied] = useState(false);

  const handleResetPassword = async () => {
    setIsPending(true);
    setError(null);
    try {
      const res = await adminResetMemberPasswordAction(memberId);
      if (res.success) {
        setIsResetConfirmOpen(false);
        setResultModal(res);
      } else {
        setError(res.error || "Failed to reset password.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error executing reset.");
    } finally {
      setIsPending(false);
    }
  };

  const handleCreateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    try {
      const res = await adminProvisionLoginAction(memberId, createEmail);
      if (res.success) {
        setIsCreateLoginOpen(false);
        setResultModal(res);
      } else {
        setError(res.error || "Failed to provision login.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error provisioning login.");
    } finally {
      setIsPending(false);
    }
  };

  const handleCopy = () => {
    if (resultModal?.temporaryPassword) {
      navigator.clipboard.writeText(resultModal.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {/* Manage Roles button */}
        <Link
          href={`/admin/members/${memberId}/roles`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/70 border border-sky-600/50 hover:bg-sky-900/80 text-sky-300 text-xs font-semibold transition-colors shadow-sm"
          title="Manage member roles and permissions"
        >
          <Shield className="w-3.5 h-3.5 text-sky-400" />
          Roles
        </Link>

        {/* Manage Parent-Child Links button: ONLY for youth/minor profiles (FR-030) */}
        {isMinor && (
          <Link
            href={`/admin/members/${memberId}/links`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/70 border border-sky-600/50 hover:bg-sky-900/80 text-sky-300 text-xs font-semibold transition-colors shadow-sm"
            title="Manage parent-child links for youth player"
          >
            <Users className="w-3.5 h-3.5 text-sky-400" />
            Links
          </Link>
        )}

        {/* Reset Password button (for existing accounts) */}
        {hasAccount && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIsResetConfirmOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-semibold transition-colors shadow-sm"
            title="Reset password and issue fresh temporary credentials"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            Reset Password
          </button>
        )}

        {/* Create Login button (for 13+ members without account) */}
        {!hasAccount && canCreateLogin && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setCreateEmail(memberEmail || "");
              setIsCreateLoginOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 text-xs font-semibold transition-colors shadow-sm"
            title="Provision portal login credentials"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            Create Login
          </button>
        )}
      </div>

      {/* Confirmation Modal: Reset Password */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0c2340] border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                Reset Temporary Password
              </h3>
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to reset credentials for{" "}
              <strong className="text-white">{memberName}</strong>?
            </p>

            <div className="text-xs text-slate-400 bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <p className="font-semibold text-slate-300">&bull; Actions performed:</p>
              <p>&bull; Generates a fresh 6-8 char temporary password (expires in 7 days).</p>
              <p>&bull; Revokes all active sessions everywhere across all devices.</p>
              <p>&bull; Enforces mandatory password change on initial sign-in.</p>
              <p>&bull; Dispatches credentials email via club notification channel.</p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                disabled={isPending}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <span>Confirm Password Reset</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Login for member */}
      {isCreateLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleCreateLogin}
            className="bg-[#0c2340] border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl text-left space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                Provision Login Account
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateLoginOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300">
              Create portal credentials for{" "}
              <strong className="text-white">{memberName}</strong>:
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Email Address (Login Username)
              </label>
              <input
                type="email"
                required
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="member@example.dk"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateLoginOpen(false)}
                disabled={isPending}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Provisioning...</span>
                  </>
                ) : (
                  <span>Create Credentials</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Success Modal: Display Generated Temporary Password */}
      {resultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0c2340] border border-sky-500/50 rounded-xl max-w-lg w-full p-6 shadow-2xl text-left space-y-5">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Lock className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white">Credentials Generated</h3>
              </div>
              <button
                type="button"
                onClick={() => setResultModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300">
              New temporary login credentials generated for{" "}
              <strong className="text-white">{resultModal.memberName}</strong>:
            </p>

            <div className="bg-slate-900 border border-sky-500/30 rounded-xl p-4 space-y-2">
              <div className="text-xs text-slate-400">
                Email: <span className="text-white font-mono">{resultModal.email}</span>
              </div>
              <div className="flex items-center justify-between gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <code className="text-xl font-mono font-bold text-sky-400 tracking-wider">
                  {resultModal.temporaryPassword}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-950 border border-sky-600/50 text-sky-300 hover:bg-sky-900 text-xs font-semibold transition-colors shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-sky-950/50 border border-sky-800/60 text-sky-200 text-xs space-y-1">
              <p className="font-semibold text-sky-300">Notice:</p>
              <p>
                An invitation email has been dispatched to <strong>{resultModal.email}</strong>.
              </p>
              <p>
                This temporary password will expire in 7 days. The user must set their own password upon first sign-in.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setResultModal(null)}
                className="px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Close & Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
