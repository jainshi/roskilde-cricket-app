"use client";

import { useActionState, useState, useId } from "react";
import { resetPasswordAction } from "@/modules/auth-rbac/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, Lock, AlertCircle, ShieldAlert } from "lucide-react";
import { PASSWORD_RULES, PasswordRule } from "@/modules/auth-rbac/domain/password-rules";
import type { Dictionary } from "@/i18n/get-dictionary";

interface ResetPasswordFormProps {
  dict: Dictionary;
}

export function ResetPasswordForm({ dict }: ResetPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, null);
  const [password, setPassword] = useState("");
  const passwordId = useId();
  const confirmPasswordId = useId();

  // Real-time client-side rule validation
  const ruleStatus: Record<PasswordRule, boolean> = {
    MIN_LENGTH: password.length >= 8,
    UPPERCASE: /[A-Z]/.test(password),
    LOWERCASE: /[a-z]/.test(password),
    DIGIT: /[0-9]/.test(password),
    SYMBOL: /[^A-Za-z0-9]/.test(password),
  };

  return (
    <form action={formAction} className="space-y-6">
      {/* Notice box indicating temporary password needs reset */}
      <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/80 text-amber-200 text-sm flex items-start gap-2.5">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <span className="leading-snug">{dict.auth.temporaryPasswordNotice}</span>
      </div>

      {state?.error && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">
            {state.error === "auth.errors.sameAsCurrentPassword"
              ? dict.auth.errors.sameAsCurrentPassword
              : dict.auth.errors.genericError}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={passwordId} className="text-slate-200 text-sm font-medium">
          {dict.auth.newPasswordLabel}
        </Label>
        <Input
          id={passwordId}
          name="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          className="bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-sky-500 h-11"
        />
      </div>

      {/* Real-time Checklist */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
          {dict.auth.passwordRules.title}
        </span>
        <div className="grid grid-cols-1 gap-2 text-xs">
          {PASSWORD_RULES.map((rule) => {
            const satisfied = ruleStatus[rule];
            return (
              <div
                key={rule}
                className={`flex items-center gap-2 transition-colors ${
                  satisfied ? "text-emerald-400 font-medium" : "text-slate-400"
                }`}
              >
                {satisfied ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-slate-600 shrink-0" />
                )}
                <span>{dict.auth.passwordRules[rule]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={confirmPasswordId} className="text-slate-200 text-sm font-medium">
          {dict.auth.confirmPasswordLabel}
        </Label>
        <Input
          id={confirmPasswordId}
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className="bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-sky-500 h-11"
        />
        {state?.fieldErrors?.confirmPassword && (
          <p className="text-xs text-rose-400 font-medium mt-1">
            {dict.auth.errors.passwordsDoNotMatch}
          </p>
        )}
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
            <Lock className="w-4 h-4" />
            {dict.auth.setPasswordButton}
          </span>
        )}
      </Button>
    </form>
  );
}
