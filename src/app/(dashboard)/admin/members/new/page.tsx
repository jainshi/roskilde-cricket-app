import { requireAdminSession } from "@/modules/auth-rbac/services/session-guard";
import { getDictionary } from "@/i18n/get-dictionary";
import { getAvailableParents } from "@/modules/auth-rbac/services/onboarding.service";
import { NewMemberForm } from "./new-member-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Onboard Member | Roskilde Cricket Club",
  description: "Register a new member and provision login credentials",
};

export default async function NewMemberPage() {
  await requireAdminSession();
  const dict = getDictionary("en");
  const availableParents = await getAvailableParents();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/members"
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {dict.admin.onboarding.title}
          </h1>
          <p className="text-sm text-slate-400">
            {dict.admin.onboarding.subtitle}
          </p>
        </div>
      </div>

      <NewMemberForm dict={dict} availableParents={availableParents} />
    </div>
  );
}
