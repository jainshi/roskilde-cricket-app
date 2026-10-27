import React from "react";
import { Metadata } from "next";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { listMembershipPlans } from "@/modules/finance/services/plan.service";
import { listMemberSubscriptions } from "@/modules/finance/services/subscription.service";
import { PlanManager } from "@/components/finance/plan-manager";
import { UnassignSubscriptionButton } from "@/components/finance/unassign-subscription-button";
import { formatDanishKroner } from "@/modules/finance/domain/money-oere";
import {
  CreditCard,
  Users,
  ShieldCheck,
  Percent,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Membership Plans & Subscriptions | Roskilde Cricket Club",
  description: "Manage club membership plans, integer øre rates, sibling discounts, and member enrollments.",
};

export default async function AdminFinancePlansPage() {
  const session = await requireActivatedSession();

  // Guard: Only ADMIN or users with admin roles can access
  if (!session.roles.includes(Role.ADMIN)) {
    redirect("/dashboard");
  }

  // 1. Fetch plans with stats
  const plans = await listMembershipPlans();

  // 2. Fetch all subscriptions
  const subscriptions = await listMemberSubscriptions();

  // 3. Fetch candidate players for plan assignment (plans only associate to players)
  const playerProfiles = await prisma.memberProfile.findMany({
    where: {
      isAnonymized: false,
      roleAssignments: {
        some: { role: Role.PLAYER },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      dateOfBirth: true,
      roleAssignments: {
        select: { role: true },
      },
      parentLinksAsPlayer: {
        include: {
          parent: {
            select: { firstName: true, lastName: true },
          },
        },
      },
      subscriptions: {
        where: { seasonYear: 2026 },
        include: { plan: true },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const candidateMembers = playerProfiles.map((m) => {
    const isMinor =
      m.parentLinksAsPlayer.length > 0 ||
      (m.dateOfBirth
        ? new Date().getFullYear() - new Date(m.dateOfBirth).getFullYear() < 18
        : false);

    const parent = m.parentLinksAsPlayer[0]?.parent;

    return {
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      dateOfBirth: m.dateOfBirth,
      isMinor,
      parentName: parent ? `${parent.firstName} ${parent.lastName}` : undefined,
      roles: m.roleAssignments.map((r) => r.role),
      activeSubscriptions: m.subscriptions.map((s) => ({
        planId: s.planId,
        planName: s.plan.name,
        seasonYear: s.seasonYear,
      })),
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-sky-400 font-mono tracking-wider uppercase mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Club Administration · Finance Domain</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Membership Plans &amp; Subscriptions
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure club subscription tiers, integer øre pricing, automated sibling discounts, and member enrollments.
          </p>
        </div>
      </div>

      {/* 1. Plans Manager Section */}
      <PlanManager initialPlans={plans} candidateMembers={candidateMembers} />

      {/* 2. Active Member Subscriptions Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">
              Active Member Subscriptions ({subscriptions.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Season 2026 / 2027
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4">Member Name</th>
                  <th className="py-3.5 px-4">Plan / Category</th>
                  <th className="py-3.5 px-4">Season</th>
                  <th className="py-3.5 px-4 text-right">Standard Fee</th>
                  <th className="py-3.5 px-4">Discount Applied</th>
                  <th className="py-3.5 px-4 text-right">Final Fee</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No active member subscriptions found for this season.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => {
                    const memberName = `${sub.memberProfile.firstName} ${sub.memberProfile.lastName}`;
                    const hasDiscount = sub.hasSiblingDiscount || (sub.manualDiscountOere ?? 0) > 0;

                    return (
                      <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{memberName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {sub.memberProfile.email || "No email"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-200">{sub.plan.name}</div>
                          <div className="text-[10px] text-sky-400 font-mono uppercase">
                            {sub.plan.category}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {sub.seasonYear} · {sub.seasonCycle}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {formatDanishKroner(sub.plan.amountOere)}
                        </td>
                        <td className="py-3 px-4">
                          {sub.hasSiblingDiscount && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <Percent className="w-3 h-3" />
                              -25% Sibling Discount
                            </span>
                          )}
                          {sub.manualDiscountOere && sub.manualDiscountOere > 0 && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                              title={sub.overrideReason ?? "Treasurer manual override"}
                            >
                              <Award className="w-3 h-3" />
                              Manual: -{formatDanishKroner(sub.manualDiscountOere)}
                            </span>
                          )}
                          {!hasDiscount && (
                            <span className="text-[11px] text-slate-500">None (Full Rate)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {formatDanishKroner(sub.finalFeeOere)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              sub.status === "ACTIVE"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {sub.status === "ACTIVE" ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <UnassignSubscriptionButton
                            subscriptionId={sub.id}
                            playerName={memberName}
                            planName={sub.plan.name}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
