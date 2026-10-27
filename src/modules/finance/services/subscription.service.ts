import { prisma } from "@/lib/db";
import { MemberSubscription, SubscriptionStatus } from "@prisma/client";
import { getSeasonDateRange } from "../domain/season-billing";
import {
  calculateHouseholdYouthFees,
  YouthSubscriptionCandidate,
} from "../domain/family-discount";
import {
  EnrollMemberSubscriptionInput,
  OverrideSubscriptionDiscountInput,
} from "../contracts/subscription.contract";

export type MemberSubscriptionWithDetails = MemberSubscription & {
  memberProfile: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date | null;
    email: string | null;
  };
  plan: {
    id: string;
    code: string;
    name: string;
    category: string;
    billingCycle: string;
    amountOere: number;
    siblingDiscountPercent: number;
  };
  overrideBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
};

/**
 * Enrolls a member into a seasonal membership subscription, automatically
 * calculating sibling discounts for household youth players and recording manual overrides.
 */
export async function enrollMemberSubscription(
  input: EnrollMemberSubscriptionInput,
  actorProfileId?: string
): Promise<MemberSubscription> {
  const { memberProfileId, planId, seasonYear, manualDiscountOere, overrideReason } = input;

  // 1. Fetch member profile
  const member = await prisma.memberProfile.findUnique({
    where: { id: memberProfileId },
    include: {
      parentLinksAsPlayer: {
        include: {
          parent: {
            include: {
              parentLinksAsParent: {
                include: {
                  player: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!member) {
    throw new Error(`Member with ID "${memberProfileId}" not found.`);
  }

  // 2. Fetch membership plan
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new Error(`Membership plan with ID "${planId}" not found.`);
  }

  if (!plan.isActive) {
    throw new Error(`Cannot enroll into an inactive plan "${plan.name}".`);
  }

  // 3. Resolve fixed season date range
  const { startDate, endDate } = getSeasonDateRange(plan.billingCycle, seasonYear);

  // 4. Evaluate Household Sibling Discount if youth/minor
  let hasSiblingDiscount = false;
  let siblingDiscountOere = 0;
  let finalFeeOere = plan.amountOere;

  // Collect linked siblings under the same parent
  const primaryParentLink = member.parentLinksAsPlayer[0];
  if (primaryParentLink && plan.siblingDiscountPercent > 0) {
    const parent = primaryParentLink.parent;
    const siblingPlayers = parent.parentLinksAsParent.map((l) => l.player);

    // Fetch existing subscriptions for all siblings in this season
    const siblingIds = siblingPlayers.map((s) => s.id);
    const existingSubs = await prisma.memberSubscription.findMany({
      where: {
        memberProfileId: { in: siblingIds },
        seasonYear,
        seasonCycle: plan.billingCycle,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING_PAYMENT] },
      },
      include: {
        plan: true,
      },
    });

    // Build candidates for sibling calculator
    const candidates: YouthSubscriptionCandidate[] = [];

    // Add existing sibling subscriptions (excluding current member if modifying)
    for (const sub of existingSubs) {
      if (sub.memberProfileId !== memberProfileId) {
        const sibProfile = siblingPlayers.find((s) => s.id === sub.memberProfileId);
        candidates.push({
          id: sub.id,
          memberProfileId: sub.memberProfileId,
          memberName: sibProfile ? `${sibProfile.firstName} ${sibProfile.lastName}` : "Sibling",
          planId: sub.planId,
          planName: sub.plan.name,
          baseFeeOere: sub.plan.amountOere,
          siblingDiscountPercent: sub.plan.siblingDiscountPercent,
          dateOfBirth: sibProfile?.dateOfBirth,
        });
      }
    }

    // Add current member candidate
    candidates.push({
      id: "candidate-current",
      memberProfileId: member.id,
      memberName: `${member.firstName} ${member.lastName}`,
      planId: plan.id,
      planName: plan.name,
      baseFeeOere: plan.amountOere,
      siblingDiscountPercent: plan.siblingDiscountPercent,
      dateOfBirth: member.dateOfBirth,
      manualDiscountOere,
      overrideReason,
      overrideById: actorProfileId,
    });

    // Run pure domain discount calculation
    const calculated = calculateHouseholdYouthFees(candidates);
    const currentCalculated = calculated.find((c) => c.memberProfileId === member.id);

    if (currentCalculated) {
      hasSiblingDiscount = currentCalculated.hasSiblingDiscount;
      siblingDiscountOere = currentCalculated.siblingDiscountOere;
      finalFeeOere = currentCalculated.finalFeeOere;
    }
  } else if (manualDiscountOere !== undefined && manualDiscountOere !== null) {
    // Explicit manual override for non-sibling candidate
    const discount = Math.min(plan.amountOere, Math.max(0, manualDiscountOere));
    finalFeeOere = plan.amountOere - discount;
  }

  // 5. Upsert subscription
  return prisma.memberSubscription.upsert({
    where: {
      memberProfileId_planId_seasonYear_seasonCycle: {
        memberProfileId,
        planId,
        seasonYear,
        seasonCycle: plan.billingCycle,
      },
    },
    update: {
      startDate,
      endDate,
      hasSiblingDiscount,
      siblingDiscountOere,
      manualDiscountOere: manualDiscountOere ?? null,
      overrideById: actorProfileId ?? null,
      overrideReason: overrideReason ?? null,
      finalFeeOere,
      status: SubscriptionStatus.PENDING_PAYMENT,
    },
    create: {
      memberProfileId,
      planId,
      seasonYear,
      seasonCycle: plan.billingCycle,
      startDate,
      endDate,
      hasSiblingDiscount,
      siblingDiscountOere,
      manualDiscountOere: manualDiscountOere ?? null,
      overrideById: actorProfileId ?? null,
      overrideReason: overrideReason ?? null,
      finalFeeOere,
      status: SubscriptionStatus.PENDING_PAYMENT,
    },
  });
}

/**
 * Lists member subscriptions with optional filters.
 */
export async function listMemberSubscriptions(filters?: {
  memberProfileId?: string;
  seasonYear?: number;
  status?: SubscriptionStatus;
}): Promise<MemberSubscriptionWithDetails[]> {
  return prisma.memberSubscription.findMany({
    where: {
      ...(filters?.memberProfileId && { memberProfileId: filters.memberProfileId }),
      ...(filters?.seasonYear && { seasonYear: filters.seasonYear }),
      ...(filters?.status && { status: filters.status }),
    },
    include: {
      memberProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          email: true,
        },
      },
      plan: {
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
          billingCycle: true,
          amountOere: true,
          siblingDiscountPercent: true,
        },
      },
      overrideBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [{ seasonYear: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Applies a manual Treasurer/Admin discount override to an existing subscription.
 */
export async function overrideSubscriptionDiscount(
  input: OverrideSubscriptionDiscountInput,
  overrideById: string
): Promise<MemberSubscription> {
  const { subscriptionId, manualDiscountOere, overrideReason } = input;

  const subscription = await prisma.memberSubscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });

  if (!subscription) {
    throw new Error(`Subscription with ID "${subscriptionId}" not found.`);
  }

  const discount = Math.min(subscription.plan.amountOere, Math.max(0, manualDiscountOere));
  const finalFeeOere = subscription.plan.amountOere - discount;

  return prisma.memberSubscription.update({
    where: { id: subscriptionId },
    data: {
      manualDiscountOere: discount,
      overrideById,
      overrideReason,
      hasSiblingDiscount: false, // overridden manually
      siblingDiscountOere: 0,
      finalFeeOere,
    },
  });
}
