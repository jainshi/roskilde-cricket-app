import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { SecurityClient } from "./security-client";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata = {
  title: "Account Security | Roskilde Cricket Club",
  description: "Change password, manage active device sessions, and sign out everywhere",
};

export default async function SecurityPage() {
  await requireActivatedSession();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
        <Link
          href="/profile"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Return to Profile"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-sky-400" />
            <span>Account Security &amp; Credentials</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Update your password and terminate active sessions across devices
          </p>
        </div>
      </div>

      <SecurityClient />
    </div>
  );
}
