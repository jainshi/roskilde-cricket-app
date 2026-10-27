import { prisma } from "@/lib/db";
import {
  Invoice,
  InvoiceCategory,
  InvoiceStatus,
  SubscriptionStatus,
} from "@prisma/client";
import { formatInvoiceNumber, parseInvoiceNumber } from "../domain/invoice-lifecycle";
import { formatDanishKroner } from "../domain/money-oere";
import { notificationService } from "@/modules/auth-rbac/notifications/notification.service";
import {
  GenerateSeasonalInvoicesInput,
  CreateAdHocInvoiceInput,
} from "../contracts/invoice.contract";

export type InvoiceWithRelations = Invoice & {
  memberProfile: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    dateOfBirth: Date | null;
  };
  billedToProfile: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
  lineItems: {
    id: string;
    description: string;
    quantity: number;
    unitPriceOere: number;
    totalOere: number;
  }[];
  transactions: {
    id: string;
    amountOere: number;
    paymentMethod: string;
    status: string;
    reportedAt: Date;
    settlementDate: Date;
    verifiedAt: Date | null;
  }[];
  subscription?: {
    id: string;
    seasonYear: number;
    seasonCycle: string;
    plan: {
      id: string;
      name: string;
      code: string;
    };
  } | null;
  linkedEquipmentLoan?: {
    id: string;
    equipmentItem: {
      name: string;
      assetTag: string | null;
    };
  } | null;
  linkedScheduledEvent?: {
    id: string;
    title: string;
    date: Date;
  } | null;
};

export interface FamilyBillingSummary {
  parentProfileId: string;
  parentName: string;
  totalHouseholdOere: number;
  paidHouseholdOere: number;
  balanceHouseholdOere: number;
  openInvoiceCount: number;
  overdueInvoiceCount: number;
  invoices: InvoiceWithRelations[];
  childrenBreakdown: {
    childId: string;
    childName: string;
    totalOere: number;
    paidOere: number;
    balanceOere: number;
    invoices: InvoiceWithRelations[];
  }[];
}

/**
 * Generates the next sequential invoice number for a given calendar year.
 * Format: RCC-INV-YYYY-####
 */
export async function generateNextInvoiceNumber(year: number): Promise<string> {
  const prefix = `RCC-INV-${year}-`;

  const latest = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });

  let nextSequence = 1;
  if (latest) {
    const parsed = parseInvoiceNumber(latest.invoiceNumber);
    if (parsed) {
      nextSequence = parsed.sequence + 1;
    }
  }

  return formatInvoiceNumber(year, nextSequence);
}

/**
 * Resolves all parent contact emails for simultaneous dual-parent notification dispatch (Principle II).
 */
async function resolveBillingRecipientEmails(memberProfileId: string): Promise<string[]> {
  const member = await prisma.memberProfile.findUnique({
    where: { id: memberProfileId },
    include: {
      parentLinksAsPlayer: {
        include: {
          parent: {
            select: { email: true, firstName: true },
          },
        },
      },
    },
  });

  if (!member) return [];

  const emails: string[] = [];

  // If youth member has linked parents, collect up to 2 parent emails
  if (member.parentLinksAsPlayer.length > 0) {
    for (const link of member.parentLinksAsPlayer) {
      if (link.parent.email && !emails.includes(link.parent.email)) {
        emails.push(link.parent.email);
      }
    }
  }

  // If adult member or no parent emails found, use member's own email
  if (emails.length === 0 && member.email) {
    emails.push(member.email);
  }

  return emails;
}

/**
 * Dispatches simultaneous dual-parent billing notices via NotificationService.
 */
export async function dispatchBillingNotification(
  invoice: InvoiceWithRelations,
  title: string
) {
  const emails = await resolveBillingRecipientEmails(invoice.memberProfileId);
  if (emails.length === 0) return;

  const beneficiaryName = `${invoice.memberProfile.firstName} ${invoice.memberProfile.lastName}`;
  const totalFormatted = formatDanishKroner(invoice.totalOere);
  const dueFormatted = new Date(invoice.dueDate).toISOString().split("T")[0];

  const html = `
    <div style="font-family: sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #0369a1; margin-bottom: 8px;">Roskilde Cricket Club</h2>
      <h3 style="margin-top: 0;">${title}</h3>
      <p>Dear Member / Parent,</p>
      <p>A new billing statement has been issued for <strong>${beneficiaryName}</strong>:</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Invoice Reference:</td>
            <td style="padding: 4px 0; font-weight: bold; font-family: monospace;">${invoice.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Category:</td>
            <td style="padding: 4px 0;">${invoice.category}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Total Amount Due:</td>
            <td style="padding: 4px 0; font-weight: bold; color: #0284c7; font-size: 1.1em;">${totalFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Payment Deadline:</td>
            <td style="padding: 4px 0;">${dueFormatted}</td>
          </tr>
        </table>
      </div>

      <p style="margin-bottom: 4px;"><strong>Payment Instructions:</strong></p>
      <ul style="padding-left: 20px; color: #334155;">
        <li><strong>MobilePay:</strong> Transfer to Club Box <strong>#882244</strong> with note <code>${invoice.invoiceNumber}</code></li>
        <li><strong>Bank Transfer:</strong> Reg. <strong>2255</strong> Kontonr. <strong>8899001122</strong> with message <code>${invoice.invoiceNumber}</code></li>
      </ul>

      <p style="font-size: 13px; color: #64748b; margin-top: 30px;">
        View your complete household balance anytime in the Roskilde Cricket App under <strong>Billing &amp; Fees</strong>.
      </p>
    </div>
  `;

  await notificationService.sendEmail({
    to: emails,
    subject: `[RCC] New Invoice ${invoice.invoiceNumber} - ${totalFormatted}`,
    html,
    text: `Roskilde Cricket Club Invoice ${invoice.invoiceNumber} for ${beneficiaryName}. Total: ${totalFormatted}. Due: ${dueFormatted}. Payment Reference: ${invoice.invoiceNumber}`,
  });
}

/**
 * Batch-generates seasonal invoices for active subscriptions.
 */
export async function generateSeasonalInvoices(
  input: GenerateSeasonalInvoicesInput,
  actorProfileId?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const { seasonYear, seasonCycle, planId, teamSquadId, dueDateDays = 30 } = input;

  // 1. Fetch eligible subscriptions
  const subscriptions = await prisma.memberSubscription.findMany({
    where: {
      seasonYear,
      seasonCycle,
      ...(planId && { planId }),
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING_PAYMENT] },
      ...(teamSquadId && {
        memberProfile: {
          rosterMemberships: {
            some: { teamSquadId, isActive: true },
          },
        },
      }),
    },
    include: {
      plan: true,
      memberProfile: {
        include: {
          parentLinksAsPlayer: {
            include: { parent: true },
          },
        },
      },
      invoices: {
        where: { category: InvoiceCategory.MEMBERSHIP_DUES },
      },
    },
  });

  const now = new Date();
  const dueDate = new Date(now.getTime() + dueDateDays * 24 * 60 * 60 * 1000);
  let createdCount = 0;

  for (const sub of subscriptions) {
    // Skip if already invoiced for this subscription
    if (sub.invoices.length > 0) {
      continue;
    }

    const member = sub.memberProfile;
    // Debtor: Parent if minor, else member themselves
    const primaryParent = member.parentLinksAsPlayer[0]?.parent;
    const billedToProfileId = primaryParent ? primaryParent.id : member.id;

    const invoiceNumber = await generateNextInvoiceNumber(seasonYear);
    const subtotalOere = sub.plan.amountOere;
    const discountOere = sub.hasSiblingDiscount
      ? sub.siblingDiscountOere
      : sub.manualDiscountOere ?? 0;
    const totalOere = sub.finalFeeOere;

    // Line items
    const lineItemsData = [
      {
        description: `${sub.plan.name} (${seasonYear} Season)`,
        quantity: 1,
        unitPriceOere: subtotalOere,
        totalOere: subtotalOere,
      },
    ];

    if (discountOere > 0) {
      lineItemsData.push({
        description: sub.hasSiblingDiscount
          ? `Automatic ${sub.plan.siblingDiscountPercent}% Sibling Discount`
          : `Treasurer Manual Override: ${sub.overrideReason || "Approved Discount"}`,
        quantity: 1,
        unitPriceOere: -discountOere,
        totalOere: -discountOere,
      });
    }

    const created = await prisma.invoice.create({
      data: {
        invoiceNumber,
        paymentReference: invoiceNumber,
        memberProfileId: member.id,
        billedToProfileId,
        subscriptionId: sub.id,
        category: InvoiceCategory.MEMBERSHIP_DUES,
        status: InvoiceStatus.OPEN,
        subtotalOere,
        discountOere,
        totalOere,
        paidOere: 0,
        issueDate: now,
        dueDate,
        lineItems: {
          create: lineItemsData,
        },
      },
      include: {
        memberProfile: {
          select: { id: true, firstName: true, lastName: true, email: true, dateOfBirth: true },
        },
        billedToProfile: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        lineItems: true,
        transactions: true,
      },
    });

    createdCount++;

    // Dual-parent notification dispatch
    await dispatchBillingNotification(created as any, "Seasonal Membership Invoice");
  }

  return { success: true, count: createdCount };
}

/**
 * Creates an ad-hoc fee request linked to Module 2 equipment loss/damage or Module 3 event.
 */
export async function createAdHocInvoice(
  input: CreateAdHocInvoiceInput,
  actorProfileId?: string
): Promise<InvoiceWithRelations> {
  const member = await prisma.memberProfile.findUnique({
    where: { id: input.memberProfileId },
    include: {
      parentLinksAsPlayer: {
        include: { parent: true },
      },
    },
  });

  if (!member) {
    throw new Error(`Member with ID "${input.memberProfileId}" not found.`);
  }

  const primaryParent = member.parentLinksAsPlayer[0]?.parent;
  const billedToProfileId = primaryParent ? primaryParent.id : member.id;

  const currentYear = new Date().getFullYear();
  const invoiceNumber = await generateNextInvoiceNumber(currentYear);

  let subtotalOere = 0;
  for (const item of input.lineItems) {
    subtotalOere += item.unitPriceOere * item.quantity;
  }

  const dueDate = typeof input.dueDate === "string" ? new Date(input.dueDate) : input.dueDate;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      paymentReference: invoiceNumber,
      memberProfileId: member.id,
      billedToProfileId,
      category: input.category,
      status: InvoiceStatus.OPEN,
      subtotalOere,
      discountOere: 0,
      totalOere: subtotalOere,
      paidOere: 0,
      dueDate,
      notes: input.notes,
      linkedEquipmentLoanId: input.linkedEquipmentLoanId,
      linkedDamageReportId: input.linkedDamageReportId,
      linkedScheduledEventId: input.linkedScheduledEventId,
      lineItems: {
        create: input.lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPriceOere: item.unitPriceOere,
          totalOere: item.unitPriceOere * item.quantity,
        })),
      },
    },
    include: {
      memberProfile: {
        select: { id: true, firstName: true, lastName: true, email: true, dateOfBirth: true },
      },
      billedToProfile: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      lineItems: true,
      transactions: true,
      subscription: {
        include: { plan: true },
      },
      linkedEquipmentLoan: {
        include: { equipmentItem: true },
      },
      linkedScheduledEvent: true,
    },
  });

  // Simultaneous dual-parent notification dispatch
  await dispatchBillingNotification(invoice as any, input.title);

  return invoice as any;
}

/**
 * Retrieves the Consolidated Family Billing summary for a parent or individual member.
 */
export async function getConsolidatedFamilyBilling(
  profileId: string
): Promise<FamilyBillingSummary> {
  // Check if profile is a parent with linked youth
  const parentLinks = await prisma.parentChildLink.findMany({
    where: { parentId: profileId },
    include: {
      player: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  const parentProfile = await prisma.memberProfile.findUnique({
    where: { id: profileId },
    select: { firstName: true, lastName: true },
  });

  const parentName = parentProfile
    ? `${parentProfile.firstName} ${parentProfile.lastName}`
    : "Member";

  const isParent = parentLinks.length > 0;
  const childIds = parentLinks.map((l) => l.player.id);

  // Fetch all invoices: billed to parent, or beneficiary is parent or any linked child
  const allInvoices = await prisma.invoice.findMany({
    where: {
      OR: [
        { billedToProfileId: profileId },
        { memberProfileId: profileId },
        ...(isParent ? [{ memberProfileId: { in: childIds } }] : []),
      ],
    },
    include: {
      memberProfile: {
        select: { id: true, firstName: true, lastName: true, email: true, dateOfBirth: true },
      },
      billedToProfile: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      lineItems: true,
      transactions: true,
      subscription: {
        include: { plan: true },
      },
      linkedEquipmentLoan: {
        include: { equipmentItem: true },
      },
      linkedScheduledEvent: true,
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  let totalHouseholdOere = 0;
  let paidHouseholdOere = 0;
  let openInvoiceCount = 0;
  let overdueInvoiceCount = 0;

  for (const inv of allInvoices) {
    totalHouseholdOere += inv.totalOere;
    paidHouseholdOere += inv.paidOere;
    if (inv.status === InvoiceStatus.OPEN || inv.status === InvoiceStatus.PENDING_VERIFICATION) {
      openInvoiceCount++;
    }
    if (inv.status === InvoiceStatus.OVERDUE) {
      overdueInvoiceCount++;
    }
  }

  const balanceHouseholdOere = Math.max(0, totalHouseholdOere - paidHouseholdOere);

  // Build per-child breakdown
  const childrenBreakdown = parentLinks.map((link) => {
    const childInvoices = allInvoices.filter((inv) => inv.memberProfileId === link.player.id);
    let childTotal = 0;
    let childPaid = 0;

    for (const inv of childInvoices) {
      childTotal += inv.totalOere;
      childPaid += inv.paidOere;
    }

    return {
      childId: link.player.id,
      childName: `${link.player.firstName} ${link.player.lastName}`,
      totalOere: childTotal,
      paidOere: childPaid,
      balanceOere: Math.max(0, childTotal - childPaid),
      invoices: childInvoices as any,
    };
  });

  return {
    parentProfileId: profileId,
    parentName,
    totalHouseholdOere,
    paidHouseholdOere,
    balanceHouseholdOere,
    openInvoiceCount,
    overdueInvoiceCount,
    invoices: allInvoices as any,
    childrenBreakdown,
  };
}

/**
 * Retrieves a single invoice with full details for receipt printing or payment modal.
 */
export async function getInvoiceById(
  idOrNumber: string
): Promise<InvoiceWithRelations | null> {
  return prisma.invoice.findFirst({
    where: {
      OR: [
        { id: idOrNumber },
        { invoiceNumber: idOrNumber },
      ],
    },
    include: {
      memberProfile: {
        select: { id: true, firstName: true, lastName: true, email: true, dateOfBirth: true },
      },
      billedToProfile: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      lineItems: true,
      transactions: true,
      subscription: {
        include: { plan: true },
      },
      linkedEquipmentLoan: {
        include: { equipmentItem: true },
      },
      linkedScheduledEvent: true,
    },
  }) as any;
}
