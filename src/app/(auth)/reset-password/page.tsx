import { redirect } from "next/navigation";
import { requireSession } from "@/modules/auth-rbac/services/session-guard";
import { getDictionary } from "@/i18n/get-dictionary";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "Reset Password | Roskilde Cricket Club",
  description: "Mandatory initial password reset for club members",
};

export default async function ResetPasswordPage() {
  const session = await requireSession();

  // If the user already reset their password, route them to consent or dashboard
  if (!session.mustResetPassword) {
    redirect("/dashboard");
  }

  const dict = getDictionary("en");

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {dict.auth.resetPasswordTitle}
        </h1>
        <p className="text-sm text-slate-400">
          {dict.auth.resetPasswordSubtitle}
        </p>
      </div>

      <ResetPasswordForm dict={dict} />
    </div>
  );
}
