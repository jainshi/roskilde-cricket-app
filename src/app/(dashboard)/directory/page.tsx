import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getDirectoryMembers } from "@/modules/auth-rbac/services/directory.service";
import { DirectoryBrowser } from "./directory-browser";
import { BookOpen, Users, Shield } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Member Directory | Roskilde Cricket Club",
  description: "Browse Roskilde Cricket Club members, cricket specializations, and player directory",
};

export default async function DirectoryPage() {
  const session = await requireActivatedSession();
  const members = await getDirectoryMembers(session.memberProfileId);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-sky-400" />
            <span>Club Member Directory</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse players, coaches, batting and bowling specializations across Roskilde Cricket Club
          </p>
        </div>

        {session.roles.includes("ADMIN") && (
          <Link
            href="/admin/members"
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1.5 self-start sm:self-center"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Roster &amp; Links</span>
          </Link>
        )}
      </div>

      {/* Directory Browser Component */}
      <DirectoryBrowser
        initialMembers={members}
        currentUserId={session.memberProfileId}
      />
    </div>
  );
}
