import { notFound, redirect } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getMemberFullProfile } from "@/modules/auth-rbac/services/profile.service";
import { ProfileEditForm } from "./profile-edit-form";
import Link from "next/link";
import { ArrowLeft, UserCircle, Shield, Calendar, Users } from "lucide-react";

export const metadata = {
  title: "Member Profile | Roskilde Cricket Club",
  description: "Manage member cricket details, emergency contact, kit sizes, and directory privacy",
};

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberProfilePage({ params }: ProfilePageProps) {
  const session = await requireActivatedSession();
  const { id } = await params;

  const profile = await getMemberFullProfile(id, session.memberProfileId);

  if (!profile) {
    notFound();
  }

  const isSelf = session.memberProfileId === profile.id;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Navigation / Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-4">
          <Link
            href="/directory"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Return to Member Directory"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {profile.fullName}
              </h1>
              {profile.isMinor ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-950 border border-sky-800 text-sky-300">
                  {profile.category === "YOUTH_UNDER_13" ? "Youth U13" : "Youth 13–17"}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 border border-emerald-800 text-emerald-300">
                  Adult Member
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <span className="font-mono text-sky-400">
                {profile.roles.join(" • ")}
              </span>
              {isSelf && <span className="text-slate-500">&bull; Your Profile</span>}
            </p>
          </div>
        </div>

        {/* Action Links */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
          <Link
            href="/profile/security"
            className="text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-3 py-1.5 rounded-lg border border-slate-700 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span>Security</span>
          </Link>
          <Link
            href="/profile/privacy"
            className="text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-3 py-1.5 rounded-lg border border-slate-700 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Privacy &amp; GDPR</span>
          </Link>
          {session.roles.includes("ADMIN") && (
            <Link
              href="/admin/members"
              className="text-xs text-sky-400 hover:text-sky-300 bg-sky-950/60 px-3 py-1.5 rounded-lg border border-sky-800/60 font-semibold flex items-center gap-1.5"
            >
              <span>Admin Roster</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Profile Edit Form */}
      <ProfileEditForm profile={profile} currentUserId={session.memberProfileId} />
    </div>
  );
}
