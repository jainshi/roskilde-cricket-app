import { requireAdminSession } from "@/modules/auth-rbac/services/session-guard";
import { getPendingDeletionRequests } from "@/modules/auth-rbac/services/gdpr-deletion.service";
import { prisma } from "@/lib/db";
import { AdminGdprClient } from "./admin-gdpr-client";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export const metadata = {
  title: "GDPR Compliance & Erasure | Roskilde Cricket Club",
  description: "Club administrator GDPR review, data export auditing, and account anonymization",
};

export default async function AdminGdprPage() {
  await requireAdminSession();

  const [pendingRequests, allActiveMembers, anonymizedShells] = await Promise.all([
    getPendingDeletionRequests(),
    prisma.memberProfile.findMany({
      where: { isAnonymized: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        roleAssignments: { select: { role: true } },
      },
      orderBy: { lastName: "asc" },
    }),
    prisma.memberProfile.findMany({
      where: { isAnonymized: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/members"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <ShieldAlert className="w-7 h-7 text-rose-500" />
              <span>GDPR Compliance &amp; Anonymization Console</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Review erasure requests (Art. 17), purge PII, and maintain statistical cricket shells
            </p>
          </div>
        </div>
      </div>

      <AdminGdprClient
        pendingRequests={pendingRequests}
        allActiveMembers={allActiveMembers.map((m) => ({
          id: m.id,
          fullName: `${m.firstName} ${m.lastName}`.trim(),
          email: m.email,
          roles: m.roleAssignments.map((ra) => ra.role),
        }))}
        anonymizedShells={anonymizedShells.map((s) => ({
          id: s.id,
          fullName: `${s.firstName} ${s.lastName}`.trim(),
          updatedAt: s.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
