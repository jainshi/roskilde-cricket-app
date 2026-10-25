-- CreateEnum
CREATE TYPE "TrackingType" AS ENUM ('SERIALIZED', 'BULK');

-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('BATTING', 'PROTECTIVE', 'BOWLING_BALLS', 'TRAINING_GROUND', 'FACILITY_KEYS', 'APPAREL_KIT');

-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('JUNIOR', 'YOUTH', 'SENIOR', 'UNIVERSAL');

-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'NEEDS_REPAIR', 'RETIRED');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('AVAILABLE', 'ON_LOAN', 'UNDER_MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'OVERDUE', 'RETURNED', 'LOST');

-- CreateEnum
CREATE TYPE "StockTransactionType" AS ENUM ('CONSUMPTION', 'TEMPORARY_LOAN', 'RETURN_RESTOCK', 'REPLENISHMENT', 'AUDIT_CORRECTION', 'WRITE_OFF');

-- CreateEnum
CREATE TYPE "ExtensionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DamageReportStatus" AS ENUM ('PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "EquipmentItem" (
    "id" TEXT NOT NULL,
    "assetTag" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trackingType" "TrackingType" NOT NULL DEFAULT 'SERIALIZED',
    "category" "EquipmentCategory" NOT NULL,
    "ageGroup" "AgeGroup" NOT NULL DEFAULT 'UNIVERSAL',
    "condition" "ItemCondition" NOT NULL DEFAULT 'GOOD',
    "status" "ItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "storageLocation" TEXT NOT NULL,
    "totalQuantity" INTEGER NOT NULL DEFAULT 1,
    "availableQuantity" INTEGER NOT NULL DEFAULT 1,
    "lowStockThreshold" INTEGER,
    "purchasePriceMinorUnits" INTEGER,
    "acquisitionDate" TIMESTAMP(3),
    "warrantyExpiresAt" TIMESTAMP(3),
    "isRetired" BOOLEAN NOT NULL DEFAULT false,
    "retiredReason" TEXT,
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentLoan" (
    "id" TEXT NOT NULL,
    "equipmentItemId" TEXT NOT NULL,
    "borrowerProfileId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "teamOrSquadName" TEXT,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedById" TEXT NOT NULL,
    "checkedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnAt" TIMESTAMP(3) NOT NULL,
    "checkoutCondition" "ItemCondition" NOT NULL,
    "checkoutNotes" TEXT,
    "returnedAt" TIMESTAMP(3),
    "receivedById" TEXT,
    "returnCondition" "ItemCondition",
    "returnNotes" TEXT,
    "lastReminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransaction" (
    "id" TEXT NOT NULL,
    "equipmentItemId" TEXT NOT NULL,
    "transactionType" "StockTransactionType" NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "totalQuantityAfter" INTEGER NOT NULL,
    "availableQuantityAfter" INTEGER NOT NULL,
    "recipientProfileId" TEXT,
    "teamOrSquadName" TEXT,
    "reason" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentLoanExtension" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "proposedReturnAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ExtensionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentLoanExtension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentDamageReport" (
    "id" TEXT NOT NULL,
    "equipmentItemId" TEXT NOT NULL,
    "equipmentLoanId" TEXT,
    "reportedById" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DamageReportStatus" NOT NULL DEFAULT 'PENDING',
    "resolutionNotes" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentDamageReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentItem_assetTag_key" ON "EquipmentItem"("assetTag");

-- CreateIndex
CREATE INDEX "EquipmentItem_category_status_idx" ON "EquipmentItem"("category", "status");

-- CreateIndex
CREATE INDEX "EquipmentItem_storageLocation_idx" ON "EquipmentItem"("storageLocation");

-- CreateIndex
CREATE INDEX "EquipmentItem_trackingType_idx" ON "EquipmentItem"("trackingType");

-- CreateIndex
CREATE INDEX "EquipmentLoan_borrowerProfileId_status_idx" ON "EquipmentLoan"("borrowerProfileId", "status");

-- CreateIndex
CREATE INDEX "EquipmentLoan_equipmentItemId_status_idx" ON "EquipmentLoan"("equipmentItemId", "status");

-- CreateIndex
CREATE INDEX "EquipmentLoan_expectedReturnAt_status_idx" ON "EquipmentLoan"("expectedReturnAt", "status");

-- CreateIndex
CREATE INDEX "StockTransaction_equipmentItemId_transactionType_idx" ON "StockTransaction"("equipmentItemId", "transactionType");

-- CreateIndex
CREATE INDEX "StockTransaction_createdAt_idx" ON "StockTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "EquipmentLoanExtension_loanId_status_idx" ON "EquipmentLoanExtension"("loanId", "status");

-- CreateIndex
CREATE INDEX "EquipmentDamageReport_equipmentItemId_status_idx" ON "EquipmentDamageReport"("equipmentItemId", "status");

-- CreateIndex
CREATE INDEX "EquipmentDamageReport_reportedById_idx" ON "EquipmentDamageReport"("reportedById");

-- AddForeignKey
ALTER TABLE "EquipmentLoan" ADD CONSTRAINT "EquipmentLoan_equipmentItemId_fkey" FOREIGN KEY ("equipmentItemId") REFERENCES "EquipmentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentLoan" ADD CONSTRAINT "EquipmentLoan_borrowerProfileId_fkey" FOREIGN KEY ("borrowerProfileId") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentLoan" ADD CONSTRAINT "EquipmentLoan_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentLoan" ADD CONSTRAINT "EquipmentLoan_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "MemberProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_equipmentItemId_fkey" FOREIGN KEY ("equipmentItemId") REFERENCES "EquipmentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_recipientProfileId_fkey" FOREIGN KEY ("recipientProfileId") REFERENCES "MemberProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentLoanExtension" ADD CONSTRAINT "EquipmentLoanExtension_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "EquipmentLoan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentLoanExtension" ADD CONSTRAINT "EquipmentLoanExtension_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentLoanExtension" ADD CONSTRAINT "EquipmentLoanExtension_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "MemberProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentDamageReport" ADD CONSTRAINT "EquipmentDamageReport_equipmentItemId_fkey" FOREIGN KEY ("equipmentItemId") REFERENCES "EquipmentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentDamageReport" ADD CONSTRAINT "EquipmentDamageReport_equipmentLoanId_fkey" FOREIGN KEY ("equipmentLoanId") REFERENCES "EquipmentLoan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentDamageReport" ADD CONSTRAINT "EquipmentDamageReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "MemberProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentDamageReport" ADD CONSTRAINT "EquipmentDamageReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "MemberProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
