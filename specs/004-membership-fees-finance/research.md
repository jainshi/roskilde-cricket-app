# Technical Research: Membership Subscriptions, Club Fees & Finance

**Feature Branch**: `004-membership-fees-finance`  
**Date**: 2026-10-27  
**Module**: Module 4 Finance Domain (`src/modules/finance/`)

---

## 1. Modular Domain Architecture & Boundaries

Adhering to Constitution Principle I (Type-Safe Full-Stack Modular Architecture), the application organizes domain business logic, data models, validation contracts, and UI components into a dedicated `finance` module. Module 4 manages membership subscription plans, fixed seasonal billing schedules, automatic sibling discounts, invoice generation (seasonal and ad-hoc), mobile 1-tap payment self-reporting, Treasurer 1-click reconciliation, Bogføringsloven accounting ledger export, and cross-module GDPR safeguards.

```text
src/modules/finance/
├── domain/                         # Pure, framework-agnostic TypeScript business logic (zero Prisma, zero React)
│   ├── money-oere.ts               # Integer øre arithmetic, DKK formatting, percentage discount rounding
│   ├── season-billing.ts           # Fixed Club Season date ranges & start-of-season invoice batching rules
│   ├── family-discount.ts          # Sibling discount calculator (lower-priced tier discounted) + admin overrides
│   ├── invoice-lifecycle.ts        # RCC-INV-YYYY-#### generator, state machine & >14d overdue warning badge evaluator
│   └── bogfoeringsloven-export.ts  # Danish Bookkeeping Act UTF-8 CSV generator & 5-year retention evaluator
├── contracts/                      # Runtime Zod validation schemas and TypeScript DTOs
│   ├── plan.contract.ts            # Membership plan creation & updates
│   ├── subscription.contract.ts    # Member subscription enrollment & manual overrides
│   ├── invoice.contract.ts         # Seasonal batch & ad-hoc invoice creation
│   ├── payment.contract.ts         # Member 1-tap "Mark as Paid" self-reporting
│   ├── reconciliation.contract.ts  # Treasurer 1-click verification, waivers & overdue reminder dispatch
│   └── ledger.contract.ts          # Bogføringsloven accounting ledger export filters
├── services/                       # Database orchestration with atomic Prisma transactions
│   ├── plan.service.ts             # Plan directory, pricing & sibling discount defaults
│   ├── subscription.service.ts     # Member subscriptions & discount application
│   ├── invoice.service.ts          # Batch generation, ad-hoc billing & family rollup views
│   ├── payment.service.ts          # Member self-reporting & receipt generation
│   ├── reconciliation.service.ts   # Verification queue, partial payments & overdue reminders
│   └── bogfoeringsloven.service.ts # Fiscal year accounting export & statutory audit checks
└── actions/                        # Next.js Server Actions with RBAC & session verification
    ├── plan.actions.ts
    ├── subscription.actions.ts
    ├── invoice.actions.ts
    ├── payment.actions.ts
    ├── reconciliation.actions.ts
    └── ledger.actions.ts
```

### Module Boundary Crossings
- **Auth/RBAC Module (`src/modules/auth-rbac`)**:
  - `requireActivatedSession()`, central `hasPermission(session, permission)` check, and `validateDelegationAccess()`.
  - `HeaderProfileSwitcher`: Powers the consolidated **Family Billing Dashboard**, aggregating household invoices for parents with linked youth players.
  - `NotificationService`: Sends itemized billing invoices, payment confirmation receipts, and Treasurer-triggered overdue reminders simultaneously to both linked parents for minor players.
  - `gdpr-deletion.service.ts`: Enforces the GDPR Article 17 Erasure Guard by blocking account erasure if open/unpaid balances exist; upon erasure, strips personal billing/payment notes while preserving 5-year statutory accounting records on `"Former Member #[HASH]"`.
  - `gdpr-export.service.ts`: Expands "Download My Data" exports to include subscriptions, invoices, and payment transactions.
- **Inventory Module (`src/modules/inventory`)**:
  - Automatically links ad-hoc fee invoices to unreturned or damaged equipment incidents (`EquipmentLoan` and `EquipmentDamageReport`).
- **Teams & Scheduling Module (`src/modules/teams-matches`)**:
  - Allows linking ad-hoc fee invoices to specific matches, tournaments, or indoor training sessions (`ScheduledEvent`).
  - Displays an informational amber `"Fees Overdue (>14d)"` warning badge in the Coach Match Squad Selection Console (`/events/[id]/selection`), respecting coach tactical autonomy without hard-blocking selection.

---

## 2. Pure Domain Rules & Mathematical Formulations

### 2.1 Integer Øre Arithmetic & Zero Floating-Point Precision (`money-oere.ts`)
- **Constraint (Constitution Domain Integrity Constraints)**: All currency values must be stored as integer minor units (`øre`, where 100 øre = 1.00 DKK). Floating-point representations (`number` with decimals) are prohibited for financial calculations to prevent floating-point drift (e.g. `0.1 + 0.2 = 0.30000000000000004`).
- **Formulas**:
  - `toDkkString(amountOere: number): string` formats as Danish standard: e.g., `180000` øre $\rightarrow$ `"1.800,00 kr."`.
  - `applyPercentDiscount(amountOere: number, percent: number): { discountOere: number; finalOere: number }`:
    $$\text{discountOere} = \text{Math.round}\left(\frac{\text{amountOere} \times \text{percent}}{100}\right)$$
    $$\text{finalOere} = \text{amountOere} - \text{discountOere}$$
  - `calculateRemainingBalance(totalOere: number, paidOere: number): number`:
    $$\text{remainingOere} = \max(0, \text{totalOere} - \text{paidOere})$$

### 2.2 Fixed Club Seasons & Billing Cycles (`season-billing.ts`)
- **Clarification 1**: Club billing runs on fixed seasonal cycles rather than rolling sign-up anniversaries:
  - `SUMMER_OUTDOOR`: April 1 to September 30 (e.g., Summer 2026: `2026-04-01T00:00:00.000Z` to `2026-09-30T23:59:59.999Z`).
  - `WINTER_INDOOR`: October 1 to March 31 of the following year (e.g., Winter 2026/27: `2026-10-01T00:00:00.000Z` to `2027-03-31T23:59:59.999Z`).
  - `ANNUAL`: Full competition season April 1 to March 31 of the following year.
- **Start-of-Season Batching**: When a season opens, the Treasurer can batch-generate invoices for all active roster members assigned to corresponding squads (e.g., 1st XI & 2nd XI $\rightarrow$ Senior Competitive Annual; U13 & U15 $\rightarrow$ Youth U15/U13 Annual/Summer).

### 2.3 Automated Household Sibling Discount Engine (`family-discount.ts`)
- **Clarification 2**: When a Parent account has 2 or more active minor youth players (`isMinor === true`), the system calculates sibling discounts deterministically:
  1. Retrieve all active youth subscriptions in the household.
  2. Sort subscriptions in descending order of plan `amountOere`.
  3. The first (highest-priced) youth membership pays **100%** of the plan fee (`discountAppliedOere = 0`).
  4. The second and subsequent youth memberships receive the plan's configured sibling discount (default **25%** off: `discountAppliedOere = Math.round(amountOere * 0.25)`).
- **Manual Override Capability**: The Treasurer or Administrator may apply a manual discount override (`manualDiscountOere` or `manualDiscountPercent`) per subscription or invoice with a mandatory `overrideReason` and audit record.

### 2.4 Invoice Lifecycle & Payment Reference Generator (`invoice-lifecycle.ts`)
- **Clarification 4**: Payment reference codes use a deterministic human-readable format matching the invoice number:
  $$\text{Invoice Number} = \text{"RCC-INV-" + year + "-" + sequenceNumber.padStart(4, "0")}$$
  *Example*: `RCC-INV-2026-0042`.
  This allows members to type or copy the exact code into MobilePay comment fields or bank transfer messages, enabling immediate Treasurer visual identification.
- **State Machine**:
  ```text
  [ DRAFT ] ──────────> [ OPEN / ISSUED ] ───(Member "Mark as Paid")───> [ PENDING_VERIFICATION ]
                              │                                                    │
                   (Due date passes)                                    (Treasurer Reconciles)
                              ▼                                                    ▼
                         [ OVERDUE ]                                            [ PAID ]
                              │
                    (Partial payment)
                              ▼
                     [ PARTIALLY_PAID ]
  ```
  *(Additional terminal states: `WAIVED` with required reason; `CANCELLED` for billing adjustments).*
- **Clarification 3**: An informational amber `"Fees Overdue (>14d)"` badge is displayed in Module 3's Match Squad Selection Console when:
  $$\text{isOverdueWarningActive} = (\text{status} \in \{\text{OPEN}, \text{PARTIALLY_PAID}, \text{OVERDUE}\}) \land (\text{now}() - \text{dueDate} \ge 14 \text{ days})$$
  The badge is informational only; team coaches retain full tactical discretion to include the player in the Playing XI.

### 2.5 Danish Bookkeeping Act Compliance (`bogfoeringsloven-export.ts`)
- **Statutory Mandate (*Bogføringsloven* § 10)**: All Danish clubs and associations must store complete accounting records, vouchers, and transactions for **5 full fiscal years** plus the current accounting year.
- **Retention Evaluator**:
  $$\text{retainedUntilDate} = \text{new Date}(\text{fiscalYear} + 6, 0, 1) \quad (\text{January 1st after 5 full years})$$
- **UTF-8 CSV Ledger Structure**:
  - Includes UTF-8 BOM (`\uFEFF`) for native Excel/Numbers compatibility.
  - Columns: `Invoice Number`, `Issue Date`, `Due Date`, `Paid Date`, `Member ID`, `Member Name`, `Category`, `Description`, `Subtotal (Øre)`, `Discount (Øre)`, `Total (Øre)`, `Total (DKK)`, `Paid (DKK)`, `Payment Method`, `Status`, `Transaction Reference`.

---

## 3. Technology & Architecture Decisions

| Decision | Selected Option | Rationale | Alternatives Evaluated |
|:---|:---|:---|:---|
| **Payment Gateway Integration** | Manual MobilePay Box/Erhverv & Bank Transfer + 1-Tap Member Confirmation + 1-Click Treasurer Queue | Typical for Danish amateur sports clubs; zero merchant account percentage fees; MobilePay and Netbank are ubiquitous in Denmark. | Stripe / Quickpay payment gateway (rejected: requires merchant fees and complex merchant registration for volunteer club). |
| **Monetary Storage** | Integer minor units (`øre`) stored in PostgreSQL `Int` / `BigInt` | Eliminates floating-point rounding errors completely; adheres to Constitution Domain Integrity Constraints. | `Decimal` / `Float` (rejected: floating-point IEEE-754 precision hazards). |
| **Sibling Discount Ordering** | Lower-priced youth tiers discounted | Ensures parents with children in competitive vs social tiers get a predictable discount without penalizing primary competitive participation. | Oldest pays full / flat percentage (rejected during clarification session). |
| **Overdue Match Selection Badge** | Informational badge only (coach discretion) | Respects youth coaching and team participation goals while ensuring overdue accounts are transparent to leadership. | Hard-blocking selection (rejected: coach needs lineup flexibility). |
| **Overdue Reminders** | Strictly manual / Treasurer-controlled dispatch | Prevents automated friction with members who have arranged special payment terms with the board. | Automatic cron reminders (rejected during clarification session). |
