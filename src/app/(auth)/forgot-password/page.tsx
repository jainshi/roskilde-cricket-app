import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth-rbac/services/session-guard";
import { getDictionary } from "@/i18n/get-dictionary";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: "Forgot Password | Roskilde Cricket Club",
  description: "Request a password reset link for your Roskilde Cricket Club account",
};

export default async function ForgotPasswordPage() {
  const session = await getCurrentSession();
  if (session) {
    redirect("/dashboard");
  }

  const dict = getDictionary("en");

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {dict.auth.forgotPasswordTitle || "Forgot Password"}
        </h1>
        <p className="text-sm text-slate-400">
          {dict.auth.forgotPasswordSubtitle ||
            "Enter your email address to receive a secure password reset link"}
        </p>
      </div>

      <ForgotPasswordForm dict={dict} />
    </div>
  );
}
