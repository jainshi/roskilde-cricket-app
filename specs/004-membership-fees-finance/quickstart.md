# Developer Quickstart: Membership Subscriptions, Club Fees & Finance

**Feature Branch**: `004-membership-fees-finance`  
**Date**: 2026-10-27  
**Module**: Module 4 (`src/modules/finance/`)

---

## 1. Prerequisites & Database Migration

Verify your local database connection and execute the Prisma migration adding the 5 Module 4 models and relations:

```bash
# 1. Verify PostgreSQL connection
cat .env | grep -E "DATABASE_URL|DIRECT_URL"

# 2. Run Prisma migration for Module 4 schema additions
npx prisma migrate dev --name add_membership_fees_finance_module

# 3. Regenerate Prisma Client
npx prisma generate
```

---

## 2. Realistic Club Seed Data

Run the dedicated finance seed script populating RCC membership plans, active household subscriptions, seasonal invoices, and payment transactions:

```bash
npm run seed:finance
```

Seeded records:
- **Membership Plans**:
  - `Senior Competitive 2026` (`180000` øre / 1,800.00 DKK, `ANNUAL`)
  - `Youth U15/U13 2026` (`100000` øre / 1,000.00 DKK, `ANNUAL`, 25% sibling discount)
  - `Social / Passive Member 2026` (`40000` øre / 400.00 DKK, `ANNUAL`)
  - `Winter Indoor Add-On 2026/27` (`35000` øre / 350.00 DKK, `WINTER_INDOOR`)
- **Household Subscriptions & Invoices**:
  - Emil & Lucas Mikkelsen (linked minor sons of Lars Mikkelsen): Emil billed 1,000.00 DKK, Lucas billed 750.00 DKK (25% sibling discount automatically applied).
  - Sample ad-hoc invoice for Module 2 damaged batting pads (`EQUIPMENT_CHARGE`).
  - Sample invoice overdue by >14 days to test the Module 3 Match Selection warning badge.

---

## 3. Running Unit & Domain Test Suites

Unit tests for pure financial domain logic execute in Vitest without requiring a live database connection:

```bash
# Run all unit tests
npm run test:unit

# Run specifically the finance domain and GDPR tests
npx vitest run tests/unit/finance/
```

### Key Domain Test Suites
1. `money-oere.test.ts`:
   - Verifies integer minor units (`øre`) addition, subtraction, and balance calculation.
   - Verifies deterministic `Math.round` percentage discount rounding with zero floating-point error.
   - Verifies Danish currency formatting (`"1.800,00 kr."`).
2. `season-billing.test.ts`:
   - Verifies fixed seasonal date range bounds (`SUMMER_OUTDOOR`, `WINTER_INDOOR`, `ANNUAL`).
   - Verifies start-of-season invoice eligibility matching.
3. `family-discount.test.ts`:
   - Verifies sorting linked youth subscriptions by `amountOere` descending.
   - Verifies highest-priced youth pays 100%, lower-priced youth receives 25% sibling discount.
   - Verifies manual Treasurer/Admin discount overrides take precedence when set.
4. `invoice-lifecycle.test.ts`:
   - Verifies deterministic sequential reference formatting (`RCC-INV-YYYY-####`).
   - Verifies state transitions (`DRAFT` $\rightarrow$ `OPEN` $\rightarrow$ `PENDING_VERIFICATION` $\rightarrow$ `PAID`).
   - Verifies informational amber `"Fees Overdue (>14d)"` badge rule evaluation.
5. `bogfoeringsloven-export.test.ts`:
   - Verifies UTF-8 BOM CSV output formatting for Danish Excel/Numbers compatibility.
   - Verifies 5-year statutory audit retention calculation.
6. `finance-gdpr-guard.test.ts`:
   - Verifies that GDPR Article 17 erasure is strictly blocked if a member (or linked child) has open unpaid invoices.
   - Verifies that upon approved erasure, personal billing notes and payment commentary are purged while 5-year accounting ledger records remain preserved on `"Former Member #[HASH]"`.
   - Verifies that GDPR Article 20 export bundles subscriptions, invoices, and payments.

---

## 4. Manual Browser Verification Scenarios

### Scenario A: Sibling Discount & Consolidated Family Billing (<30s)
1. Sign in as a Parent (e.g. `lars@example.dk`).
2. Navigate to **Family Billing** (`/billing` or via `HeaderProfileSwitcher`).
3. Verify that both linked youth players (Emil & Lucas) appear on a single consolidated statement.
4. Verify that the second child's membership automatically reflects the 25% sibling discount (750.00 DKK vs 1,000.00 DKK).

### Scenario B: 1-Tap Mobile Payment Reporting (360px Viewport)
1. Open an `OPEN` invoice on a 360px mobile viewport emulator.
2. Confirm the club MobilePay number and deterministic reference code `RCC-INV-2026-0042` are prominently displayed.
3. Tap **"Mark as Paid"**, enter a transaction note ("MobilePay from 20202020"), and submit in <30 seconds.
4. Verify invoice status transitions to `PENDING_VERIFICATION`.

### Scenario C: Treasurer 1-Click Reconciliation Queue
1. Sign in as Admin / Treasurer.
2. Navigate to **Treasurer Finance Console** (`/admin/finance`).
3. In the Reconciliation Queue, locate the reported invoice and click **"Confirm Payment"**.
4. Confirm invoice status transitions to `PAID`, settlement date is stamped, and paid receipt is generated.

### Scenario D: Module 3 Match Selection Overdue Warning Badge
1. Open the Match-Day Squad Selection Console (`/events/[id]/selection`) for an upcoming fixture.
2. Verify that any player with an invoice overdue by >14 days displays an amber **"Fees Overdue (>14d)"** badge.
3. Confirm that the Coach is still able to select the player into the Playing XI (informational warning, no hard block).

### Scenario E: Danish Bogføringsloven Accounting Ledger Export
1. In the Finance Console (`/admin/finance/reports`), select the current fiscal year.
2. Click **"Export Accounting Ledger (CSV)"**.
3. Verify the downloaded CSV opens cleanly with Danish UTF-8 formatting and correct accounting columns.
