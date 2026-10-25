"use client";

import { useActionState, useId } from "react";
import { consentAction } from "@/modules/auth-rbac/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ShieldCheck, AlertCircle } from "lucide-react";
import type { Dictionary } from "@/i18n/get-dictionary";

interface GdprConsentGateProps {
  dict: Dictionary;
  policyVersion: string;
}

export function GdprConsentGate({ dict, policyVersion }: GdprConsentGateProps) {
  const [state, formAction, isPending] = useActionState(consentAction, null);
  const checkboxId = useId();

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">
            {dict.auth.errors.consentRequired}
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
        <p className="text-sm text-slate-300 leading-relaxed">
          {dict.auth.gdprConsentBody}
        </p>
        <p className="text-xs text-slate-500">
          Roskilde Cricket Club (CVR: RCC-1996) &bull; GDPR Data Controller
        </p>
      </div>

      <div className="flex items-start gap-3 p-2">
        <Checkbox
          id={checkboxId}
          name="accepted"
          required
          className="mt-1 border-slate-600 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
        />
        <Label
          htmlFor={checkboxId}
          className="text-xs sm:text-sm text-slate-300 font-normal leading-snug cursor-pointer select-none"
        >
          {dict.auth.gdprConsentCheckbox}
        </Label>
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
            <ShieldCheck className="w-4 h-4" />
            {dict.auth.gdprConsentButton}
          </span>
        )}
      </Button>
    </form>
  );
}
