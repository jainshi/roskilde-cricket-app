import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/modules/auth-rbac/services/auth-guard";
import { getParentChildLinksForPlayer } from "@/modules/auth-rbac/services/parent-child.service";
import { isMinor } from "@/modules/auth-rbac/domain/age-rules";
import { ParentChildLinksForm } from "./links-form";
import { ArrowLeft, UserX, ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Parent Links | Roskilde Cricket Club",
  description: "Manage linked parents and guardians for youth players",
};

interface LinksPageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberLinksPage({ params }: LinksPageProps) {
  // Enforce server-side RBAC guard (FR-031)
  await requirePermission("PARENT_CHILD_MANAGE_LINKS");

  const { id } = await params;

  const player = await prisma.memberProfile.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
    },
  });

  if (!player) {
    notFound();
  }

  const playerIsMinor = isMinor(player.dateOfBirth);

  // If member is an Adult, they manage their own profile with 0 parent links (FR-030)
  if (!playerIsMinor) {
    return (
      <div className="py-6 px-4 sm:px-6 max-w-2xl mx-auto space-y-6">
        <Link
          href="/admin/members"
          className="inline-flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Member Directory
        </Link>

        <div className="bg-[#0c2340] border border-slate-700 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-amber-400">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <h1 className="text-xl font-bold text-white">
              Adult Member &bull; {player.firstName} {player.lastName}
            </h1>
          </div>

          <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-800/80 text-amber-200 text-sm space-y-2">
            <p className="font-semibold text-amber-300">
              No Parent/Guardian Links Permitted (FR-030)
            </p>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              Adult and Senior members (age 18+) manage their own profiles, privacy settings, and login credentials independently. Parent/guardian links can only be assigned to Youth players under 18 years of age.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/admin/members"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition-colors"
            >
              Return to All Members
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const links = await getParentChildLinksForPlayer(id);

  // Query candidate adult members (minors strictly excluded per FR-004, FR-030)
  const candidateMembers = await prisma.memberProfile.findMany({
    where: {
      isAnonymized: false,
      id: { not: id },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      dateOfBirth: true,
    },
    orderBy: { firstName: "asc" },
  });

  // Filter to only adult members
  const candidateParents = candidateMembers
    .filter((cp) => !isMinor(cp.dateOfBirth))
    .map((cp) => ({
      id: cp.id,
      name: `${cp.firstName} ${cp.lastName}`.trim(),
      email: cp.email,
    }));

  return (
    <div className="py-6 px-4 sm:px-6">
      <ParentChildLinksForm
        player={{
          id: player.id,
          name: `${player.firstName} ${player.lastName}`.trim(),
          dateOfBirth: player.dateOfBirth?.toISOString() || null,
          isMinor: true,
        }}
        links={links}
        candidateParents={candidateParents}
      />
    </div>
  );
}
