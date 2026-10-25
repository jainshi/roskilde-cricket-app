# Feature Specification: Club Inventory & Equipment Management

**Feature Branch**: `002-inventory-equipment-management`

**Created**: 2026-10-25

**Status**: Draft

**Input**: User description: "Create and checkout a new feature branch named `002-inventory-equipment-management` from `master`, and specify Module 2: Club Inventory & Equipment Management for the Roskilde Cricket Club web application (adhering to Constitution v1.1.0 and integrating with Module 1 `001-user-auth-rbac`)"

## Clarifications

### Session 2026-10-25
- Q: How should bulk/consumable inventory items (e.g., cricket balls, scorebooks, cones) be handled during checkout? → A: Support both temporary loans (with return expectation) and direct consumption/expenditure (no return expected, e.g. match balls).
- Q: What default return deadline should be pre-populated during equipment check-out? → A: Category-based intelligent defaults (e.g., Same-Day 23:59 for keys & match equipment, 7 days for practice bats/protective gear, end of season for coach kit bags) with manual override.
- Q: How should equipment loan extension requests submitted by members or parents be processed? → A: In-app extension request: Members/parents request a new date and reason from "My Gear", which coaches/admins can approve or reject in the console with 1-click.
- Q: When an equipment item is reported lost or irreparably damaged, how should replacement costs or financial liability be handled? → A: Inventory write-off with replacement cost reference: Record the write-off and display the item's purchase price in øre/DKK for reference, deferring fee collection and invoicing to the finance module.
- Q: How should overdue equipment return reminders be triggered and dispatched? → A: Both automated daily cron and on-demand console trigger (with 24-hour notification cooldown per borrower to prevent duplicate emails).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Equipment Master Catalog & Stock Management (Priority: P1)

Club administrators and coaches need a comprehensive, centralized inventory catalog to track all physical assets owned by Roskilde Cricket Club. This includes serialized individual items (e.g., Club Bats, Bowling Machines, Facility/Shed Keys, Team Kit Bags) and bulk/consumable stock (e.g., Red/White Leather Cricket Balls, Training Cones, Bibs, Scorebooks).

**Why this priority**: Without an accurate, categorized inventory record, club assets cannot be tracked, audited, or safely loaned to players and coaches for matches and practices.

**Independent Test**: Administrators can create, view, update, and search items across categories, sizes, storage locations, and conditions. Bulk stock counts update accurately and low-stock alerts trigger when quantity falls below defined thresholds.

**Acceptance Scenarios**:

1. **Given** an Administrator managing inventory, **When** they add a new serialized item (e.g., "Kookaburra Kahuna Senior Bat", Tag: `BAT-2026-001`, Category: `BATTING`, Size: `SENIOR`, Storage Location: "Poppelgårdsvej Shed"), **Then** the item is created in `AVAILABLE` status with condition `NEW` and is visible in the catalog.
2. **Given** an Administrator or Coach browsing the catalog, **When** they search by name, filter by Category (`PROTECTIVE`), Size (`YOUTH`), or Storage Location ("Indoor Sports Hall"), **Then** the catalog displays matching items in under 1 second.
3. **Given** a bulk consumable item (e.g., "County Match Red Balls", Total Quantity: 24, Low-Stock Threshold: 6), **When** stock is depleted below 6 units through checkout or match consumption, **Then** a prominent low-stock indicator is displayed in the inventory console.
4. **Given** an obsolete, broken, or written-off asset, **When** an Administrator marks its condition as `RETIRED`, **Then** the item status permanently transitions to `RETIRED` and cannot be checked out or transitioned back to active states.

---

### User Story 2 - Pitch-Side Equipment Check-Out & Youth Accountability (Priority: P1)

Coaches and Administrators need to check out equipment to individual players, coaches, or entire squads right by the pitch or clubhouse shed before training sessions and match fixtures. When checking out gear to minor players under 18, accountability and notifications must automatically bind to their linked parents.

**Why this priority**: Gear loan accountability prevents asset loss. Grounding minor player checkouts in parental responsibility is a safeguarding and financial requirement for the club.

**Independent Test**: Check out an available bat to an adult player and confirm status becomes `ON_LOAN`. Check out youth protective gear to a 12-year-old minor player and confirm the checkout records the child as the recipient while designating linked parents as responsible parties.

**Acceptance Scenarios**:

1. **Given** an asset in `AVAILABLE` status, **When** an authorized Coach initiates checkout to an adult member with an expected return date and condition note, **Then** the item status transitions to `ON_LOAN` and an active loan record is established.
2. **Given** an asset in `AVAILABLE` status, **When** an authorized Coach checks out youth gear to a minor player (`isMinor === true`), **Then** the loan record associates both the minor player and their linked parent(s), and a checkout confirmation notice is dispatched to the parents.
3. **Given** an item currently in `ON_LOAN` or `UNDER_MAINTENANCE` status, **When** anyone attempts to check it out, **Then** the checkout is strictly rejected with a clear explanation of current asset availability.
4. **Given** a bulk consumable item (e.g., Practice Cricket Balls, Match Leather Balls), **When** a Coach issues items as a temporary loan (e.g., 6 practice balls for squad drills), **Then** available quantity is decremented by 6 with an open loan record for expected return; **When** an official issues items for direct consumption (e.g., 2 new match balls for league fixture), **Then** both available and total quantities are decremented immediately without an open return expectation, and an expenditure audit log entry is recorded.

---

### User Story 3 - Equipment Check-In, Condition Assessment & Maintenance Routing (Priority: P1)

When borrowed equipment is returned after a match or training session, club officials need to record its return, inspect its condition, and route damaged gear into maintenance before it can be loaned again.

**Why this priority**: Prompt check-in ensures equipment availability for other teams and identifies broken or unsafe protective gear before subsequent use.

**Independent Test**: Return an `ON_LOAN` helmet; confirm loan closes and item status returns to `AVAILABLE`. Return a cracked bat with condition `NEEDS_REPAIR`; confirm status transitions to `UNDER_MAINTENANCE` and checkout is locked until repair is marked complete.

**Acceptance Scenarios**:

1. **Given** an item currently `ON_LOAN`, **When** a Coach receives the return, verifies condition as `GOOD`, and confirms return, **Then** the loan status transitions to `RETURNED`, the actual return timestamp is recorded, and the item status transitions back to `AVAILABLE`.
2. **Given** an item currently `ON_LOAN`, **When** a Coach receives the return with damage (e.g., cracked handle, torn strap) and records condition as `NEEDS_REPAIR` with a maintenance note, **Then** the loan is closed and the item status automatically transitions to `UNDER_MAINTENANCE`.
3. **Given** an item in `UNDER_MAINTENANCE`, **When** an Administrator or Coach completes the repair and updates condition to `GOOD` or `FAIR`, **Then** the item status transitions back to `AVAILABLE`.
4. **Given** a bulk stock return where fewer items are returned than checked out (e.g., 2 balls lost in tall grass), **When** check-in is recorded with lost units, **Then** the system increments available stock by the returned amount and prompts the official to log the loss or adjust total inventory.

---

### User Story 4 - Personal Borrowing Dashboard ("My Gear") & Damage/Loss Reporting (Priority: P2)

Players and parents need a clear, mobile-friendly personal dashboard view ("My Gear") to see all club equipment currently assigned to them or their children, check expected return dates, and proactively report damage or lost gear.

**Why this priority**: Transparency reduces unintentional overdue loans and gives members an easy way to report equipment damage directly from the pitch or home.

**Independent Test**: Sign in as a Player and view active loans; confirm loaned items and due dates display accurately. Sign in as a Parent, switch context to a linked youth player via the Header Profile Switcher, and confirm the child's loaned kit is displayed with a "Report Damage / Loss" action.

**Acceptance Scenarios**:

1. **Given** a logged-in Player with active equipment loans, **When** they navigate to "My Gear", **Then** they see their currently borrowed items, storage origin, checkout date, expected return date, and days remaining.
2. **Given** a logged-in Parent with linked youth players, **When** they switch active profile context to their child in the header, **Then** the "My Gear" view displays the child's loaned equipment.
3. **Given** a member with an active loan who notices equipment damage, **When** they submit a "Report Damage / Loss" report with a description, **Then** an alert is submitted to Coaches and Admins, and the item's condition flag is updated.
4. **Given** a member viewing past borrowing history, **When** they open their loan archive, **Then** they see all previously returned items with return dates and receiving conditions.

---

### User Story 5 - Overdue Tracking & Dual-Parent Escalation Reminders (Priority: P2)

Club officials need automatic detection of overdue equipment loans past their expected return date, with timely reminder notifications dispatched to borrowers and parents.

**Why this priority**: Unreturned cricket gear leads to equipment shortages on matchdays and unnecessary club replacement costs.

**Independent Test**: Trigger an overdue scan; verify loans past their due date are flagged as `OVERDUE`. For an overdue youth loan, confirm notification dispatch reaches both linked parents simultaneously.

**Acceptance Scenarios**:

1. **Given** an active equipment loan whose expected return date is in the past, **When** overdue detection runs, **Then** the loan is flagged as `OVERDUE` in both the administrator dashboard and member view.
2. **Given** an overdue loan assigned to a minor player, **When** overdue reminders are dispatched, **Then** reminders are sent simultaneously to all linked parents (up to 2) using contact fallback resolution.
3. **Given** an overdue loan assigned to an adult member, **When** overdue reminders are dispatched, **Then** the reminder is routed directly to the adult borrower's verified contact details.
4. **Given** an inventory overview, **When** an Administrator views the equipment dashboard, **Then** overdue items are highlighted at the top of the queue with days overdue and borrower contact links.

---

### User Story 6 - GDPR Erasure Guard & Historical Audit Integrity (Priority: P3)

When a member requests account erasure under GDPR Article 17, the system must safeguard club assets by preventing erasure if unreturned equipment is still outstanding, while preserving historical returned equipment audit logs against the anonymized statistical shell.

**Why this priority**: Preserves physical club assets before account termination and complies with GDPR statistical retention guidelines.

**Independent Test**: Attempt GDPR erasure for a member with an active equipment loan; verify erasure is blocked with an explicit error. Execute erasure for a member with only past returned loans; verify personal details are scrubbed while past returned loan records remain linked to the `"Former Member #..."` shell.

**Acceptance Scenarios**:

1. **Given** a member (or linked minor) who currently holds equipment in `ON_LOAN` or `OVERDUE` status, **When** an Admin attempts to execute GDPR account erasure, **Then** the system blocks the erasure and warns that outstanding club equipment must be checked in first.
2. **Given** a member with completed (returned) past equipment loans, **When** GDPR account erasure is executed, **Then** personal identifiers are scrubbed, login credentials revoked, and historical loan records remain linked to the anonymized statistical shell (`"Former Member #..."`).
3. **Given** any equipment mutation (checkout, check-in, maintenance transition, stock adjustment, loss write-off), **When** the transaction executes, **Then** an immutable audit record is created capturing actor, target, timestamp, and asset tag.

---

### Edge Cases

- **Checkout of Zero-Stock Consumables**: Attempting to check out bulk consumables when `availableQuantity <= 0` must be rejected with an "Insufficient stock available" error.
- **Simultaneous Pitch-Side Checkouts**: If two coaches attempt to check out the exact same serialized asset at the exact same moment on mobile devices, database transaction locking must allow the first checkout and reject the second with an "Item already on loan" notification.
- **Parent Delegation for Unlinked Youth**: A parent attempting to view or report damage on gear checked out to an unlinked child must be rejected with an authorization error.
- **Return of Damaged Bulk Items**: When checking in bulk items where some units are returned in good condition and some are damaged, the system must support partial condition allocation (e.g., 4 balls returned good, 2 balls retired/damaged).
- **Overdue on Same Day**: Items due at 18:00 on matchday must not be marked overdue until the exact due timestamp has elapsed.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Catalog & Asset Taxonomy
- **FR-101**: System MUST support two distinct equipment tracking modes:
  - `SERIALIZED`: Individual high-value or safety-critical club assets tracked by unique asset tag/identifier (e.g., Club Bats, Bowling Machines, Facility Keys, Helmets).
  - `BULK`: Consumable and bulk items tracked by total quantity and available quantity counts (e.g., Match Balls, Training Cones, Practice Bibs).
- **FR-102**: Every equipment item MUST belong to one of the following standard categories:
  - `BATTING` (Bats, batting pads, batting gloves)
  - `PROTECTIVE` (Helmets, arm guards, chest guards, thigh pads, abdominal guards)
  - `BOWLING_BALLS` (Leather match balls, practice balls, bowling machine balls)
  - `TRAINING_GROUND` (Cones, agility ladders, practice nets, stumps, scorebooks)
  - `FACILITY_KEYS` (Clubhouse shed keys, padlock keys, pavilion access keys)
  - `APPAREL_KIT` (Club match jerseys, club kit bags, bibs)
- **FR-103**: Every equipment item MUST capture size and age group targeting: `JUNIOR`, `YOUTH`, `SENIOR`, or `UNIVERSAL`.
- **FR-104**: Serialized equipment items MUST track physical condition:
  - `NEW`: Pristine/unissued condition.
  - `GOOD`: Minor cosmetic wear, fully match-ready.
  - `FAIR`: Noticeable wear, safe for training sessions.
  - `NEEDS_REPAIR`: Damaged or worn, requiring inspection or repair before reuse.
  - `RETIRED`: Decommissioned, written off, or permanently lost.
- **FR-105**: Bulk equipment items MUST maintain `totalQuantity`, `availableQuantity`, and an optional `lowStockThreshold`. When `availableQuantity <= lowStockThreshold`, the system MUST flag the item as low stock.
- **FR-106**: Equipment items MUST capture physical storage location (e.g., "Main Shed - Locker A", "Poppelgårdsvej Container", "Indoor Sports Hall").
- **FR-107**: Equipment items MAY optionally store acquisition date, purchase price (stored in integer minor units / øre and displayed in DKK per Constitution), and warranty expiration date.

#### Status State Machine & Checkout Workflows
- **FR-108**: Equipment asset status MUST strictly follow the state machine: `AVAILABLE`, `ON_LOAN`, `UNDER_MAINTENANCE`, `RETIRED`.
- **FR-109**: Checkout is permitted ONLY when the item is in `AVAILABLE` status. Transitions directly from `ON_LOAN`, `UNDER_MAINTENANCE`, or `RETIRED` to checked-out are strictly prohibited.
- **FR-110**: Authorized officials (`ADMIN`, `COACH`, `AD_HOC_COACH`) MUST be able to execute checkout of available equipment to an active member (`PLAYER`, `COACH`, `AD_HOC_COACH`) or an organized Team/Squad.
- **FR-111**: Equipment checkout MUST support two transaction flows based on asset tracking type:
  - For `SERIALIZED` assets: checkout creates an active `EquipmentLoan` (quantity 1), links the borrower and issuing official, records expected return date/time and initial condition note, and transitions the asset status to `ON_LOAN`.
  - For `BULK` assets: checkout MUST allow the official to select either:
    - `TEMPORARY_LOAN`: Decrements `availableQuantity`, creates an active `EquipmentLoan` with specified loan quantity and expected return date, and leaves total stock unchanged. Return will restore available stock.
    - `CONSUMPTION`: Direct expenditure (e.g. match balls, scorebooks) with no return expected. Decrements both `availableQuantity` and `totalQuantity` immediately, records the recipient/team and reason, and writes a stock consumption audit record without creating an open loan.
  - For all checkouts, the system MUST pre-populate an intelligent default return deadline based on category: Same-Day 23:59 local time for `FACILITY_KEYS` and match items; 7 calendar days for `BATTING`, `PROTECTIVE`, and `TRAINING_GROUND`; end of current playing season (or 180 days) for `APPAREL_KIT` and Coach kit bags. Officials MUST be able to manually override the default date and time before confirmation.
- **FR-112**: When checking out equipment to a minor player under 18 (`isMinor === true`), the system MUST automatically associate the borrower's linked parents (`ParentChildLink`) with the loan for guardian accountability.
- **FR-113**: An individual serialized asset MUST NOT have more than one active loan at any given time, enforced at the database level.

#### Check-In & Maintenance
- **FR-114**: Return/check-in is permitted ONLY when the item is currently in `ON_LOAN` status.
- **FR-115**: Equipment check-in MUST record:
  - Actual return timestamp (UTC).
  - Receiving official profile ID.
  - Returned condition assessment (`GOOD`, `FAIR`, `NEEDS_REPAIR`, `RETIRED`).
  - Return notes (e.g., damage descriptions, maintenance requests).
- **FR-116**: If an item is returned in `NEEDS_REPAIR` condition, the system MUST automatically transition the asset status to `UNDER_MAINTENANCE`.
- **FR-117**: Items in `UNDER_MAINTENANCE` status MUST NOT be eligible for checkout until an authorized official completes inspection/repair and transitions the item back to `AVAILABLE`.
- **FR-118**: The `RETIRED` status is terminal; retired items MUST NEVER transition back to `AVAILABLE` or `ON_LOAN`. When retiring an asset due to irreparable damage or loss, the system MUST record the incident notes and reference the asset's original acquisition cost (`purchasePriceMinorUnits` in øre, displayed in DKK) in the audit log for insurance and club asset accounting. Direct fee levying or member invoicing is explicitly deferred to future finance modules.

#### Personal Borrowing Dashboard ("My Gear") & Damage Reports
- **FR-119**: The system MUST provide a mobile-responsive "My Gear" view accessible to all registered members.
- **FR-120**: In "My Gear", Players MUST see all equipment currently on loan to them, including item name, asset tag, checkout date, expected return date, and condition.
- **FR-121**: In "My Gear", Parents MUST be able to view their own loaned equipment and, via the Header Profile Switcher, switch active context to view equipment loaned to their linked youth player(s).
- **FR-122**: Members (and parents on behalf of linked youth) MUST be able to submit a "Report Damage / Loss" ticket on any actively loaned item, notifying coaches and administrators.
- **FR-122a**: In "My Gear", Members (and parents on behalf of linked youth) MUST be able to submit a loan extension request specifying a proposed new return date and justification reason. Authorized officials (`ADMIN`, `COACH`) MUST be able to approve or reject extension requests via a 1-click review queue in the inventory console; approval immediately updates `expectedReturnDate` and logs an audit log entry.

#### Overdue Tracking & Notification Escalation
- **FR-123**: The system MUST identify active loans where `expectedReturnDate < CURRENT_TIMESTAMP` and flag them as `OVERDUE`.
- **FR-124**: Overdue reminder notifications MUST be routed through the pluggable `NotificationService`. The system MUST support both an automated daily scheduled run (daily morning check) and an on-demand "Send Overdue Reminders" trigger in the inventory console for authorized officials. To avoid spamming borrowers or parents, the system MUST enforce a 24-hour notification cooldown per borrower.
- **FR-125**: For overdue items loaned to a minor player, overdue notifications MUST be dispatched simultaneously to all linked parents (up to 2) using Module 1 contact fallback resolution.

#### RBAC & GDPR Integration
- **FR-126**: Role permissions for Inventory MUST enforce:
  - `ADMIN`: Full management (CRUD catalog, adjust bulk stock, manual status overrides, retire assets, execute all checkouts/returns).
  - `COACH` / `AD_HOC_COACH`: View catalog, execute checkouts and returns, submit maintenance requests.
  - `PLAYER` / `PARENT`: View general catalog, view personal "My Gear" active/past loans, submit damage/loss reports.
- **FR-127**: If a member holds unreturned equipment in `ON_LOAN` or `OVERDUE` status, GDPR account erasure MUST be blocked until outstanding assets are checked in or formally written off.
- **FR-128**: When GDPR account erasure is executed for a member with completed (returned) historical loans, personal identifiers MUST be scrubbed while retaining the historical loan records linked to the anonymized statistical shell (`"Former Member #..."`).
- **FR-129**: All inventory transactions (catalog additions, stock adjustments, checkouts, returns, maintenance transitions, damage reports, and retirements) MUST generate an immutable audit log entry.

---

### Key Entities

- **EquipmentItem**: Represents a physical club asset or stock item.
  - Attributes: `id`, `assetTag` (nullable for bulk), `name`, `trackingType` (`SERIALIZED` | `BULK`), `category`, `sizeGroup`, `status` (`AVAILABLE`, `ON_LOAN`, `UNDER_MAINTENANCE`, `RETIRED`), `condition`, `storageLocation`, `totalQuantity`, `availableQuantity`, `lowStockThreshold`, `purchasePriceMinorUnits`, `acquisitionDate`.
- **EquipmentLoan**: Represents a loan transaction of an equipment item to a member or squad.
  - Attributes: `id`, `equipmentItemId`, `borrowerProfileId`, `issuedByProfileId`, `quantity` (1 for serialized, >= 1 for bulk), `loanedAt`, `expectedReturnDate`, `actualReturnDate`, `receivedByProfileId`, `checkoutCondition`, `returnCondition`, `checkoutNotes`, `returnNotes`, `status` (`ACTIVE`, `OVERDUE`, `RETURNED`), `lastOverdueReminderSentAt` (nullable timestamp for 24h cooldown).
- **StockTransaction**: Represents a direct stock adjustment, consumable expenditure, or replenishment event.
  - Attributes: `id`, `equipmentItemId`, `transactionType` (`CONSUMPTION`, `REPLENISHMENT`, `AUDIT_CORRECTION`, `WRITE_OFF`), `quantityDelta`, `totalQuantityAfter`, `availableQuantityAfter`, `recipientProfileId` (optional), `recordedByProfileId`, `reason`, `createdAt`.
- **EquipmentDamageReport**: A member-submitted report regarding damaged, cracked, or lost equipment.
  - Attributes: `id`, `equipmentItemId`, `equipmentLoanId`, `reportedByProfileId`, `description`, `reportedAt`, `resolvedAt`, `resolvedByProfileId`, `status` (`PENDING`, `RESOLVED`).
- **EquipmentLoanExtension**: An extension request submitted by a borrower or parent.
  - Attributes: `id`, `equipmentLoanId`, `requestedByProfileId`, `proposedReturnDate`, `reason`, `status` (`PENDING`, `APPROVED`, `REJECTED`), `reviewedByProfileId`, `reviewedAt`, `rejectionReason`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Pitch-side equipment check-out or check-in can be completed in under 30 seconds on a mobile viewport (360 px width).
- **SC-002**: Inventory catalog search and filter queries return results in under 500 milliseconds for a club inventory of up to 2,000 items.
- **SC-003**: 100% of equipment checked out to youth players under 18 automatically records linked parental responsibility and dispatches confirmation notifications.
- **SC-004**: 100% of overdue loan reminders for minor players reach both linked parents simultaneously via contact fallback resolution.
- **SC-005**: Zero unreturned club assets are accidentally deleted or lost during GDPR account erasure operations.
- **SC-006**: 100% of inventory state mutations and stock adjustments produce an immutable audit log entry.

---

## Assumptions

- **Storage Locations**: Initial club storage locations are predefined as club physical facilities ("Poppelgårdsvej Shed", "Ground Container 1", "Ground Container 2", "Indoor Sports Hall") with support for custom location entries.
- **Team Checkouts**: When equipment is checked out to a team/squad (e.g., full kit bag for Senior 1st XI match), the team captain or designated coach is recorded as the accountable borrower profile.
- **Currency**: All monetary values are handled in Danish Kroner (`DKK`) stored as integer øre per Constitution Domain Integrity Constraints.
- **Notification Routing**: Email dispatch utilizes Module 1's pluggable `NotificationService` (Console adapter in local development, SMTP/Resend in production).
- **Out of Scope**: Direct member invoicing, fee collection, and replacement penalty billing are out of scope for Module 2 and deferred to the upcoming Member Dues & Finances module. Inventory management records reference acquisition costs in integer øre without creating billing obligations.
