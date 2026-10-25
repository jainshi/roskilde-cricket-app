import { redirect } from "next/navigation";
import { requireSession } from "@/modules/auth-rbac/services/session-guard";
import { getActivationStepForProfile } from "@/modules/auth-rbac/services/auth.service";
import { CURRENT_PRIVACY_POLICY_VERSION } from "@/modules/auth-rbac/domain/activation";
import { getDictionary, formatMessage } from "@/i18n/get-dictionary";
import { GdprConsentGate } from "@/components/gdpr-consent-gate";
import { Users } from "lucide-react";

export const metadata = {
  title: "Privacy Consent | Roskilde Cricket Club",
  description: "GDPR privacy policy consent for club membership",
};

export default async function ConsentPage() {
  const session = await requireSession();

  // If still must reset password, force them to do that first
  if (session.mustResetPassword) {
    redirect("/reset-password");
  }

  const step = await getActivationStepForProfile({
    memberProfileId: session.memberProfileId,
    mustResetPassword: false,
  });

  // If consent already complete, route to dashboard
  if (step === "COMPLETE") {
    redirect("/dashboard");
  }

  const dict = getDictionary("en");

  // Minor account awaiting guardian consent
  if (step === "AWAITING_GUARDIAN_CONSENT") {
    return (
      <div className="space-y-6 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-950/60 border border-amber-800 text-amber-400 flex items-center justify-center mx-auto">
          <Users className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white">
            {dict.auth.minorAwaitingConsentTitle}
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            {dict.auth.minorAwaitingConsentBody}
          </p>
        </div>
        <div className="pt-2">
          <a
            href="/api/auth/signout"
            className="inline-block text-sm text-rose-400 hover:text-rose-300 underline underline-offset-4"
          >
            {dict.common.signOut}
          </a>
        </div>
      </div>
    );
  }

  const subtitle = formatMessage(dict.auth.gdprConsentSubtitle, {
    version: CURRENT_PRIVACY_POLICY_VERSION,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {dict.auth.gdprConsentTitle}
        </h1>
        <p className="text-sm text-slate-400">
          {subtitle}
        </p>
      </div>

      <GdprConsentGate dict={dict} policyVersion={CURRENT_PRIVACY_POLICY_VERSION} />
    </div>
  );
}
