# Implementation Plan: Module 4 - Membership Subscriptions, Club Fees & Finance

**Branch**: `004-membership-fees-finance` | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-membership-fees-finance/spec.md`

---

## Summary

Deliver **Module 4: Membership Subscriptions, Club Fees & Finance** for Roskilde Cricket Club (RCC). The module provides:
1. **Membership Plans & Family Discounts**: Subscription tiers (`SENIOR_COMPETITIVE`, `YOUTH_U15_U13`, `SOCIAL_PASSIVE`, `INDOOR_WINTER_ADDON`), fixed seasonal cycles (`SUMMER_OUTDOOR`, `WINTER_INDOOR`, `ANNUAL`), zero-floating-point integer `øre` (DKK) arithmetic, and automated sibling discounts (25% off lower-priced youth tiers) with explicit Treasurer manual overrides.
2. **Invoicing & Consolidated Family Billing**: Batch seasonal and ad-hoc fee generation (Module 3 tournament fees, Module 2 equipment loss/damage charges), consolidated Family Billing rollup via `HeaderProfileSwitcher`, and simultaneous dual-parent email dispatch.
3. **Mobile Payment Portal & Treasurer Reconciliation**: Touch-friendly member portal (<30s on 360px viewport) with Danish payment details (MobilePay Box/Erhverv, bank `Reg. nr.` & `Kontonr.`, deterministic `RCC-INV-YYYY-####` reference code), 1-tap "Mark as Paid" self-reporting, Treasurer 1-click reconciliation queue, and an informational amber `"Fees Overdue (>14d)"` warning badge in Module 3's Match Squad Selection Console.
4. **Danish Bookkeeping Compliance & GDPR Guards**: UTF-8 CSV accounting ledger export compliant with the Danish Bookkeeping Act (*Bogføringsloven* § 10) with statutory 5-year audit retention; GDPR Article 17 erasure blocking for open balances and note scrubbing; and GDPR Article 20 data portability export.

---

## Technical Context

**Language/Version**: TypeScript 5.7+ / Node.js 20+  
**Primary Dependencies**: Next.js 15 (App Router), React 19, Tailwind CSS, Prisma 6, Zod, Lucide React  
**Storage**: PostgreSQL with Prisma ORM; all monetary amounts stored strictly as integer minor units (`øre`, where 100 øre = 1.00 DKK)  
**Testing**: Vitest for pure domain logic and GDPR unit tests; Playwright for mobile-first browser verification  
**Target Platform**: Responsive Web (mobile-first for 360px viewport, progressively enhanced for desktop)  
**Project Type**: Full-Stack Next.js Modular Web Application  
**Performance Goals**: Member payment instructions viewed and payment self-reported in under 30 seconds on a 360px mobile viewport; initial page LCP < 1.5s on 4G  
**Constraints**:
- **Zero Floating-Point Representation**: Zero floating-point numbers allowed for money; integer `øre` arithmetic with deterministic `Math.round` percentage calculations.
- **Danish Bookkeeping Act (*Bogføringsloven* § 10)**: 5 full fiscal years + current year statutory audit retention.
- **GDPR Article 17 Erasure Guard**: Account erasure is strictly rejected if open/unpaid balances exist; upon erasure, personal notes and bank transfer comments are scrubbed while 5-year accounting ledger records remain on `"Former Member #[HASH]"`.
- **Match Selection Warning**: Overdue balances (>14 days) generate an informational amber badge in Module 3 Match Selection, never hard-blocking coach selection autonomy.  
**Scale/Scope**: 5 Prisma models, 7 enums, 5 pure domain modules, 6 Server Action contracts, consolidated Family Billing view, Treasurer reconciliation queue, and Bogføringsloven CSV export.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Constraint | Status | Compliance Details |
|:---|:---:|:---|
| **I. Type-Safe Full-Stack Modular Architecture** | **PASS** | Organized into `src/modules/finance/` with strict domain isolation (pure TypeScript business logic in `domain/`, Zod schemas in `contracts/`, database queries in `services/`, and Next.js Server Actions in `actions/`). Integrates with Module 1 `NotificationService`, Module 2 equipment charges, and Module 3 event fees via exported services. |
| **II. Security, RBAC & GDPR by Default** | **PASS** | Centralized permission enforcement via `requireActivatedSession()`; parental delegation verified via `validateDelegationAccess()`; dual-parent notifications dispatched simultaneously; Article 17 erasure blocked for open balances and personal notes scrubbed on anonymized `"Former Member #[HASH]"` shells; Article 20 export extended. |
| **III. Mobile-First Performance & Touch UX** | **PASS** | Mobile-first payment portal optimized for <30s completion on a 360px viewport with touch targets $\ge 44\times 44$ px. |
| **IV. Strict Type Safety & Pragmatic Domain Testing** | **PASS** | Strict TypeScript (`"strict": true`, no `any`), Prisma-generated types, and high-signal Vitest test suites covering integer øre math, seasonal billing cycles, sibling discounts, and Bogføringsloven exports. |
| **Domain Integrity: Currency** | **PASS** | Strictly integer minor units (`øre`) stored in PostgreSQL `Int`; user-facing formatting in Danish Kroner (`DKK`, e.g. `"1.800,00 kr."`). |
| **Domain Integrity: Time & Timezone** | **PASS** | UTC timestamps stored in database; formatted in `Europe/Copenhagen` timezone for user display. |

---

## Project Structure

### Documentation (`specs/004-membership-fees-finance/`)

```text
specs/004-membership-fees-finance/
├── spec.md                          # Feature specification with 5 clarified decisions
├── checklists/
│   └── requirements.md              # Quality checklist (16/16 passed)
├── research.md                      # Phase 0: Domain architecture & mathematical formulations
├── data-model.md                    # Phase 1: 5 Prisma models, 7 enums & reverse relations
├── contracts/
│   └── finance-actions.contract.md  # Phase 1: Server Actions & Zod validation schemas
├── quickstart.md                    # Phase 1: Setup, migration, seed script & verification guide
├── plan.md                          # This implementation plan
└── tasks.md                         # Phase 2: Dependency-ordered task breakdown (/speckit-tasks)
```

### Source Code (`src/`)

```text
src/
├── modules/
│   └── finance/
│       ├── domain/
│       │   ├── money-oere.ts              # Integer øre math, DKK formatting & discount rounding
│       │   ├── season-billing.ts          # Fixed Club Season date ranges & invoice eligibility
│       │   ├── family-discount.ts         # Sibling discount calculator (lower-priced tier) + overrides
│       │   ├── invoice-lifecycle.ts       # RCC-INV-YYYY-#### generator & >14d overdue badge rules
│       │   └── bogfoeringsloven-export.ts # UTF-8 CSV accounting ledger generator & 5-year retention
│       ├── contracts/
│       │   ├── plan.contract.ts           # Plan CRUD schemas
│       │   ├── subscription.contract.ts   # Enrollment & override schemas
│       │   ├── invoice.contract.ts        # Batch seasonal & ad-hoc invoice schemas
│       │   ├── payment.contract.ts        # 1-tap mobile payment reporting schema
│       │   ├── reconciliation.contract.ts # Treasurer verification, waivers & overdue reminders
│       │   └── ledger.contract.ts         # Bogføringsloven export schemas
│       ├── services/
│       │   ├── plan.service.ts            # Membership plan management
│       │   ├── subscription.service.ts    # Member subscriptions & discount orchestration
│       │   ├── invoice.service.ts         # Invoice generation & family rollup querying
│       │   ├── payment.service.ts         # Member payment self-reporting & receipts
│       │   ├── reconciliation.service.ts  # Verification queue, waivers & reminder dispatch
│       │   └── bogfoeringsloven.service.ts# Accounting CSV streaming & retention guards
│       └── actions/
│           ├── plan.actions.ts
│           ├── subscription.actions.ts
│           ├── invoice.actions.ts
│           ├── payment.actions.ts
│           ├── reconciliation.actions.ts
│           └── ledger.actions.ts
├── components/
│   └── finance/
│       ├── family-billing-view.tsx        # Consolidated household billing statement
│       ├── mobile-payment-modal.tsx       # 1-tap mobile payment portal (<30s on 360px)
│       ├── invoice-card.tsx               # Invoice status card with breakdown & receipt download
│       ├── treasurer-reconciliation.tsx   # 1-click verification queue & waiver dialog
│       ├── plan-manager.tsx               # Membership plans & sibling discount configuration
│       └── bogfoeringsloven-table.tsx     # Accounting ledger preview & CSV export
├── app/(dashboard)/
│   ├── billing/
│   │   ├── page.tsx                       # Member / Parent Family Billing dashboard
│   │   └── [id]/page.tsx                  # Invoice detail & printable receipt view
│   └── admin/
│       └── finance/
│           ├── page.tsx                   # Treasurer overview & reconciliation queue
│           ├── plans/page.tsx             # Membership plan configuration
│           └── reports/page.tsx           # Bogføringsloven accounting ledger export
tests/
└── unit/
    └── finance/
        ├── money-oere.test.ts             # Integer øre math & Danish currency formatting
        ├── season-billing.test.ts         # Fixed seasonal date ranges & eligibility
        ├── family-discount.test.ts        # Lower-priced youth discount & manual overrides
        ├── invoice-lifecycle.test.ts      # Reference codes, status transitions & overdue badges
        ├── bogfoeringsloven-export.test.ts# Danish accounting CSV formatting & 5-yr retention
        └── finance-gdpr-guard.test.ts     # Open-balance erasure block & note scrubbing
```

---

## Complexity Tracking

*No constitutional violations or unjustified complexity introduced.*

| Area | Decision | Justification |
|:---|:---|:---|
| **Payment Integration** | Manual MobilePay Box/Bank Transfer + 1-Tap Member Confirmation | Zero merchant transaction fees; perfect fit for Danish amateur sports club. |
| **Sibling Discount Ordering** | Lower-priced youth tiers discounted | Fair distribution of household subsidies without penalizing competitive youth. |
| **Match Selection Badge** | Informational badge only | Preserves coach tactical autonomy while providing transparent financial status. |
| **Overdue Reminders** | Strictly manual / Treasurer-triggered | Prevents automated friction with members having special payment arrangements. |
