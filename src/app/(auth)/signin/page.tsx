import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth-rbac/services/session-guard";
import { getDictionary } from "@/i18n/get-dictionary";
import { SignInForm } from "./signin-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign In | Roskilde Cricket Club",
  description: "Sign in to access your RCC member dashboard",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; from?: string; reason?: string }>;
}) {
  const params = await searchParams;

  // If already logged in, redirect straight to dashboard
  const session = await getCurrentSession();
  if (session) {
    redirect("/dashboard");
  }

  const dict = getDictionary("en");

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {dict.auth.title}
        </h1>
        <p className="text-sm text-slate-400">
          {dict.auth.subtitle}
        </p>
      </div>

      <SignInForm
        dict={dict}
        initialEmail={params.email || ""}
        fromPath={params.from || "/dashboard"}
        reason={params.reason}
      />
    </div>
  );
}
