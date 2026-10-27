-- CreateEnum
CREATE TYPE "MembershipCategory" AS ENUM ('SENIOR_COMPETITIVE', 'YOUTH_U15_U13', 'SOCIAL_PASSIVE', 'INDOOR_WINTER_ADDON');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('ANNUAL', 'SUMMER_OUTDOOR', 'WINTER_INDOOR');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PENDING_PAYMENT', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceCategory" AS ENUM ('MEMBERSHIP_DUES', 'EVENT_FEE', 'EQUIPMENT_CHARGE', 'AD_HOC');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PENDING_VERIFICATION', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'WAIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MOBILEPAY', 'BANK_TRANSFER', 'CASH', 'WAIVER_CREDIT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('REPORTED', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "MembershipCategory" NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "amountOere" INTEGER NOT NULL,
    "siblingDiscountPercent" INTEGER NOT NULL DEFAULT 25,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberSubscription" (
    "id" TEXT NOT NULL,
    "memberProfileId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "seasonYear" INTEGER NOT NULL,
    "seasonCycle" "BillingCycle" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "hasSiblingDiscount" BOOLEAN NOT NULL DEFAULT false,
    "siblingDiscountOere" INTEGER NOT NULL DEFAULT 0,
    "manualDiscountOere" INTEGER,
    "overrideById" TEXT,
    "overrideReason" TEXT,
    "finalFeeOere" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "memberProfileId" TEXT NOT NULL,
    "billedToProfileId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "category" "InvoiceCategory" NOT NULL DEFAULT 'MEMBERSHIP_DUES',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "subtotalOere" INTEGER NOT NULL,
    "discountOere" INTEGER NOT NULL DEFAULT 0,
    "totalOere" INTEGER NOT NULL,
    "paidOere" INTEGER NOT NULL DEFAULT 0,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "lastReminderSentAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "linkedEquipmentLoanId" TEXT,
    "linkedDamageReportId" TEXT,
    "linkedScheduledEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceOere" INTEGER NOT NULL,
    "totalOere" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "verifiedById" TEXT,
    "amountOere" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'REPORTED',
    "transactionReference" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "settlementDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPlan_code_key" ON "MembershipPlan"("code");

-- CreateIndex
CREATE INDEX "MembershipPlan_category_isActive_idx" ON "MembershipPlan"("category", "isActive");

-- CreateIndex
CREATE INDEX "MembershipPlan_billingCycle_idx" ON "MembershipPlan"("billingCycle");

-- CreateIndex
CREATE INDEX "MemberSubscription_memberProfileId_status_idx" ON "MemberSubscription"("memberProfileId", "status");

-- CreateIndex
CREATE INDEX "MemberSubscription_seasonYear_seasonCycle_idx" ON "MemberSubscription"("seasonYear", "seasonCycle");

-- CreateIndex
CREATE UNIQUE INDEX "MemberSubscription_memberProfileId_planId_seasonYear_season_key" ON "MemberSubscription"("memberProfileId", "planId", "seasonYear", "seasonCycle");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_paymentReference_key" ON "Invoice"("paymentReference");

-- CreateIndex
CREATE INDEX "Invoice_billedToProfileId_status_idx" ON "Invoice"("billedToProfileId", "status");

-- CreateIndex
CREATE INDEX "Invoice_memberProfileId_status_idx" ON "Invoice"("memberProfileId", "status");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_status_idx" ON "Invoice"("dueDate", "status");

-- CreateIndex
CREATE INDEX "Invoice_category_status_idx" ON "Invoice"("category", "status");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_invoiceId_status_idx" ON "PaymentTransaction"("invoiceId", "status");

-- CreateIndex
CREATE INDEX "PaymentTransaction_reportedById_idx" ON "PaymentTransaction"("reportedById");

-- CreateIndex
CREATE INDEX "PaymentTransaction_settlementDate_idx" ON "PaymentTransaction"("settlementDate");

-- AddForeignKey
ALTER TABLE "MemberSubscription" ADD CONSTRAINT "MemberSubscription_memberProfileId_fkey" FOREIGN KEY ("memberProfileId") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberSubscription" ADD CONSTRAINT "MemberSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberSubscription" ADD CONSTRAINT "MemberSubscription_overrideById_fkey" FOREIGN KEY ("overrideById") REFERENCES "MemberProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_memberProfileId_fkey" FOREIGN KEY ("memberProfileId") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_billedToProfileId_fkey" FOREIGN KEY ("billedToProfileId") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "MemberSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_linkedEquipmentLoanId_fkey" FOREIGN KEY ("linkedEquipmentLoanId") REFERENCES "EquipmentLoan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_linkedDamageReportId_fkey" FOREIGN KEY ("linkedDamageReportId") REFERENCES "EquipmentDamageReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_linkedScheduledEventId_fkey" FOREIGN KEY ("linkedScheduledEventId") REFERENCES "ScheduledEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "MemberProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
