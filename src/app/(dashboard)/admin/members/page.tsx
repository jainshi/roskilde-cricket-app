import { requireAdminSession } from "@/modules/auth-rbac/services/session-guard";
import { getDictionary } from "@/i18n/get-dictionary";
import { getAllMembersForAdmin } from "@/modules/auth-rbac/services/member-admin.service";
import Link from "next/link";
import {
  UserPlus,
  Users,
  Search,
  Shield,
  Key,
  Mail,
  Phone,
  UserCheck,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "All Members | Roskilde Cricket Club",
  description: "Club administration - Member management and profile directory",
};

export default async function AdminMembersPage() {
  await requireAdminSession();
  const dict = getDictionary("en");
  const members = await getAllMembersForAdmin();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-sky-400" />
            <span>Club Members Administration</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage player rosters, coach/parent profiles, credentials, and parent-child linkages ({members.length} registered members)
          </p>
        </div>

        <Link href="/admin/members/new">
          <Button className="bg-sky-500 hover:bg-sky-400 text-white font-semibold flex items-center gap-2 shadow-lg shadow-sky-950/40 h-11 px-5">
            <UserPlus className="w-4 h-4" />
            <span>{dict.dashboard.onboardMember}</span>
          </Button>
        </Link>
      </div>

      {/* Members Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-md">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-[#0c2340]/60 text-xs uppercase font-semibold text-sky-300 tracking-wider">
              <th className="py-3.5 px-4">Member Name</th>
              <th className="py-3.5 px-4">Roles</th>
              <th className="py-3.5 px-4">Category / Age</th>
              <th className="py-3.5 px-4">Contact Details</th>
              <th className="py-3.5 px-4">Account / Login</th>
              <th className="py-3.5 px-4">Family Links</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200">
            {members.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500">
                  No members registered yet.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  {/* Name */}
                  <td className="py-4 px-4 font-semibold text-white whitespace-nowrap">
                    <div>{member.fullName}</div>
                    <div className="text-[11px] font-mono text-slate-500">
                      ID: {member.id.substring(0, 8)}...
                    </div>
                  </td>

                  {/* Roles */}
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap gap-1.5">
                      {member.roles.map((r) => (
                        <span
                          key={r}
                          className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-950/70 border border-sky-600/50 text-sky-300 whitespace-nowrap"
                        >
                          {dict.roles[r] || r}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Category / Age */}
                  <td className="py-4 px-4 text-xs whitespace-nowrap">
                    {member.category === "ADULT" ? (
                      <span className="inline-flex items-center gap-1.5 text-slate-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Adult {member.age !== null ? `(${member.age} yrs)` : ""}
                      </span>
                    ) : member.category === "YOUTH_13_17" ? (
                      <span className="inline-flex items-center gap-1.5 text-sky-300">
                        <span className="w-2 h-2 rounded-full bg-sky-400" />
                        Youth (13–17, age {member.age})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-amber-300">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        Youth (Under 13, age {member.age})
                      </span>
                    )}
                  </td>

                  {/* Contact */}
                  <td className="py-4 px-4 text-xs">
                    <div className="space-y-0.5">
                      {member.effectiveContactEmail ? (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{member.effectiveContactEmail}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No email</span>
                      )}
                      {member.effectiveContactPhone && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{member.effectiveContactPhone}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Account Status */}
                  <td className="py-4 px-4 text-xs whitespace-nowrap">
                    {member.accountStatus === "NO_ACCOUNT" ? (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                        No Login
                      </span>
                    ) : member.accountStatus === "INVITED" || member.mustResetPassword ? (
                      <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800 text-amber-300 font-medium flex items-center gap-1 w-fit">
                        <Key className="w-3 h-3" />
                        Pending Reset
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-medium flex items-center gap-1 w-fit">
                        <UserCheck className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </td>

                  {/* Family Links */}
                  <td className="py-4 px-4 text-xs">
                    {member.linkedParents.length > 0 && (
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Parents ({member.linkedParents.length}):
                        </span>
                        {member.linkedParents.map((p) => (
                          <div key={p.id} className="text-sky-300 font-medium">
                            &bull; {p.name} {p.relationship ? `(${p.relationship})` : ""}
                          </div>
                        ))}
                      </div>
                    )}
                    {member.linkedChildren.length > 0 && (
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Children ({member.linkedChildren.length}):
                        </span>
                        {member.linkedChildren.map((c) => (
                          <div key={c.id} className="text-amber-300 font-medium">
                            &bull; {c.name}
                          </div>
                        ))}
                      </div>
                    )}
                    {member.linkedParents.length === 0 && member.linkedChildren.length === 0 && (
                      <span className="text-slate-500 italic">None</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
