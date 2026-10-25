import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getActiveContext } from "@/modules/auth-rbac/services/context.service";
import { getLinkedYouthForParent } from "@/modules/auth-rbac/services/parent-child.service";
import { prisma } from "@/lib/db";
import { CURRENT_PRIVACY_POLICY_VERSION } from "@/modules/auth-rbac/domain/activation";
import { PrivacyCenterClient } from "./privacy-center-client";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock } from "lucide-react";

export const metadata = {
  title: "Privacy & GDPR Rights | Roskilde Cricket Club",
  description: "Download data archive, manage GDPR consent, and request account erasure",
};

export default async function PrivacyCenterPage() {
  const session = await requireActivatedSession();
  const context = await getActiveContext();
  const linkedYouth = await getLinkedYouthForParent(session.memberProfileId);

  // Fetch current user's consent status
  const member = await prisma.memberProfile.findUnique({
    where: { id: session.memberProfileId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      consentsReceived: {
        where: { policyVersion: CURRENT_PRIVACY_POLICY_VERSION },
        orderBy: { consentedAt: "desc" },
        take: 1,
      },
    },
  });

  // Fetch consent status for all linked youth
  const youthConsentStatuses = await Promise.all(
    linkedYouth.map(async (y) => {
      const consents = await prisma.consentRecord.findMany({
        where: {
          subjectProfileId: y.playerId,
          policyVersion: CURRENT_PRIVACY_POLICY_VERSION,
        },
        orderBy: { consentedAt: "desc" },
        take: 1,
      });

      return {
        id: y.playerId,
        name: y.playerName,
        hasConsent: consents.length > 0,
        consentDate: consents[0]?.consentedAt.toISOString() || null,
      };
    })
  );

  const primaryConsent = member?.consentsReceived[0] || null;

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
            <ShieldCheck className="w-7 h-7 text-sky-400" />
            <span>GDPR Privacy &amp; Data Rights</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Data portability (Art. 20), consent lifecycle (Art. 7), and the Right to Erasure (Art. 17)
          </p>
        </div>
      </div>

      <PrivacyCenterClient
        member={{
          id: session.memberProfileId,
          fullName: `${session.firstName} ${session.lastName}`.trim(),
          email: session.email,
          hasConsent: !!primaryConsent,
          consentDate: primaryConsent?.consentedAt.toISOString() || null,
          policyVersion: CURRENT_PRIVACY_POLICY_VERSION,
        }}
        linkedYouth={youthConsentStatuses}
        activeProfileId={context?.activeProfileId || session.memberProfileId}
      />
    </div>
  );
}
