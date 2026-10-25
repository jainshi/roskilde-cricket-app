# Data Model: Club Inventory & Equipment Management

**Feature Branch**: `002-inventory-equipment-management`  
**Date**: 2026-10-25  
**Spec Reference**: `specs/002-inventory-equipment-management/spec.md`  
**Constitution Reference**: Constitution v1.1.0 Domain Integrity Constraints

---

## 1. Schema Extensions (`prisma/schema.prisma`)

```prisma
// ==========================================
// MODULE 2: INVENTORY & EQUIPMENT ENUMS
// ==========================================

enum TrackingType {
  SERIALIZED
  BULK
}

enum EquipmentCategory {
  BATTING
  PROTECTIVE
  BOWLING_BALLS
  TRAINING_GROUND
  FACILITY_KEYS
  APPAREL_KIT
}

enum AgeGroup {
  JUNIOR
  YOUTH
  SENIOR
  UNIVERSAL
}

enum ItemCondition {
  NEW
  GOOD
  FAIR
  NEEDS_REPAIR
  RETIRED
}

enum ItemStatus {
  AVAILABLE
  ON_LOAN
  UNDER_MAINTENANCE
  RETIRED
}

enum LoanStatus {
  ACTIVE
  OVERDUE
  RETURNED
  LOST
}

enum StockTransactionType {
  CONSUMPTION
  TEMPORARY_LOAN
  RETURN_RESTOCK
  REPLENISHMENT
  AUDIT_CORRECTION
  WRITE_OFF
}

enum ExtensionStatus {
  PENDING
  APPROVED
  REJECTED
}

enum DamageReportStatus {
  PENDING
  INVESTIGATING
  RESOLVED
  DISMISSED
}

// ==========================================
// MODULE 2: INVENTORY & EQUIPMENT MODELS
// ==========================================

model EquipmentItem {
  id                      String            @id @default(uuid())
  assetTag                String?           @unique
  name                    String
  description             String?
  trackingType            TrackingType      @default(SERIALIZED)
  category                EquipmentCategory
  ageGroup                AgeGroup          @default(UNIVERSAL)
  condition               ItemCondition     @default(GOOD)
  status                  ItemStatus        @default(AVAILABLE)
  storageLocation         String
  totalQuantity           Int               @default(1)
  availableQuantity       Int               @default(1)
  lowStockThreshold       Int?
  purchasePriceMinorUnits Int?              // Stored in integer øre (DKK), e.g. 129900 = 1,299.00 DKK
  acquisitionDate         DateTime?
  warrantyExpiresAt       DateTime?
  isRetired               Boolean           @default(false)
  retiredReason           String?
  retiredAt               DateTime?
  createdAt               DateTime          @default(now())
  updatedAt               DateTime          @updatedAt

  loans             EquipmentLoan[]
  stockTransactions StockTransaction[]
  damageReports     EquipmentDamageReport[]

  @@index([category, status])
  @@index([storageLocation])
  @@index([trackingType])
}

model EquipmentLoan {
  id                   String        @id @default(uuid())
  equipmentItemId      String
  borrowerProfileId    String
  quantity             Int           @default(1)
  teamOrSquadName      String?
  status               LoanStatus    @default(ACTIVE)
  issuedById           String
  checkedOutAt         DateTime      @default(now())
  expectedReturnAt     DateTime
  checkoutCondition    ItemCondition
  checkoutNotes        String?
  returnedAt           DateTime?
  receivedById         String?
  returnCondition      ItemCondition?
  returnNotes          String?
  lastReminderSentAt   DateTime?     // For 24-hour reminder cooldown guard
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt

  equipmentItem   EquipmentItem            @relation(fields: [equipmentItemId], references: [id], onDelete: Restrict)
  borrowerProfile MemberProfile            @relation("BorrowerLoans", fields: [borrowerProfileId], references: [id], onDelete: Restrict)
  issuedBy        MemberProfile            @relation("IssuedLoans", fields: [issuedById], references: [id], onDelete: Restrict)
  receivedBy      MemberProfile?           @relation("ReceivedLoans", fields: [receivedById], references: [id], onDelete: SetNull)
  extensions      EquipmentLoanExtension[]
  damageReports   EquipmentDamageReport[]

  @@index([borrowerProfileId, status])
  @@index([equipmentItemId, status])
  @@index([expectedReturnAt, status])
}

model StockTransaction {
  id                   String               @id @default(uuid())
  equipmentItemId      String
  transactionType      StockTransactionType
  quantityDelta        Int
  totalQuantityAfter   Int
  availableQuantityAfter Int
  recipientProfileId   String?
  teamOrSquadName      String?
  reason               String?
  recordedById         String
  createdAt            DateTime             @default(now())

  equipmentItem    EquipmentItem  @relation(fields: [equipmentItemId], references: [id], onDelete: Restrict)
  recipientProfile MemberProfile? @relation("StockRecipients", fields: [recipientProfileId], references: [id], onDelete: SetNull)
  recordedBy       MemberProfile  @relation("StockRecorders", fields: [recordedById], references: [id], onDelete: Restrict)

  @@index([equipmentItemId, transactionType])
  @@index([createdAt])
}

model EquipmentLoanExtension {
  id                 String          @id @default(uuid())
  loanId             String
  requestedById      String
  proposedReturnAt   DateTime
  reason             String
  status             ExtensionStatus @default(PENDING)
  reviewedById       String?
  reviewedAt         DateTime?
  rejectionReason    String?
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  loan        EquipmentLoan  @relation(fields: [loanId], references: [id], onDelete: Cascade)
  requestedBy MemberProfile  @relation("ExtensionRequesters", fields: [requestedById], references: [id], onDelete: Restrict)
  reviewedBy  MemberProfile? @relation("ExtensionReviewers", fields: [reviewedById], references: [id], onDelete: SetNull)

  @@index([loanId, status])
}

model EquipmentDamageReport {
  id              String             @id @default(uuid())
  equipmentItemId String
  equipmentLoanId String?
  reportedById    String
  severity        String             // "MINOR" | "MAJOR" | "BEYOND_REPAIR" | "LOST"
  description     String
  status          DamageReportStatus @default(PENDING)
  resolutionNotes String?
  resolvedById    String?
  resolvedAt      DateTime?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  equipmentItem EquipmentItem  @relation(fields: [equipmentItemId], references: [id], onDelete: Restrict)
  loan          EquipmentLoan? @relation(fields: [equipmentLoanId], references: [id], onDelete: SetNull)
  reportedBy    MemberProfile  @relation("DamageReporters", fields: [reportedById], references: [id], onDelete: Restrict)
  resolvedBy    MemberProfile? @relation("DamageResolvers", fields: [resolvedById], references: [id], onDelete: SetNull)

  @@index([equipmentItemId, status])
  @@index([reportedById])
}
```

---

## 2. Updated `MemberProfile` Relations

`MemberProfile` in `prisma/schema.prisma` will be extended with the reverse relation definitions:

```prisma
model MemberProfile {
  // Existing fields...

  // Module 2 Relations:
  borrowedEquipment      EquipmentLoan[]          @relation("BorrowerLoans")
  issuedEquipment        EquipmentLoan[]          @relation("IssuedLoans")
  receivedEquipment      EquipmentLoan[]          @relation("ReceivedLoans")
  receivedStock          StockTransaction[]       @relation("StockRecipients")
  recordedStock          StockTransaction[]       @relation("StockRecorders")
  requestedExtensions    EquipmentLoanExtension[] @relation("ExtensionRequesters")
  reviewedExtensions     EquipmentLoanExtension[] @relation("ExtensionReviewers")
  reportedEquipmentDamage EquipmentDamageReport[]  @relation("DamageReporters")
  resolvedEquipmentDamage EquipmentDamageReport[]  @relation("DamageResolvers")
}
```

---

## 3. Relational & Business Invariants

1. **At Most One Active Loan per Serialized Asset**:
   - For `SERIALIZED` items, there can be at most one loan with `status in [ACTIVE, OVERDUE]`.
   - Enforced programmatically in `checkout.service.ts` inside a Prisma interactive transaction (`SELECT ... FOR UPDATE` via atomic status condition check `where: { id, status: 'AVAILABLE' }`).
2. **Terminal RETIRED State**:
   - No update may set `status` from `RETIRED` to any other status.
   - Deleting an asset with active loans is strictly blocked by `onDelete: Restrict`.
3. **Integer Currency Precision (Constitution Domain Constraint)**:
   - `purchasePriceMinorUnits` is an integer storing øre (1 DKK = 100 øre).
   - Prevents IEEE-754 floating point arithmetic distortion.
4. **GDPR Anonymization Retention**:
   - `borrowerProfileId` references `MemberProfile.id`.
   - When a user is anonymized, `MemberProfile` is retained with `firstName: "Former"`, `lastName: "Member #..."`, preserving historical checkout analytics without breaking foreign keys.
