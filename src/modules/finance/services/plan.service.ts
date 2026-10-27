import { prisma } from "@/lib/db";
import { MembershipPlan } from "@prisma/client";
import {
  CreateMembershipPlanInput,
  UpdateMembershipPlanInput,
} from "../contracts/plan.contract";

export type MembershipPlanWithStats = MembershipPlan & {
  _count: {
    subscriptions: number;
  };
};

/**
 * Lists all club membership plans, optionally filtering by active status.
 */
export async function listMembershipPlans(options?: {
  onlyActive?: boolean;
}): Promise<MembershipPlanWithStats[]> {
  const { onlyActive = false } = options || {};

  return prisma.membershipPlan.findMany({
    where: onlyActive ? { isActive: true } : undefined,
    include: {
      _count: {
        select: {
          subscriptions: true,
        },
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

/**
 * Retrieves a single membership plan by ID.
 */
export async function getMembershipPlanById(
  id: string
): Promise<MembershipPlanWithStats | null> {
  return prisma.membershipPlan.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          subscriptions: true,
        },
      },
    },
  });
}

/**
 * Creates a new membership plan ensuring unique plan code.
 */
export async function createMembershipPlan(
  input: CreateMembershipPlanInput
): Promise<MembershipPlan> {
  const existing = await prisma.membershipPlan.findUnique({
    where: { code: input.code },
  });

  if (existing) {
    throw new Error(`A plan with code "${input.code}" already exists.`);
  }

  return prisma.membershipPlan.create({
    data: {
      code: input.code,
      name: input.name,
      category: input.category,
      billingCycle: input.billingCycle,
      amountOere: input.amountOere,
      siblingDiscountPercent: input.siblingDiscountPercent,
      description: input.description,
      isActive: true,
    },
  });
}

/**
 * Updates an existing membership plan.
 */
export async function updateMembershipPlan(
  input: UpdateMembershipPlanInput
): Promise<MembershipPlan> {
  const existing = await prisma.membershipPlan.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new Error(`Membership plan with ID "${input.id}" not found.`);
  }

  return prisma.membershipPlan.update({
    where: { id: input.id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.amountOere !== undefined && { amountOere: input.amountOere }),
      ...(input.siblingDiscountPercent !== undefined && {
        siblingDiscountPercent: input.siblingDiscountPercent,
      }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

/**
 * Toggles the active status of a membership plan.
 */
export async function toggleMembershipPlanActive(
  id: string,
  isActive: boolean
): Promise<MembershipPlan> {
  return updateMembershipPlan({ id, isActive });
}
