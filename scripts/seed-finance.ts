import {
  PrismaClient,
  MembershipCategory,
  BillingCycle,
  SubscriptionStatus,
  InvoiceCategory,
  InvoiceStatus,
  PaymentMethod,
  TransactionStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

export async function seedFinance() {
  console.log("💰 Starting Roskilde Cricket Club Finance & Membership Seed...\n");

  // ==========================================
  // 1. SEED MEMBERSHIP PLANS
  // ==========================================
  console.log("📋 Seeding Membership Plans...");

  const plansData = [
    {
      code: "SENIOR_COMPETITIVE_2026",
      name: "Senior Competitive",
      category: MembershipCategory.SENIOR_COMPETITIVE,
      billingCycle: BillingCycle.ANNUAL,
      amountOere: 180000, // 1,800.00 DKK
      siblingDiscountPercent: 0,
      description: "Full competitive annual membership for adult division players including summer outdoor ground access and DCF match sanction fees.",
      isActive: true,
    },
    {
      code: "YOUTH_U15_U13_2026",
      name: "Youth U15 / U13 Competitive",
      category: MembershipCategory.YOUTH_U15_U13,
      billingCycle: BillingCycle.ANNUAL,
      amountOere: 100000, // 1,000.00 DKK
      siblingDiscountPercent: 25, // 25% automatic discount for siblings
      description: "Junior competitive annual membership for U15 and U13 players with coaching, match jersey loan, and DCF tournament entry.",
      isActive: true,
    },
    {
      code: "SOCIAL_PASSIVE_2026",
      name: "Social & Passive Supporter",
      category: MembershipCategory.SOCIAL_PASSIVE,
      billingCycle: BillingCycle.ANNUAL,
      amountOere: 40000, // 400.00 DKK
      siblingDiscountPercent: 0,
      description: "Passive supporter membership with clubhouse voting rights, social cricket fixtures, and club event invitations.",
      isActive: true,
    },
    {
      code: "INDOOR_WINTER_ADDON_2026",
      name: "Winter Indoor Training Add-On",
      category: MembershipCategory.INDOOR_WINTER_ADDON,
      billingCycle: BillingCycle.WINTER_INDOOR,
      amountOere: 35000, // 350.00 DKK
      siblingDiscountPercent: 0,
      description: "Optional winter indoor hall nets training add-on covering October 1 through March 31 municipal venue rental costs.",
      isActive: true,
    },
  ];

  const planMap = new Map<string, string>();
  for (const plan of plansData) {
    const upserted = await prisma.membershipPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        category: plan.category,
        billingCycle: plan.billingCycle,
        amountOere: plan.amountOere,
        siblingDiscountPercent: plan.siblingDiscountPercent,
        description: plan.description,
        isActive: plan.isActive,
      },
      create: plan,
    });
    planMap.set(plan.code, upserted.id);
    console.log(`   ✓ Plan: ${plan.name} (${plan.amountOere / 100} DKK) -> ID: ${upserted.id}`);
  }

  // ==========================================
  // 2. RETRIEVE OR ENSURE TEST MEMBERS
  // ==========================================
  console.log("\n👥 Resolving Test Member Profiles...");

  const adminProfile = await prisma.memberProfile.findFirst({
    where: { email: "admin@roskildecricket.dk" },
  });

  let coachProfile = await prisma.memberProfile.findFirst({
    where: { email: "coach@roskildecricket.dk" },
  });

  if (!coachProfile) {
    coachProfile = await prisma.memberProfile.create({
      data: {
        firstName: "Henrik",
        lastName: "Mortensen",
        email: "coach@roskildecricket.dk",
        phone: "+45 22 33 44 55",
        dateOfBirth: new Date("1980-05-12"),
        roleAssignments: { create: { role: "COACH" } },
      },
    });
  }

  let parentProfile = await prisma.memberProfile.findFirst({
    where: { email: "parent@roskildecricket.dk" },
  });

  if (!parentProfile) {
    parentProfile = await prisma.memberProfile.create({
      data: {
        firstName: "Søren",
        lastName: "Hansen",
        email: "parent@roskildecricket.dk",
        phone: "+45 33 44 55 66",
        dateOfBirth: new Date("1983-09-20"),
        roleAssignments: { create: { role: "PARENT" } },
      },
    });
  }

  // First youth child (Lucas Hansen)
  let youth1 = await prisma.memberProfile.findFirst({
    where: {
      firstName: "Lucas",
      lastName: "Hansen",
    },
  });

  if (!youth1) {
    youth1 = await prisma.memberProfile.create({
      data: {
        firstName: "Lucas",
        lastName: "Hansen",
        dateOfBirth: new Date("2014-04-10"),
        roleAssignments: { create: { role: "PLAYER" } },
        parentLinksAsPlayer: {
          create: {
            parentId: parentProfile.id,
            slot: 1,
            relationship: "Father",
          },
        },
      },
    });
  }

  // Second youth child (Emma Hansen) for Sibling Discount validation
  let youth2 = await prisma.memberProfile.findFirst({
    where: {
      firstName: "Emma",
      lastName: "Hansen",
    },
  });

  if (!youth2) {
    youth2 = await prisma.memberProfile.create({
      data: {
        firstName: "Emma",
        lastName: "Hansen",
        dateOfBirth: new Date("2017-08-15"),
        roleAssignments: { create: { role: "PLAYER" } },
        shirtSize: "YOUTH_S",
        trouserSize: "YOUTH_S",
        capSize: "YOUTH_S",
        parentLinksAsPlayer: {
          create: {
            parentId: parentProfile.id,
            slot: 1,
            relationship: "Father",
          },
        },
        emergencyContacts: {
          create: {
            name: "Søren Hansen",
            relationship: "Father",
            phone: "+45 33 44 55 66",
            isPrimary: true,
          },
        },
      },
    });
  }

  console.log(`   ✓ Coach: ${coachProfile.firstName} ${coachProfile.lastName} (${coachProfile.id})`);
  console.log(`   ✓ Parent: ${parentProfile.firstName} ${parentProfile.lastName} (${parentProfile.id})`);
  console.log(`   ✓ Youth 1 (Senior Sibling): ${youth1.firstName} ${youth1.lastName} (${youth1.id})`);
  console.log(`   ✓ Youth 2 (Junior Sibling): ${youth2.firstName} ${youth2.lastName} (${youth2.id})`);

  // ==========================================
  // 3. SEED MEMBER SUBSCRIPTIONS
  // ==========================================
  console.log("\n📑 Seeding Member Subscriptions...");

  const seniorPlanId = planMap.get("SENIOR_COMPETITIVE_2026")!;
  const youthPlanId = planMap.get("YOUTH_U15_U13_2026")!;

  // 3.1 Adult Subscription (Henrik Mortensen)
  const coachSub = await prisma.memberSubscription.upsert({
    where: {
      memberProfileId_planId_seasonYear_seasonCycle: {
        memberProfileId: coachProfile.id,
        planId: seniorPlanId,
        seasonYear: 2026,
        seasonCycle: BillingCycle.ANNUAL,
      },
    },
    update: {
      status: SubscriptionStatus.ACTIVE,
      finalFeeOere: 180000,
    },
    create: {
      memberProfileId: coachProfile.id,
      planId: seniorPlanId,
      seasonYear: 2026,
      seasonCycle: BillingCycle.ANNUAL,
      startDate: new Date("2026-04-01T00:00:00Z"),
      endDate: new Date("2027-03-31T23:59:59Z"),
      status: SubscriptionStatus.ACTIVE,
      hasSiblingDiscount: false,
      siblingDiscountOere: 0,
      finalFeeOere: 180000,
    },
  });
  console.log(`   ✓ Adult Subscription: Henrik Mortensen -> 1.800,00 DKK (${coachSub.id})`);

  // 3.2 Youth Child 1 Subscription (Full rate: 1,000.00 DKK)
  const youth1Sub = await prisma.memberSubscription.upsert({
    where: {
      memberProfileId_planId_seasonYear_seasonCycle: {
        memberProfileId: youth1.id,
        planId: youthPlanId,
        seasonYear: 2026,
        seasonCycle: BillingCycle.ANNUAL,
      },
    },
    update: {
      status: SubscriptionStatus.ACTIVE,
      hasSiblingDiscount: false,
      siblingDiscountOere: 0,
      finalFeeOere: 100000,
    },
    create: {
      memberProfileId: youth1.id,
      planId: youthPlanId,
      seasonYear: 2026,
      seasonCycle: BillingCycle.ANNUAL,
      startDate: new Date("2026-04-01T00:00:00Z"),
      endDate: new Date("2027-03-31T23:59:59Z"),
      status: SubscriptionStatus.ACTIVE,
      hasSiblingDiscount: false,
      siblingDiscountOere: 0,
      finalFeeOere: 100000,
    },
  });
  console.log(`   ✓ Youth 1 Subscription: Lucas Hansen -> 1.000,00 DKK (${youth1Sub.id})`);

  // 3.3 Youth Child 2 Subscription (25% Sibling Discount: 750.00 DKK)
  const youth2Sub = await prisma.memberSubscription.upsert({
    where: {
      memberProfileId_planId_seasonYear_seasonCycle: {
        memberProfileId: youth2.id,
        planId: youthPlanId,
        seasonYear: 2026,
        seasonCycle: BillingCycle.ANNUAL,
      },
    },
    update: {
      status: SubscriptionStatus.PENDING_PAYMENT,
      hasSiblingDiscount: true,
      siblingDiscountOere: 25000,
      finalFeeOere: 75000,
    },
    create: {
      memberProfileId: youth2.id,
      planId: youthPlanId,
      seasonYear: 2026,
      seasonCycle: BillingCycle.ANNUAL,
      startDate: new Date("2026-04-01T00:00:00Z"),
      endDate: new Date("2027-03-31T23:59:59Z"),
      status: SubscriptionStatus.PENDING_PAYMENT,
      hasSiblingDiscount: true,
      siblingDiscountOere: 25000,
      finalFeeOere: 75000,
    },
  });
  console.log(`   ✓ Youth 2 Sibling Subscription: Emma Hansen -> 750,00 DKK (-25% sibling discount) (${youth2Sub.id})`);

  // ==========================================
  // 4. SEED SAMPLE INVOICES & LINE ITEMS
  // ==========================================
  console.log("\n🧾 Seeding Invoices & Line Items...");

  // Invoice 1: Henrik Mortensen (PAID)
  const inv1 = await prisma.invoice.upsert({
    where: { invoiceNumber: "RCC-INV-2026-0001" },
    update: {},
    create: {
      invoiceNumber: "RCC-INV-2026-0001",
      paymentReference: "RCC-INV-2026-0001",
      memberProfileId: coachProfile.id,
      billedToProfileId: coachProfile.id,
      subscriptionId: coachSub.id,
      category: InvoiceCategory.MEMBERSHIP_DUES,
      status: InvoiceStatus.PAID,
      subtotalOere: 180000,
      discountOere: 0,
      totalOere: 180000,
      paidOere: 180000,
      issueDate: new Date("2026-04-01T08:00:00Z"),
      dueDate: new Date("2026-05-01T23:59:59Z"),
      paidAt: new Date("2026-04-05T14:30:00Z"),
      notes: "Settled via MobilePay Box transfer.",
      lineItems: {
        create: [
          {
            description: "Annual Senior Competitive Membership 2026",
            quantity: 1,
            unitPriceOere: 180000,
            totalOere: 180000,
          },
        ],
      },
    },
  });
  console.log(`   ✓ Invoice RCC-INV-2026-0001: Henrik Mortensen [PAID] -> 1.800,00 DKK`);

  // Invoice 2: Lucas Hansen billed to Søren Hansen (PAID)
  const inv2 = await prisma.invoice.upsert({
    where: { invoiceNumber: "RCC-INV-2026-0002" },
    update: {},
    create: {
      invoiceNumber: "RCC-INV-2026-0002",
      paymentReference: "RCC-INV-2026-0002",
      memberProfileId: youth1.id,
      billedToProfileId: parentProfile.id,
      subscriptionId: youth1Sub.id,
      category: InvoiceCategory.MEMBERSHIP_DUES,
      status: InvoiceStatus.PAID,
      subtotalOere: 100000,
      discountOere: 0,
      totalOere: 100000,
      paidOere: 100000,
      issueDate: new Date("2026-04-01T08:00:00Z"),
      dueDate: new Date("2026-05-01T23:59:59Z"),
      paidAt: new Date("2026-04-10T11:15:00Z"),
      notes: "Bank transfer reference Søren Hansen.",
      lineItems: {
        create: [
          {
            description: "Youth U15 / U13 Competitive Membership 2026 (Lucas Hansen)",
            quantity: 1,
            unitPriceOere: 100000,
            totalOere: 100000,
          },
        ],
      },
    },
  });
  console.log(`   ✓ Invoice RCC-INV-2026-0002: Lucas Hansen [PAID] -> 1.000,00 DKK`);

  // Invoice 3: Emma Hansen billed to Søren Hansen (OPEN / PENDING_VERIFICATION)
  const inv3 = await prisma.invoice.upsert({
    where: { invoiceNumber: "RCC-INV-2026-0003" },
    update: {},
    create: {
      invoiceNumber: "RCC-INV-2026-0003",
      paymentReference: "RCC-INV-2026-0003",
      memberProfileId: youth2.id,
      billedToProfileId: parentProfile.id,
      subscriptionId: youth2Sub.id,
      category: InvoiceCategory.MEMBERSHIP_DUES,
      status: InvoiceStatus.OPEN,
      subtotalOere: 100000,
      discountOere: 25000,
      totalOere: 75000,
      paidOere: 0,
      issueDate: new Date("2026-04-01T08:00:00Z"),
      dueDate: new Date("2026-05-01T23:59:59Z"),
      notes: "Household sibling discount (25%) applied.",
      lineItems: {
        create: [
          {
            description: "Youth U15 / U13 Competitive Membership 2026 (Emma Hansen)",
            quantity: 1,
            unitPriceOere: 100000,
            totalOere: 100000,
          },
          {
            description: "25% Sibling Discount (2nd youth in household)",
            quantity: 1,
            unitPriceOere: -25000,
            totalOere: -25000,
          },
        ],
      },
    },
  });
  console.log(`   ✓ Invoice RCC-INV-2026-0003: Emma Hansen [OPEN] -> 750,00 DKK`);

  // Invoice 4: Overdue sample (>14 days overdue) for Lucas Hansen
  const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const inv4 = await prisma.invoice.upsert({
    where: { invoiceNumber: "RCC-INV-2026-0004" },
    update: {},
    create: {
      invoiceNumber: "RCC-INV-2026-0004",
      paymentReference: "RCC-INV-2026-0004",
      memberProfileId: youth1.id,
      billedToProfileId: parentProfile.id,
      category: InvoiceCategory.EVENT_FEE,
      status: InvoiceStatus.OVERDUE,
      subtotalOere: 25000,
      discountOere: 0,
      totalOere: 25000,
      paidOere: 0,
      issueDate: thirtyDaysAgo,
      dueDate: twentyDaysAgo,
      notes: "DCF Indoor Cup tournament entry fee.",
      lineItems: {
        create: [
          {
            description: "DCF Youth Indoor Cup Tournament Entry Fee",
            quantity: 1,
            unitPriceOere: 25000,
            totalOere: 25000,
          },
        ],
      },
    },
  });
  console.log(`   ✓ Invoice RCC-INV-2026-0004: Lucas Hansen [OVERDUE (>14d)] -> 250,00 DKK`);

  // ==========================================
  // 5. SEED PAYMENT TRANSACTIONS
  // ==========================================
  console.log("\n💳 Seeding Payment Transactions...");

  // Transaction for Inv 1 (Verified by Admin)
  const existingTx1 = await prisma.paymentTransaction.findFirst({
    where: { invoiceId: inv1.id },
  });
  if (!existingTx1) {
    await prisma.paymentTransaction.create({
      data: {
        invoiceId: inv1.id,
        reportedById: coachProfile.id,
        verifiedById: adminProfile?.id,
        amountOere: 180000,
        paymentMethod: PaymentMethod.MOBILEPAY,
        status: TransactionStatus.VERIFIED,
        transactionReference: "MP-2026-0405-9988",
        settlementDate: new Date("2026-04-05T14:30:00Z"),
        verifiedAt: new Date("2026-04-06T09:00:00Z"),
        notes: "Matched in MobilePay Erhverv daily payout report.",
      },
    });
    console.log(`   ✓ PaymentTransaction for RCC-INV-2026-0001: 1.800,00 DKK [VERIFIED]`);
  }

  // Transaction for Inv 2 (Verified by Admin)
  const existingTx2 = await prisma.paymentTransaction.findFirst({
    where: { invoiceId: inv2.id },
  });
  if (!existingTx2) {
    await prisma.paymentTransaction.create({
      data: {
        invoiceId: inv2.id,
        reportedById: parentProfile.id,
        verifiedById: adminProfile?.id,
        amountOere: 100000,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        status: TransactionStatus.VERIFIED,
        transactionReference: "DanskeBank-Ref-774411",
        settlementDate: new Date("2026-04-10T11:15:00Z"),
        verifiedAt: new Date("2026-04-11T10:00:00Z"),
        notes: "Bank statement verified by Treasurer.",
      },
    });
    console.log(`   ✓ PaymentTransaction for RCC-INV-2026-0002: 1.000,00 DKK [VERIFIED]`);
  }

  // Transaction for Inv 3 (Reported by Parent, pending Treasurer verification)
  const existingTx3 = await prisma.paymentTransaction.findFirst({
    where: { invoiceId: inv3.id },
  });
  if (!existingTx3) {
    await prisma.paymentTransaction.create({
      data: {
        invoiceId: inv3.id,
        reportedById: parentProfile.id,
        amountOere: 75000,
        paymentMethod: PaymentMethod.MOBILEPAY,
        status: TransactionStatus.REPORTED,
        transactionReference: "MP-2026-0418-3321",
        settlementDate: new Date(),
        notes: "MobilePay transfer from Søren Hansen.",
      },
    });
    console.log(`   ✓ PaymentTransaction for RCC-INV-2026-0003: 750,00 DKK [REPORTED - Pending Verification]`);
  }

  console.log("\n✅ Roskilde Cricket Club Finance Seed completed successfully!");
}

if (require.main === module) {
  seedFinance()
    .catch((e) => {
      console.error("❌ Finance seed failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
