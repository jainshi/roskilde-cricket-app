"use client";

import { useActionState, useId } from "react";
import { signInAction } from "@/modules/auth-rbac/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, AlertCircle } from "lucide-react";
import type { Dictionary } from "@/i18n/get-dictionary";

interface SignInFormProps {
  dict: Dictionary;
  initialEmail?: string;
  fromPath?: string;
}

export function SignInForm({ dict, initialEmail = "", fromPath = "/dashboard" }: SignInFormProps) {
  const [state, formAction, isPending] = useActionState(signInAction, null);
  const emailId = useId();
  const passwordId = useId();

  // Resolve error text from dictionary if key matches
  let errorMessage: string | null = null;
  if (state?.error) {
    if (state.error === "auth.errors.invalidCredentials") {
      errorMessage = dict.auth.errors.invalidCredentials;
    } else if (state.error === "auth.errors.accountLocked") {
      errorMessage = dict.auth.errors.accountLocked;
    } else if (state.error === "auth.errors.invitationExpired") {
      errorMessage = dict.auth.errors.invitationExpired;
    } else if (state.error === "auth.errors.accountDeactivated") {
      errorMessage = dict.auth.errors.accountDeactivated;
    } else {
      errorMessage = dict.auth.errors.genericError;
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="from" value={fromPath} />

      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-sm flex items-start gap-2.5 animate-in fade-in duration-200"
        >
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">{errorMessage}</div>
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
          defaultValue={initialEmail}
          placeholder="navn@eksempel.dk"
          className="bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-sky-500 h-11"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={passwordId} className="text-slate-200 text-sm font-medium">
            {dict.auth.passwordLabel}
          </Label>
        </div>
        <Input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-sky-500 h-11"
        />
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
            <LogIn className="w-4 h-4" />
            {dict.auth.submitSignIn}
          </span>
        )}
      </Button>
    </form>
  );
}
