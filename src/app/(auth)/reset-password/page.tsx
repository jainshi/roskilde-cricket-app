import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/modules/auth-rbac/services/session-guard";
import { validatePasswordResetToken } from "@/modules/auth-rbac/services/auth.service";
import { getDictionary } from "@/i18n/get-dictionary";
import { ResetPasswordForm } from "./reset-password-form";
import { AlertCircle, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Reset Password | Roskilde Cricket Club",
  description: "Reset your password for Roskilde Cricket Club",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const dict = getDictionary("en");

  // 1. Token-based self-service reset flow
  if (params.token) {
    const tokenValidation = await validatePasswordResetToken(params.token);

    if (!tokenValidation.valid) {
      return (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#0c2340]/90 border border-rose-800/80 text-rose-200 text-sm space-y-3">
            <div className="flex items-center gap-2.5 text-rose-400 font-semibold text-base">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>
                {dict.auth.tokenInvalidTitle || "Invalid or Expired Link"}
              </span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              {dict.auth.tokenInvalidBody ||
                "This password reset link is invalid, expired, or has already been used. Please request a new link."}
            </p>
          </div>

          <div className="flex flex-col gap-3 items-center text-center">
            <Link
              href="/forgot-password"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold transition-colors shadow-sm w-full"
            >
              {dict.auth.requestNewLink || "Request New Reset Link"}
            </Link>
            <Link
              href="/signin"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {dict.auth.backToSignIn || "Back to Sign In"}
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {dict.auth.tokenResetTitle || "Set New Password"}
          </h1>
          <p className="text-sm text-slate-400">
            {dict.auth.tokenResetSubtitle ||
              "Choose a strong password to regain access to your RCC account"}
          </p>
        </div>

        <ResetPasswordForm
          dict={dict}
          token={params.token}
          email={tokenValidation.email}
        />
      </div>
    );
  }

  // 2. Session-based mandatory initial password reset
  const session = await requireSession();

  // If already reset, route to dashboard
  if (!session.mustResetPassword) {
    redirect("/dashboard");
  }

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
