# Feature Specification: Module 4 - Membership Subscriptions, Club Fees & Finance

**Feature Branch**: `004-membership-fees-finance`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Create and checkout a new feature branch named 004-membership-fees-finance from master, and specify Module 4: Membership Subscriptions, Club Fees & Finance for the Roskilde Cricket Club web application (adhering to Constitution v1.1.0 and integrating with Module 1 001-user-auth-rbac, Module 2 002-inventory-equipment-management, and Module 3 003-teams-matches-scheduling)"

## Clarifications

### Session 2026-10-27

- Q: How should club membership subscription periods and seasonal invoice generation be scheduled across the cricket calendar? → A: Fixed Club Seasons: Defined seasonal cycles (Summer Outdoor: Apr 1 – Sep 30; Winter Indoor: Oct 1 – Mar 31; Full Annual: Apr 1 – Mar 31) with seasonal dues batch-generated at season kickoff.
- Q: How should the automatic sibling discount be applied when a household has multiple youth players enrolled in different tiers or age groups? → A: Lower-Priced Tier Discounted by default (highest-priced youth pays full; 25% discount applied to lower-priced/subsequent youth), with explicit Treasurer/Admin manual discount override capability per subscription or invoice.
- Q: What level of enforcement should occur in the Match Squad Selection Console when a player has an invoice that is overdue by more than 14 days? → A: Informational Warning Badge (amber "Fees Overdue (>14d)" badge on player card in Match Selection Console; Coach retains full discretion to select the player).
- Q: How should the deterministic invoice payment reference code be formatted for MobilePay and bank transfer matching? → A: Human-Readable Prefixed Code: `RCC-INV-YYYY-####` (e.g., `RCC-INV-2026-0042`) directly matching the invoice number for instant reconciliation.
- Q: How should overdue payment reminder notifications be triggered to members and parents? → A: Treasurer-Controlled Manual Dispatch: Reminders are sent strictly on-demand when the Treasurer triggers them (via 1-click individual or batch "Send Overdue Reminders"), avoiding automated friction with members.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Membership Plans, Subscription Tiers & Automatic Family Discounts (Priority: P1)

As a Club Treasurer or Administrator,  
I want to create, configure, and manage membership subscription plans across categories (Senior Competitive, Youth U15/U13, Social/Passive, Winter Indoor Add-On) with flexible billing cycles (`ANNUAL`, `HALF_YEARLY`, `SEASONAL`) and all fee amounts stored strictly in integer `øre` (DKK),  
And configure automated sibling/household discount rules for families with multiple linked youth players (`isMinor === true`),  
So that club membership fees are clearly established without floating-point rounding errors, and multi-child families automatically receive fair club discounts.

**Why this priority**: Membership subscription plans and pricing rules are the foundational domain model for all club billing. Without defined plans, rates, and discount formulas, no invoices or fees can be calculated or issued.

**Independent Test**: Can be tested independently by creating plans (e.g., Senior Competitive at 1,800.00 DKK / 180,000 øre, Youth U15/U13 at 1,000.00 DKK / 100,000 øre, Social/Passive at 400.00 DKK / 40,000 øre, Winter Indoor at 350.00 DKK / 35,000 øre), configuring a 25% sibling discount for subsequent youth in the same household, assigning members/dependents, and verifying accurate fee calculations in øre and DKK.

**Acceptance Scenarios**:

1. **Given** a Treasurer navigating to the Membership Plans management console, **When** they create a new plan titled "Senior Competitive 2026" with category `SENIOR_COMPETITIVE`, billing cycle `ANNUAL`, and price `180000` øre (1,800.00 DKK), **Then** the plan is saved with zero floating-point representation and displayed in the club plan directory.
2. **Given** a configured plan for "Youth U15/U13" with an active sibling discount rule (25% discount on 2nd and subsequent children), **When** a Parent with 2 linked minor children enrolls both children in Youth memberships, **Then** the first child is billed 100,000 øre (1,000.00 DKK) and the second child automatically receives the sibling discount, billed at 75,000 øre (750.00 DKK).
3. **Given** an existing active plan, **When** the Treasurer updates the description or seasonal active status, **Then** existing issued invoices retain their historical billing amount, while new invoices reflect the updated configuration.

---

### User Story 2 - Seasonal Invoicing, Ad-Hoc Fees & Consolidated Parental Billing Rollup (Priority: P2)

As a Club Treasurer,  
I want to batch-generate seasonal membership invoices and issue ad-hoc fee requests (such as Module 3 tournament/indoor match fees or Module 2 unreturned/damaged equipment replacement charges),  
And as a Parent of one or more youth players,  
I want a consolidated Family Billing dashboard accessible via Module 1's `HeaderProfileSwitcher` that aggregates all household invoices into a unified view with simultaneous dual-parent notification dispatch,  
So that parents never have to switch accounts or juggle multiple bills to understand their family's club financial obligations.

**Why this priority**: Invoices link subscription plans and ad-hoc activities to specific member accounts. The parental rollup is essential for Roskilde Cricket Club's large youth contingent and honors Constitution Principle II (safeguarding and parental delegation).

**Independent Test**: Can be tested independently by generating membership invoices for adult and youth players, issuing an ad-hoc equipment damage fee from Module 2, logging in as a parent, switching to linked youth profiles or opening the Family Billing rollup, and verifying that all family charges appear together with clear itemized line items and dual-parent email notices.

**Acceptance Scenarios**:

1. **Given** a Treasurer initiating the start-of-season billing run, **When** they select the "Youth U15/U13" squad and click "Generate Season Invoices", **Then** the system creates draft/issued invoices for all active roster members, applying family discounts where linked siblings exist.
2. **Given** a youth player whose equipment was reported damaged or unreturned in Module 2, **When** the Treasurer or Equipment Officer creates an ad-hoc fee request linked to the loan record, **Then** an itemized fee invoice is generated referencing the equipment item and asset tag.
3. **Given** a Parent logged into the application with two linked minor players, **When** they navigate to the Family Billing view, **Then** they see a combined financial statement displaying both children's dues, itemized line items, individual balances, and the total household balance due.
4. **Given** a new invoice generated for a minor player with two registered parents, **When** the invoice is issued, **Then** both linked parents simultaneously receive an itemized billing notice via `NotificationService` with the payment reference code and payment deadline.

---

### User Story 3 - Mobile Payment Portal, 1-Click Treasurer Reconciliation & Overdue Warnings (Priority: P3)

As a Club Member or Parent,  
I want a mobile-optimized payment portal (<30s on a 360px viewport) presenting clear Danish payment options (MobilePay Box/Erhverv number, bank transfer Reg. & Kontonr., and a deterministic invoice payment reference code) with a 1-tap "Mark as Paid" confirmation,  
And as a Treasurer,  
I want a 1-click reconciliation queue to verify reported payments, log partial/full settlements, issue waivers/credits, and view an overdue status warning badge in Module 3's Match Squad Selection Console for severely delinquent accounts,  
So that collecting and auditing payments pitch-side or from home is effortless, and team coaches are aware of payment compliance.

**Why this priority**: Fast mobile payment submission and quick administrative reconciliation are critical for a volunteer-run Danish sports club where most payments occur via MobilePay or domestic bank transfer.

**Independent Test**: Can be tested independently by opening an unpaid invoice on a 360px mobile viewport, verifying MobilePay and bank transfer instructions with one-click copyable reference codes, tapping "Mark as Paid" with a transaction note, approving the payment in the Treasurer reconciliation queue, and verifying that the invoice state transitions to `PAID`.

**Acceptance Scenarios**:

1. **Given** a member viewing an issued invoice on a mobile smartphone (360px viewport), **When** they view the payment portal, **Then** the screen displays the total due in DKK, the club MobilePay number, the club bank Reg. & Kontonr., a copyable reference code (e.g., `RCC-INV-2026-0042`), and instructions for payment.
2. **Given** a member who completed a MobilePay transfer, **When** they tap "Mark as Paid" and enter an optional reference or note ("MobilePay from 20202020"), **Then** the invoice status transitions to `PAYMENT_REPORTED` with a timestamp, moving into the Treasurer reconciliation queue.
3. **Given** a Treasurer reviewing the reconciliation queue, **When** they cross-reference the club bank statement and click "Confirm Payment", **Then** the invoice transitions to `PAID`, the settlement date is recorded, and a payment confirmation receipt is dispatched.
4. **Given** a player with an invoice that is overdue by more than 14 days, **When** a Coach opens the Match-Day Squad Selection Console in Module 3 (`/events/[id]/selection`), **Then** an amber "Fees Overdue" warning badge appears next to the player's name (informative warning, allowing coach discretion).
5. **Given** an overdue invoice, **When** the Treasurer clicks "Send Reminder", **Then** a gentle payment reminder notification is dispatched to the member (or both parents for minor players).

---

### User Story 4 - Danish Bookkeeping Compliance (Bogføringsloven) & Cross-Module GDPR Guards (Priority: P4)

As a Club Treasurer, Club Auditor, or System Administrator,  
I want an exportable UTF-8 CSV accounting ledger meeting the legal requirements of the Danish Bookkeeping Act (*Bogføringsloven* § 10) covering 5 years of historical financial records,  
And I want GDPR Article 17 and Article 20 safeguards that prevent deletion of accounts with open balances, preserve anonymized 5-year accounting shells (`"Former Member #..."`) while scrubbing personal billing notes upon approved erasure, and include complete financial records in "Download My Data" exports,  
So that Roskilde Cricket Club complies with Danish tax/accounting law without compromising member data protection rights.

**Why this priority**: Sports clubs in Denmark receiving municipal subsidies or collecting dues are legally mandated to retain financial records for 5 full accounting years under *Bogføringsloven*. Harmonizing this requirement with GDPR Article 17 erasure is a non-negotiable compliance requirement.

**Independent Test**: Can be tested independently by downloading the Danish bookkeeping ledger CSV across date ranges, verifying UTF-8 encoding and column structures, attempting account erasure on a member with an unpaid balance (verifying it is blocked), performing erasure on a member with settled records (verifying personal billing notes are scrubbed while anonymized ledger transactions remain intact for 5-year auditing), and verifying that Article 20 export contains all subscription and invoice data.

**Acceptance Scenarios**:

1. **Given** a Treasurer in the Finance Reports console, **When** they select an accounting year (e.g., 2026) and click "Export Accounting Ledger (CSV)", **Then** a BOM-encoded UTF-8 CSV file is streamed containing `invoiceNumber`, `issueDate`, `paidDate`, `memberName`, `category`, `amountOere`, `amountDkk`, `paymentMethod`, and `status`.
2. **Given** a member with an outstanding `ISSUED` or `OVERDUE` invoice, **When** an administrator or user attempts a GDPR Article 17 account erasure request, **Then** the system rejects the erasure request with a clear blocking message stating that all open financial balances must be settled before account deletion.
3. **Given** a member with settled/paid invoices who undergoes approved GDPR Article 17 erasure, **When** the erasure is executed, **Then** all personal notes, payment commentary, and parent bank details are purged to `null`, while the invoice and transaction amounts remain associated with `"Former Member #[HASH]"` to satisfy the 5-year statutory retention requirement under *Bogføringsloven*.
4. **Given** an active member (or parent of a youth player) requesting a GDPR Article 20 data export, **When** the export is generated, **Then** the resulting JSON package includes full arrays of `subscriptions`, `invoices`, and `paymentTransactions`.

---

### Edge Cases

- **Partial Payments**: If a member pays part of an invoice via bank transfer, the Treasurer can log a partial payment, recording the partial amount received in øre, keeping the invoice in `PARTIALLY_PAID` status, and displaying the remaining balance.
- **Mid-Season Joining**: When a new player registers halfway through the season, the Treasurer can apply a pro-rated fee or adjust the invoice amount before issuing.
- **Waivers and Scholarships**: If the club committee waives fees for a member due to financial hardship or volunteer contribution, the Treasurer can mark the invoice as `WAIVED` with a mandatory audit reason.
- **Credit Notes / Refunds**: If an invoice was issued in error or a tournament was canceled, the Treasurer can issue a `CANCELLED` or `CREDITED` state with an explanatory note.
- **Household Reconfiguration**: If a parent-child link is severed or re-assigned, existing historical invoices remain linked to the original debtor/recipient profile, while future invoices reflect the updated parent links.
- **Zero Floating-Point Invariant**: No calculation may multiply or divide floating-point Danish Kroner; all calculations must compute minor unit øre using integer arithmetic (e.g. `Math.round((amountOere * discountPercent) / 100)`).

---

## Requirements *(mandatory)*

### Functional Requirements

#### Membership Plans & Tiers
- **FR-001**: System MUST support the creation, editing, and activation/deactivation of membership subscription plans across categories: `SENIOR_COMPETITIVE`, `YOUTH_U15_U13`, `SOCIAL_PASSIVE`, and `INDOOR_WINTER_ADDON`.
- **FR-002**: System MUST store all plan prices and monetary figures strictly as integer minor units (`øre`), where 100 øre = 1.00 DKK, prohibiting floating-point types for monetary storage.
- **FR-003**: System MUST support defined billing cycles: `ANNUAL` (Apr 1 – Mar 31), `SUMMER_OUTDOOR` (Apr 1 – Sep 30), and `WINTER_INDOOR` (Oct 1 – Mar 31), with automated start-of-season invoice batching.
- **FR-004**: System MUST calculate automated sibling discounts by applying the discount percentage (default 25%) to the lower-priced youth membership(s) in a household when 2+ minor players are linked to the same parent, while providing Treasurers/Admins with an explicit manual discount/waiver override per subscription or invoice.

#### Invoicing & Parental Rollup
- **FR-005**: System MUST allow Treasurers to batch-generate seasonal membership invoices for an entire squad, category, or selected member list.
- **FR-006**: System MUST generate unique, sequential, human-readable invoice numbers and payment reference codes adhering to the standard format `RCC-INV-YYYY-####` (e.g., `RCC-INV-2026-0042`).
- **FR-007**: System MUST support ad-hoc fee generation linked to Module 3 events (e.g. tournament entry fees, indoor training match fees) and Module 2 equipment incidents (e.g. unreturned/damaged gear replacement fees).
- **FR-008**: System MUST provide a consolidated Family Billing view for parents via Module 1's `HeaderProfileSwitcher`, grouping all invoices of linked minor children (`isMinor === true`) with itemized line items and combined household totals.
- **FR-009**: When an invoice is issued or updated for a minor player, system MUST dispatch simultaneous notifications to all registered parents (up to 2) via `NotificationService`.

#### Payment Tracking & Member Portal
- **FR-010**: System MUST provide a mobile-first payment portal (<30s on a 360px viewport) displaying clear Danish payment instructions: club MobilePay Box/Erhverv number, club bank transfer registration and account numbers (`Reg. nr.` & `Kontonr.`), and a deterministic copyable payment reference code.
- **FR-011**: System MUST provide a 1-tap "Mark as Paid" action for members/parents to self-report payment, capturing reported payment method (`MOBILEPAY`, `BANK_TRANSFER`, `CASH`), optional transaction reference, and timestamp.
- **FR-012**: System MUST maintain invoice lifecycle states: `DRAFT`, `ISSUED`, `PAYMENT_REPORTED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `WAIVED`, `CANCELLED`.
- **FR-013**: System MUST allow members and parents to view and print clean, professional PDF/HTML payment receipts for paid invoices.

#### Treasurer Reconciliation & Management Console
- **FR-014**: System MUST provide a Treasurer reconciliation queue listing all invoices in `PAYMENT_REPORTED` status with 1-click confirmation to verify and mark as `PAID`.
- **FR-015**: System MUST allow Treasurers to manually record full or partial payments, specifying the received amount in øre, payment method, settlement date, and internal audit notes.
- **FR-016**: System MUST allow Treasurers to apply fee waivers (`WAIVED`) or discounts with a required justification reason.
- **FR-017**: System MUST automatically flag invoices as `OVERDUE` once their due date (`dueDate`) has elapsed without full payment.
- **FR-018**: System MUST allow Treasurers to trigger on-demand payment reminder emails to members (or both parents for minor players) with overdue balances, supporting 1-click single-invoice and batch reminder dispatch without automated scheduling.
- **FR-019**: System MUST display an informational amber "Fees Overdue (>14d)" warning badge in Module 3's Match Squad Selection Console (`/events/[id]/selection`) next to players with invoices overdue by more than 14 days, preserving full coach discretion to include or bench the player.

#### Bookkeeping Compliance & Ledger Export
- **FR-020**: System MUST generate an exportable UTF-8 CSV accounting ledger for any selected date range or accounting fiscal year conforming to the Danish Bookkeeping Act (*Bogføringsloven* § 10).
- **FR-021**: The accounting export MUST include: `invoiceNumber`, `issueDate`, `dueDate`, `paidDate`, `memberId`, `memberName`, `category`, `description`, `amountOere`, `amountDkk`, `paymentMethod`, and `status`.

#### Cross-Module GDPR Article 17 & 20 Compliance
- **FR-022**: System MUST block GDPR Article 17 account erasure requests if the target member (or any linked minor child) has open unpaid invoices (`ISSUED`, `PAYMENT_REPORTED`, `PARTIALLY_PAID`, or `OVERDUE`).
- **FR-023**: When a member with fully settled invoices undergoes approved GDPR Article 17 erasure, system MUST retain the underlying financial invoices and transactions for the statutory 5-year *Bogføringsloven* period associated with the anonymized shell (`"Former Member #[HASH]"`), while purging all personal payment notes and free-text commentary.
- **FR-024**: System MUST update Module 1's GDPR Article 20 export service (`generateGdprExport`) to include the member's full membership subscriptions, issued invoices, and payment transaction history in the machine-readable "Download My Data" export.

---

### Key Entities *(include if feature involves data)*

- **MembershipPlan**: Represents a subscription plan template.
  - Attributes: `id`, `name`, `category` (enum: `SENIOR_COMPETITIVE`, `YOUTH_U15_U13`, `SOCIAL_PASSIVE`, `INDOOR_WINTER_ADDON`), `billingCycle` (enum: `ANNUAL`, `HALF_YEARLY`, `SEASONAL`), `feeAmountOere` (integer), `description`, `isActive`, `hasSiblingDiscount`, `siblingDiscountPercent` (integer, e.g. 25).
- **MemberSubscription**: Represents an individual member's active or past enrollment in a membership plan.
  - Attributes: `id`, `memberProfileId`, `planId`, `seasonYear` (e.g. 2026), `startDate`, `endDate`, `status` (enum: `ACTIVE`, `PENDING_PAYMENT`, `EXPIRED`, `CANCELLED`), `discountAppliedOere` (integer), `finalFeeOere` (integer).
- **Invoice**: Represents a billing invoice issued to a member or household.
  - Attributes: `id`, `invoiceNumber` (unique string, e.g. `RCC-2026-0001`), `recipientProfileId` (member receiving benefits), `payerProfileId` (adult or parent responsible for payment), `category` (enum: `MEMBERSHIP_DUES`, `EVENT_FEE`, `EQUIPMENT_FEE`, `OTHER`), `totalAmountOere` (integer), `paidAmountOere` (integer), `issueDate`, `dueDate`, `status` (enum: `DRAFT`, `ISSUED`, `PAYMENT_REPORTED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `WAIVED`, `CANCELLED`), `paymentReferenceCode` (unique short code for MobilePay/Bank transfer matching), `linkedEventId` (optional Module 3 event), `linkedEquipmentLoanId` (optional Module 2 equipment loan), `notes`.
- **InvoiceLineItem**: Individual itemized charge on an invoice.
  - Attributes: `id`, `invoiceId`, `description`, `amountOere` (integer), `quantity` (integer), `unitPriceOere` (integer).
- **PaymentTransaction**: Audit log of a full, partial, or waived payment settlement.
  - Attributes: `id`, `invoiceId`, `amountOere` (integer), `paymentMethod` (enum: `MOBILEPAY`, `BANK_TRANSFER`, `CASH`, `WAIVER`, `CREDIT_NOTE`), `transactionReference` (string/note), `recordedById` (Treasurer/Admin who reconciled), `recordedAt`, `settlementDate`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero floating-point rounding discrepancies: 100% of plan fees, discounts, invoice balances, and payment records are computed and stored in integer øre.
- **SC-002**: Mobile payment efficiency: A member or parent can view payment instructions (MobilePay/bank details) and submit a "Mark as Paid" notification in under 30 seconds on a 360px mobile viewport.
- **SC-003**: Parental consolidation: 100% of invoices for linked minor children are aggregated into a single consolidated Family Billing view without requiring account switching.
- **SC-004**: Reconciliation speed: Treasurers can reconcile a member-reported payment in the administrative queue with a single click (<5 seconds per transaction).
- **SC-005**: Overdue visibility: 100% of players with invoices overdue by more than 14 days are visibly flagged with an eligibility indicator in the Coach Match Selection Console.
- **SC-006**: Dual-parent notification reliability: 100% of invoice issuances and reminders for minor players are simultaneously dispatched to both registered parents.
- **SC-007**: Danish bookkeeping export: Treasurers can generate a complete, audit-ready Danish municipal/accounting CSV ledger in under 3 seconds.
- **SC-008**: GDPR compliance: 100% of account erasure attempts with outstanding balances are blocked, and 100% of settled ledger entries for erased accounts are preserved in anonymized form for 5 years with personal notes stripped.

---

## Assumptions

- **Manual Reconciliation Architecture**: As typical for non-profit Danish sports clubs, payments are settled via MobilePay Box/Erhverv or domestic Danish bank transfers (Reg. & Kontonr.) rather than automated merchant card acquiring gateways (e.g. Stripe, QuickPay). Members report payments with an invoice reference code, and the Treasurer approves them in a 1-click reconciliation queue.
- **Standard Sibling Discount**: In the absence of a custom override, the default household discount rule applies a 25% discount to the second and each subsequent youth player enrolled under the same parent.
- **Overdue Threshold**: The standard grace period before an invoice transitions to `OVERDUE` is governed by the invoice's specified `dueDate` (typically 14 or 30 days after issuance). The Match Selection warning badge activates when an invoice is overdue by 14 or more calendar days.
- **Localisation & Currency**: All user-facing monetary displays format amounts in Danish Kroner (`DKK`, e.g. "1.800,00 kr.") adhering to Constitution Principle I & Domain Integrity Constraints.
- **Statutory Retention Period**: Danish Bookkeeping Act (*Bogføringsloven* § 10) mandates retaining financial transaction records for 5 full fiscal years plus the current accounting year.
