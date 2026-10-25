"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/modules/auth-rbac/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import type { Dictionary } from "@/i18n/get-dictionary";

interface ForgotPasswordFormProps {
  dict: Dictionary;
}

export function ForgotPasswordForm({ dict }: ForgotPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    null
  );
  const emailId = useId();

  if (state?.success) {
    return (
      <div className="space-y-6">
        <div
          role="status"
          className="p-5 rounded-xl bg-[#0c2340]/90 border border-sky-500/40 text-slate-200 text-sm space-y-3"
        >
          <div className="flex items-center gap-3 text-sky-400 font-semibold text-base">
            <CheckCircle2 className="w-6 h-6 shrink-0 text-sky-400" />
            <span>{dict.auth.resetLinkSentTitle || "Check Your Inbox"}</span>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">
            {dict.auth.resetLinkSentBody ||
              "If an account exists with that email address, we have sent instructions to reset your password. The link will expire in 1 hour."}
          </p>
        </div>

        <div className="pt-2 text-center">
          <Link
            href="/signin"
            className="inline-flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {dict.auth.backToSignIn || "Back to Sign In"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">
            {state.error === "auth.errors.invalidCredentials"
              ? "Please enter a valid email address."
              : dict.auth.errors.genericError}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={emailId} className="text-slate-200 text-sm font-medium">
          {dict.auth.emailLabel}
        </Label>
        <Input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="navn@eksempel.dk"
          className="bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-sky-500 h-11"
        />
        <p className="text-xs text-slate-400 leading-normal">
          We will send a single-use password reset link valid for 1 hour.
        </p>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-11 bg-sky-500 hover:bg-sky-400 text-white font-semibold transition-all shadow-md shadow-sky-950/40 text-base"
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {dict.common.submitting}
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            {dict.auth.sendResetLink || "Send Password Reset Link"}
          </span>
        )}
      </Button>

      <div className="text-center pt-2">
        <Link
          href="/signin"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {dict.auth.backToSignIn || "Back to Sign In"}
        </Link>
      </div>
    </form>
  );
}
