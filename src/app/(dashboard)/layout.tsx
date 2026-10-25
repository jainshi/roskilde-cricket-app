import React from "react";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getActiveContext } from "@/modules/auth-rbac/services/context.service";
import { getLinkedYouthForParent } from "@/modules/auth-rbac/services/parent-child.service";
import { AppShell } from "@/components/navigation/app-shell";
import { switchContextAction } from "@/modules/auth-rbac/actions/context.actions";
import { ArrowRightLeft } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireActivatedSession();
  const isAdmin = session.roles.includes("ADMIN");
  const isOfficial = session.roles.some(
    (r) => r === "ADMIN" || r === "COACH" || r === "AD_HOC_COACH"
  );

  const [context, linkedYouth] = await Promise.all([
    getActiveContext(),
    getLinkedYouthForParent(session.memberProfileId),
  ]);

  const isDelegated = context?.isDelegated ?? false;

  return (
    <AppShell
      session={{
        firstName: session.firstName,
        lastName: session.lastName,
        email: session.email,
        roles: session.roles,
        memberProfileId: session.memberProfileId,
      }}
      isAdmin={isAdmin}
      isOfficial={isOfficial}
      isDelegated={isDelegated}
      activeContextName={context?.targetChild?.name}
      linkedYouth={linkedYouth.map((ly) => ({
        playerId: ly.playerId,
        playerName: ly.playerName,
      }))}
      activeProfileId={context?.activeProfileId || session.memberProfileId}
    >
      {/* Pitch-Side Context Delegation Banner */}
      {isDelegated && context?.targetChild && (
        <div className="mb-4 rounded-xl bg-amber-950/90 border border-amber-500/60 text-amber-200 px-3.5 py-2 text-xs shadow-md flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>
              Managing on behalf of{" "}
              <strong className="text-white underline">
                {context.targetChild.name}
              </strong>{" "}
              (Linked Youth)
            </span>
          </div>
          <form
            action={async () => {
              "use server";
              await switchContextAction(session.memberProfileId);
            }}
          >
            <button
              type="submit"
              className="text-xs font-semibold text-amber-300 hover:text-white underline underline-offset-2 transition-colors flex items-center gap-1"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Switch back ({session.firstName})
            </button>
          </form>
        </div>
      )}

      {children}
    </AppShell>
  );
}
