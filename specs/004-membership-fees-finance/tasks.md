# Tasks: Module 4 - Membership Subscriptions, Club Fees & Finance

**Feature Branch**: `004-membership-fees-finance`  
**Date**: 2026-10-27  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md) | **Contracts**: [finance-actions.contract.md](./contracts/finance-actions.contract.md)

---

## Phase 1: Setup & Prisma Schema Migration (Shared Infrastructure)

**Purpose**: Database schema expansion, relational migrations, test data seeding, and core module directory structure.

- [X] T001 Define Module 4 enums (`MembershipCategory`, `BillingCycle`, `SubscriptionStatus`, `InvoiceCategory`, `InvoiceStatus`, `PaymentMethod`, `TransactionStatus`) and models (`MembershipPlan`, `MemberSubscription`, `Invoice`, `InvoiceLineItem`, `PaymentTransaction`) with integer minor units (`amountOere Int`, `siblingDiscountPercent Int @default(25)`) in `prisma/schema.prisma`
- [X] T002 Add reverse relations on `MemberProfile` (`subscriptions`, `subscriptionOverrides`, `invoicesReceived`, `invoicesBilled`, `paymentsReported`, `paymentsVerified`), `EquipmentLoan` (`adHocInvoices`), and `ScheduledEvent` (`adHocInvoices`) in `prisma/schema.prisma`
- [X] T003 Generate and execute database migration `add_membership_fees_finance` via `npx prisma migrate dev` in `prisma/migrations/`
- [X] T004 [P] Update database seed script `prisma/seed.ts` with realistic Roskilde Cricket Club membership plans (`SENIOR_COMPETITIVE` 1,800.00 DKK / 180,000 øre, `YOUTH_U15_U13` 1,000.00 DKK / 100,000 øre, `SOCIAL_PASSIVE` 400.00 DKK / 40,000 øre, `INDOOR_WINTER_ADDON` 350.00 DKK / 35,000 øre), active subscriptions, sibling discounts, sample invoices (`RCC-INV-2026-0001`), and payment transactions
- [X] T005 [P] Create finance module directory structure and index barrel in `src/modules/finance/index.ts`

---

## Phase 2: Foundational: Pure Domain Logic & Unit Tests (Blocking Prerequisites)

**Purpose**: Core mathematical, seasonal, sibling discount, invoice lifecycle, and Bogføringsloven bookkeeping business rules implemented as zero-dependency pure TypeScript functions.

**⚠️ CRITICAL**: No user story Server Actions or UI components can be built until these pure domain modules and their accompanying unit tests pass.

- [X] T006 [P] Implement pure zero-floating-point integer `øre` arithmetic, Danish currency formatting (`1.250,00 kr.`), deterministic `Math.round` percentage calculations, and remaining balance reconciliation in `src/modules/finance/domain/money-oere.ts`
- [X] T007 [P] Create Vitest unit test suite for integer `øre` math, formatting, and edge rounding in `tests/unit/finance/money-oere.test.ts`
- [X] T008 [P] Implement fixed club season date-range resolver (Summer Outdoor: Apr 1 – Sep 30, Winter Indoor: Oct 1 – Mar 31, Full Annual: Apr 1 – Mar 31) and invoice eligibility evaluator in `src/modules/finance/domain/season-billing.ts`
- [X] T009 [P] Create Vitest unit test suite for fixed club season date resolution and eligibility evaluation in `tests/unit/finance/season-billing.test.ts`
- [X] T010 [P] Implement automatic household youth sibling discount calculator (sort by `amountOere` descending; 25% discount off lower-priced youth tiers) and manual Treasurer override handler in `src/modules/finance/domain/family-discount.ts`
- [X] T011 [P] Create Vitest unit test suite for sibling discount ordering, multi-child household calculations, and manual overrides in `tests/unit/finance/family-discount.test.ts`
- [X] T012 [P] Implement sequential invoice reference generator (`RCC-INV-YYYY-####`), lifecycle state transitions, and `>14d` overdue badge evaluator in `src/modules/finance/domain/invoice-lifecycle.ts`
- [X] T013 [P] Create Vitest unit test suite for `RCC-INV-YYYY-####` reference formatting, lifecycle state transitions, and overdue badge logic in `tests/unit/finance/invoice-lifecycle.test.ts`
- [X] T014 [P] Implement Bogføringsloven § 10 UTF-8 CSV generator and 5-year statutory audit retention checker (`currentYear + 5 years`) in `src/modules/finance/domain/bogfoeringsloven-export.ts`
- [X] T015 [P] Create Vitest unit test suite for Bogføringsloven CSV ledger formatting, BOM encoding, and statutory retention evaluation in `tests/unit/finance/bogfoeringsloven-export.test.ts`

**Checkpoint**: Foundation ready - all unit tests pass; domain models and rules are fully verified.

---

## Phase 3: User Story 1 - Membership Plans, Subscriptions & Family Discount Management (Priority: P1) 🎯 MVP

**Goal**: Enable Club Treasurers and Administrators to configure club membership plans across tiers in integer `øre`, enroll adult and youth players across Fixed Club Seasons, automatically calculate household sibling discounts (25% off lower-priced youth tiers), and support manual discount overrides.

**Independent Test**: Create plans (Senior Competitive at 180,000 øre, Youth U15/U13 at 100,000 øre, Social/Passive at 40,000 øre, Winter Indoor at 35,000 øre), enroll two children of a single parent, verify the second child is automatically discounted to 75,000 øre, apply a manual discount override, and verify storage in the database.

- [X] T016 [P] [US1] Define Zod schemas and TypeScript contracts for plan CRUD and subscription enrollment (`createMembershipPlanSchema`, `updateMembershipPlanSchema`, `enrollMemberSubscriptionSchema`) in `src/modules/finance/contracts/plan.contract.ts` and `src/modules/finance/contracts/subscription.contract.ts`
- [X] T017 [US1] Implement MembershipPlan database service with validation, duplicate code prevention, and active filtering in `src/modules/finance/services/plan.service.ts`
- [X] T018 [US1] Implement MemberSubscription database service with automated sibling discount application and manual override metadata storage (`overrideById`, `overrideReason`) in `src/modules/finance/services/subscription.service.ts`
- [X] T019 [US1] Implement Server Actions for plan management and subscription enrollment (`createMembershipPlanAction`, `updateMembershipPlanAction`, `enrollMemberSubscriptionAction`) with `ADMIN`/`TREASURER` RBAC guards in `src/modules/finance/actions/plan.actions.ts` and `src/modules/finance/actions/subscription.actions.ts`
- [X] T020 [P] [US1] Build Membership Plan management UI component with integer `øre` inputs, category badges, and sibling discount percentage slider in `src/components/finance/plan-manager.tsx`
- [X] T021 [P] [US1] Build Member Subscription enrollment modal with automatic sibling discount preview and Treasurer manual discount override fields in `src/components/finance/subscription-enrollment-modal.tsx`
- [X] T022 [US1] Create Admin Membership Plans management dashboard page in `src/app/(dashboard)/admin/finance/plans/page.tsx`
- [X] T023 [US1] Integrate "Finance & Fees" navigation card into the 2-column App Launcher Grid in `src/components/layout/AppLauncherModal.tsx`

**Checkpoint**: User Story 1 functional and independently testable. Plans and subscriptions can be created, edited, and verified.

---

## Phase 4: User Story 2 - Seasonal Batch Invoicing, Ad-Hoc Fees & Consolidated Family Billing Rollup (Priority: P2)

**Goal**: Allow Treasurers to batch-generate seasonal membership invoices and create ad-hoc fee requests (Module 3 tournament/match fees, Module 2 damaged/unreturned equipment fees), while providing parents with a consolidated household billing view integrated with `HeaderProfileSwitcher` and simultaneous dual-parent billing notifications.

**Independent Test**: Trigger a seasonal billing batch for a squad, issue an ad-hoc equipment charge linked to an equipment loan, log in as a parent with 2 youth players, open the Family Billing dashboard, verify itemized charges for both children roll up into a single household total, and verify simultaneous dual-parent notification dispatch via `NotificationService`.

- [X] T024 [P] [US2] Define Zod schemas and TypeScript contracts for seasonal batch invoicing and ad-hoc fee creation (`generateSeasonalInvoicesSchema`, `createAdHocInvoiceSchema`) in `src/modules/finance/contracts/invoice.contract.ts`
- [X] T025 [US2] Implement seasonal batch invoice generator and ad-hoc fee creation service linking Module 2 equipment (`linkedEquipmentLoanId`) and Module 3 event (`linkedScheduledEventId`) in `src/modules/finance/services/invoice.service.ts`
- [X] T026 [US2] Implement Server Actions for seasonal batch and ad-hoc invoice creation (`generateSeasonalInvoicesAction`, `createAdHocInvoiceAction`) in `src/modules/finance/actions/invoice.actions.ts`
- [X] T027 [US2] Integrate simultaneous dual-parent notification dispatch into `InvoiceService` via Module 1's `NotificationService` in `src/modules/finance/services/invoice.service.ts`
- [X] T028 [P] [US2] Build itemized Invoice Card component with status badge (`OPEN`, `PAID`, `OVERDUE`, `PARTIALLY_PAID`, `WAIVED`), line-item breakdown, and printable view trigger in `src/components/finance/invoice-card.tsx`
- [X] T029 [P] [US2] Build Consolidated Family Billing View component grouping household invoices by child and displaying combined balance due in `src/components/finance/family-billing-view.tsx`
- [X] T030 [US2] Build Member & Parent Billing Dashboard page integrated with `HeaderProfileSwitcher` in `src/app/(dashboard)/billing/page.tsx`
- [X] T031 [US2] Build Invoice Detail view and printable HTML/PDF receipt page with club header and payment metadata in `src/app/(dashboard)/billing/[id]/page.tsx`
- [X] T032 [US2] Add Ad-Hoc Fee creation dialog to Module 2 equipment loan return flow for damaged/unreturned gear in `src/components/equipment/loan-return-modal.tsx`

**Checkpoint**: User Story 2 functional. Seasonal invoices batch-generate, ad-hoc fees link to modules, and parents view consolidated family balances.

---

## Phase 5: User Story 3 - Mobile Payment Portal, Treasurer Reconciliation Console & Module 3 Overdue Badge (Priority: P3)

**Goal**: Provide a mobile-first payment portal (<30s on 360px viewport) displaying Danish payment details (MobilePay Box/Erhverv, bank `Reg. nr.` & `Kontonr.`, deterministic `RCC-INV-YYYY-####` copy) and 1-tap "Mark as Paid", an administrative 1-click reconciliation console with partial payments, waivers, and manual overdue reminder dispatch, plus an informational amber `"Fees Overdue (>14d)"` badge in Module 3's Match Squad Selection Console.

**Independent Test**: Open an unpaid invoice on a 360px mobile viewport, verify copyable MobilePay/bank transfer details and `RCC-INV-YYYY-####` reference, tap "Mark as Paid", approve in Treasurer reconciliation queue, send a manual overdue reminder, and verify the amber warning badge appears in Module 3's match squad selector without blocking selection.

- [X] T033 [P] [US3] Define Zod schemas and TypeScript contracts for payment reporting, reconciliation, and overdue reminders (`reportInvoicePaymentSchema`, `verifyPaymentTransactionSchema`, `waiveInvoiceSchema`, `sendOverdueReminderSchema`, `batchSendOverdueRemindersSchema`) in `src/modules/finance/contracts/payment.contract.ts` and `src/modules/finance/contracts/reconciliation.contract.ts`
- [X] T034 [US3] Implement member payment self-reporting service with transaction creation and receipt data generation in `src/modules/finance/services/payment.service.ts`
- [X] T035 [US3] Implement Treasurer reconciliation service handling verification, partial payment recording, fee waivers with mandatory audit notes, and manual single/batch overdue reminder dispatch in `src/modules/finance/services/reconciliation.service.ts`
- [X] T036 [US3] Implement Server Actions for payment reporting and reconciliation (`reportInvoicePaymentAction`, `verifyPaymentTransactionAction`, `waiveInvoiceAction`, `sendOverdueReminderAction`, `batchSendOverdueRemindersAction`) in `src/modules/finance/actions/payment.actions.ts` and `src/modules/finance/actions/reconciliation.actions.ts`
- [X] T037 [P] [US3] Build ultra-fast mobile payment modal (<30s on 360px) with MobilePay number, bank Reg./Kontonr., 1-tap `RCC-INV-YYYY-####` copy, and "Mark as Paid" action in `src/components/finance/mobile-payment-modal.tsx`
- [X] T038 [P] [US3] Build Treasurer Reconciliation Queue UI component with 1-click verification, partial payment dialog, fee waiver modal, and manual overdue reminder actions in `src/components/finance/treasurer-reconciliation.tsx`
- [X] T039 [US3] Build Admin Finance Overview & Reconciliation page in `src/app/(dashboard)/admin/finance/page.tsx`
- [X] T040 [US3] Integrate informational amber `"Fees Overdue (>14d)"` warning badge into Module 3's Match Squad Selection Console without blocking player selection in `src/components/events/MatchSquadSelector.tsx`

**Checkpoint**: User Story 3 functional. Mobile payments self-reported, Treasurer reconciles transactions with 1 click, overdue reminders dispatched manually, and Module 3 displays informational badges.

---

## Phase 6: User Story 4 - Danish Bookkeeping Compliance (Bogføringsloven) & Cross-Module GDPR Hooks (Priority: P4)

**Goal**: Deliver a 1-click UTF-8 CSV accounting ledger export compliant with the Danish Bookkeeping Act (*Bogføringsloven* § 10) covering 5 years of historical financial records, enforce GDPR Article 17 erasure blocking for members with open unpaid balances, scrub personal payment notes on anonymized 5-year accounting shells (`"Former Member #[HASH]"`), and include full financial histories in GDPR Article 20 data portability archives.

**Independent Test**: Download the Bogføringsloven CSV export for a fiscal year and verify columns and UTF-8 BOM encoding; attempt GDPR Article 17 erasure on a member with an unpaid balance and verify it is blocked; perform erasure on a settled member and verify personal notes are scrubbed while anonymized transactions remain; run Article 20 export and verify subscriptions, invoices, and payments are included.

- [X] T041 [P] [US4] Define Zod schemas and TypeScript contracts for Bogføringsloven accounting ledger export (`exportBogfoeringslovenLedgerSchema`) in `src/modules/finance/contracts/ledger.contract.ts`
- [X] T042 [US4] Implement Bogføringsloven accounting ledger service generating UTF-8 BOM CSV with mandatory accounting columns and 5-year retention evaluator in `src/modules/finance/services/bogfoeringsloven.service.ts`
- [X] T043 [US4] Implement Server Action for Bogføringsloven CSV export (`exportBogfoeringslovenLedgerAction`) in `src/modules/finance/actions/ledger.actions.ts`
- [X] T044 [P] [US4] Build Bogføringsloven accounting ledger table and CSV download component in `src/components/finance/bogfoeringsloven-table.tsx`
- [X] T045 [US4] Build Admin Finance Reports page for Bogføringsloven statutory CSV export in `src/app/(dashboard)/admin/finance/reports/page.tsx`
- [X] T046 [US4] Update `gdpr-deletion.service.ts` to block Article 17 erasure when open/unpaid balances exist (`OPEN`, `PENDING_VERIFICATION`, `PARTIALLY_PAID`, `OVERDUE`) and preserve 5-year statutory records on `"Former Member #[HASH]"` while scrubbing personal payment notes in `src/modules/auth/services/gdpr-deletion.service.ts`
- [X] T047 [US4] Update `gdpr-export.service.ts` to include full subscription, invoice, and payment history in Article 20 "Download My Data" export in `src/modules/auth/services/gdpr-export.service.ts`
- [X] T048 [P] [US4] Create Vitest unit test suite verifying GDPR Article 17 erasure blocking on open balances and personal note scrubbing in `tests/unit/finance/finance-gdpr-guard.test.ts`

**Checkpoint**: User Story 4 functional. Danish Bookkeeping Act export verified and GDPR Article 17/20 compliance hooks fully tested.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Route protection, navigation updates, end-to-end flow validation, and quickstart documentation.

- [X] T049 [P] Add finance module route permissions and navigation links to dashboard sidebar/header in `src/components/layout/Sidebar.tsx`
- [X] T050 Update integration documentation and verify complete quickstart workflow (`npm run test`, `npx prisma db seed`) in `specs/004-membership-fees-finance/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup & Schema)**: No dependencies — can start immediately.
- **Phase 2 (Foundational Domain)**: Depends on Phase 1 schema models being defined — BLOCKS all user stories.
- **Phase 3 (User Story 1 - P1)**: Depends on Phase 2 pure domain logic completion.
- **Phase 4 (User Story 2 - P2)**: Depends on Phase 3 (invoices require subscription plans and rates).
- **Phase 5 (User Story 3 - P3)**: Depends on Phase 4 (payments and reconciliation require issued invoices).
- **Phase 6 (User Story 4 - P4)**: Depends on Phase 5 (Bogføringsloven export and GDPR hooks require settled payments).
- **Phase 7 (Polish)**: Depends on all user stories being implemented.

### Parallel Execution Opportunities

- **Phase 1**: T004 (seed script) and T005 (barrel file) can run in parallel with T001–T003.
- **Phase 2**: T006/T007 (money math), T008/T009 (season billing), T010/T011 (family discount), T012/T013 (invoice lifecycle), and T014/T015 (Bogføringsloven export) can all run in parallel across separate files.
- **Phase 3**: T016 (contracts), T020 (plan manager UI), and T021 (enrollment modal) can run in parallel.
- **Phase 4**: T024 (contracts), T028 (invoice card), and T029 (family billing view) can run in parallel.
- **Phase 5**: T033 (contracts), T037 (mobile payment modal), and T038 (reconciliation UI) can run in parallel.
- **Phase 6**: T041 (contracts), T044 (ledger table), and T048 (GDPR tests) can run in parallel.

---

## Implementation Strategy (MVP First)

1. **Phase 1 + Phase 2 (Foundation)**: Run migrations, implement integer `øre` math, fixed seasons, and sibling discount logic with unit tests.
2. **Phase 3 (User Story 1 - MVP)**: Deliver plan management and subscription enrollment with family discounts.
3. **Phase 4 (User Story 2)**: Add seasonal batch invoicing, ad-hoc equipment/event charges, and family rollup dashboard.
4. **Phase 5 (User Story 3)**: Enable mobile payment reporting (<30s), Treasurer reconciliation queue, and Module 3 overdue badge.
5. **Phase 6 (User Story 4)**: Finalize Danish Bookkeeping Act CSV export and GDPR Article 17/20 hooks.
