# Technical Research: Club Inventory & Equipment Management

**Feature Branch**: `002-inventory-equipment-management`  
**Date**: 2026-10-25  
**Module**: Module 2 (`src/modules/inventory/`)

---

## 1. Domain Architecture & Boundaries

Per Constitution Principle I (Type-Safe Full-Stack Modular Architecture), the application is organized into 5 functional modules. Module 2 owns physical club assets, stock accounting, borrowing workflows, and equipment health.

```
src/modules/inventory/
├── domain/                    # Pure, framework-agnostic business logic (no Prisma, no React)
│   ├── equipment-state-machine.ts
│   ├── stock-math.ts
│   ├── return-deadline.ts
│   ├── overdue-evaluator.ts
│   └── inventory-permissions.ts
├── contracts/                 # Runtime Zod validation schemas and DTOs
│   ├── catalog.contract.ts
│   ├── checkout.contract.ts
│   ├── checkin.contract.ts
│   ├── extension.contract.ts
│   └── damage.contract.ts
├── services/                  # Database orchestration with Prisma transactions
│   ├── catalog.service.ts
│   ├── loan.service.ts
│   ├── extension.service.ts
│   ├── stock.service.ts
│   ├── damage.service.ts
│   ├── reminder.service.ts
│   └── inventory-gdpr.service.ts
└── actions/                   # Next.js Server Actions with RBAC & session verification
    ├── catalog.actions.ts
    ├── loan.actions.ts
    ├── extension.actions.ts
    ├── stock.actions.ts
    └── damage.actions.ts
```

### Module Boundary Crossings
- **Auth/RBAC Module (`src/modules/auth-rbac`)**:
  - Provides `requireSession()`, central permission checker `hasPermission()`, and `validateDelegationAccess()`.
  - Provides `resolveMemberContacts()` for dual-parent contact fallback when notifying minors.
  - Integrates with `gdpr-deletion.service.ts` to block account anonymization while active/overdue equipment loans are outstanding.
- **Communications Module (`src/modules/auth-rbac/notifications`)**:
  - Provides pluggable `notificationService` for checkout confirmation, extension status, overdue escalation notices, and damage reports.

---

## 2. Equipment State Machine & Serialized Invariants

Constitution Domain Integrity Constraints require the equipment status state machine to be strictly defined in code and backed by a database enum:

```
                  +--------------------------------+
                  |                                |
                  v                                |
           +--------------+                +---------------+
           |              | -- Check Out ->|               |
           |  AVAILABLE   |                |    ON_LOAN    |
           |              | <- Check In ---|               |
           +--------------+                +---------------+
             |          ^                          |
             |          |                          | Return with damage
     Inspect |          | Repair Complete          | (NEEDS_REPAIR)
             v          |                          v
         +--------------------+                    |
         |                    |<-------------------+
         | UNDER_MAINTENANCE  |
         |                    |
         +--------------------+
             |
             | Irreparable damage / Loss
             v
         +--------------------+
         |      RETIRED       |  (Terminal state)
         +--------------------+
```

### Transition Matrix

| Current State | Target State | Permitted Roles | Condition / Invariant |
|---|---|---|---|
| `AVAILABLE` | `ON_LOAN` | `ADMIN`, `COACH`, `AD_HOC_COACH` | At most 1 active loan per serialized item (database unique index). |
| `ON_LOAN` | `AVAILABLE` | `ADMIN`, `COACH`, `AD_HOC_COACH` | Returned condition is `NEW`, `GOOD`, or `FAIR`. Loan marked `RETURNED`. |
| `ON_LOAN` | `UNDER_MAINTENANCE` | `ADMIN`, `COACH`, `AD_HOC_COACH` | Returned condition is `NEEDS_REPAIR`. Damaged return notes logged. |
| `AVAILABLE` | `UNDER_MAINTENANCE` | `ADMIN`, `COACH` | Pre-loan inspection identifies defect; routed for servicing. |
| `UNDER_MAINTENANCE` | `AVAILABLE` | `ADMIN`, `COACH` | Servicing/repair complete, condition updated to `GOOD` or `FAIR`. |
| `UNDER_MAINTENANCE` | `RETIRED` | `ADMIN` | Decommissioned, cracked beyond repair, or written off. Terminal state. |
| `ON_LOAN` | `RETIRED` | `ADMIN` | Confirmed lost/stolen gear written off directly from open loan. |
| `RETIRED` | *Any* | *Forbidden* | **Terminal**: No transitions out of `RETIRED` are permitted under any circumstances. |

---

## 3. Bulk Consumable Stock Math & Transaction Types

To satisfy Clarification 1, bulk inventory distinguishes between **temporary loans** (`RETURNABLE_LOAN`) and **direct consumption** (`DIRECT_CONSUMPTION`):

### Stock Math Rules

1. **Serialized Asset (`trackingType: SERIALIZED`)**:
   - `totalQuantity` = 1 (constant)
   - `availableQuantity` = 1 when `status == AVAILABLE`, 0 when `status in [ON_LOAN, UNDER_MAINTENANCE, RETIRED]`.
2. **Bulk Consumable (`trackingType: BULK`)**:
   - `totalQuantity` = Total physical stock owned by the club.
   - `availableQuantity` = Stock currently in the shed available for immediate checkout/consumption.
   - `loanedQuantity` = Sum of active loan quantities.
   - Invariant: `availableQuantity + activeLoanQuantities <= totalQuantity`.
   - Low-stock condition: `availableQuantity <= lowStockThreshold`.

### Transaction Types (`StockTransaction`)

| Transaction Type | `totalQuantity` Delta | `availableQuantity` Delta | Loan Record Created? | Example Use Case |
|---|---|---|---|---|
| `CONSUMPTION` | `-qty` | `-qty` | No | 2 new leather balls issued for Senior league fixture. |
| `TEMPORARY_LOAN` | `0` | `-qty` | Yes (`EquipmentLoan`) | 6 cones and 4 practice balls loaned for training session. |
| `RETURN_RESTOCK` | `0` | `+returnedQty` | Closed (`RETURNED`) | 4 practice balls returned to shed after practice. |
| `REPLENISHMENT` | `+qty` | `+qty` | No | Admin purchases box of 24 match balls from vendor. |
| `AUDIT_CORRECTION` | `+/-delta` | `+/-delta` | No | Annual pre-season inventory audit reconciles physical count. |
| `WRITE_OFF` | `-qty` | `-qty` | No (or closes lost loan) | Broken training bibs or lost balls decommissioned. |

---

## 4. Intelligent Category Return Deadline Calculator

To satisfy Clarification 2 and pitch-side mobile speed constraints (<30 seconds):

```typescript
export interface DeadlineCalculationParams {
  category: EquipmentCategory;
  now?: Date;
  seasonEndDate?: Date;
}

export function calculateDefaultReturnDeadline(params: DeadlineCalculationParams): Date {
  const { category, now = new Date(), seasonEndDate } = params;
  
  switch (category) {
    case "FACILITY_KEYS":
    case "BOWLING_BALLS": // Match-day loan use
      // Same-Day 23:59:59 local time (Europe/Copenhagen)
      return getEndOfLocalDay(now);

    case "BATTING":
    case "PROTECTIVE":
    case "TRAINING_GROUND":
      // +7 calendar days at 23:59:59 local time
      return addLocalDays(getEndOfLocalDay(now), 7);

    case "APPAREL_KIT":
      // End of playing season (defaults to Sept 30 or +180 days)
      if (seasonEndDate && seasonEndDate > now) {
        return seasonEndDate;
      }
      return addLocalDays(getEndOfLocalDay(now), 180);

    default:
      return addLocalDays(getEndOfLocalDay(now), 7);
  }
}
```

---

## 5. Overdue Evaluator & 24-Hour Reminder Cooldown

To satisfy Clarification 5 and prevent notification spam:

```typescript
export function isLoanOverdue(loan: { expectedReturnAt: Date; returnedAt: Date | null }, now = new Date()): boolean {
  if (loan.returnedAt) return false;
  return now.getTime() > loan.expectedReturnAt.getTime();
}

export function canSendOverdueReminder(
  loan: { lastReminderSentAt: Date | null },
  now = new Date(),
  cooldownHours = 24
): boolean {
  if (!loan.lastReminderSentAt) return true;
  const elapsedMs = now.getTime() - loan.lastReminderSentAt.getTime();
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  return elapsedMs >= cooldownMs;
}
```

### Dispatch Architecture
- **Scheduled Job**: Exposed via secured endpoint `POST /api/inventory/cron/overdue` with `Authorization: Bearer ${CRON_SECRET}`. Runs daily at 08:00 Copenhagen time.
- **On-Demand Dispatch**: Admin/Coach clicks "Send Overdue Reminders" in the console. The server action iterates overdue loans, filters using `canSendOverdueReminder`, dispatches emails via `notificationService`, and updates `lastReminderSentAt` atomically.

---

## 6. Financial Liability & Write-Off Boundaries

Per Clarification 4 and Constitution Domain Integrity Constraints:
- Equipment purchase and replacement costs are stored in **integer minor units (`øre`)** (`purchasePriceMinorUnits: Int?`).
- In the UI, amounts are formatted using `Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' })`.
- When an asset is retired due to damage or loss:
  - The audit log and damage report capture `replacementCostMinorUnits` as an informational reference.
  - Invoicing, billing, or collecting fees from members is **strictly deferred** to the upcoming Finance Module. Module 2 creates zero billing records or financial liabilities.

---

## 7. Cross-Module GDPR Erasure Integration

To safeguard club assets during GDPR Article 17 account deletion requests:

1. **Erasure Blocker Guard**:
   - `src/modules/inventory/services/inventory-gdpr.service.ts` exports `hasActiveOrOverdueLoans(profileId: string): Promise<{ hasActive: boolean; count: number; items: string[] }>`.
   - Checks active loans where `borrowerProfileId === profileId` OR where `borrowerProfileId` belongs to a linked minor child of `profileId`.
   - `gdpr-deletion.service.ts` invokes this guard prior to executing anonymization.
   - If `hasActive === true`, the deletion request is blocked with an explicit error: `"Cannot anonymize member: profile (or linked minor) has active equipment loans that must be checked in first."`
2. **Historical Loan Retention on Statistical Shell**:
   - When anonymization proceeds for a member with completed (past) loans, their `MemberProfile` has `firstName`, `lastName`, and email scrubbed to `"Former Member #<shortId>"`.
   - Because `MemberProfile.id` is preserved, past `EquipmentLoan` records retain relational consistency without orphaned foreign keys.
