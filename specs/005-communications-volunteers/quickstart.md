# Developer Quickstart: Club Communications, Announcements & Volunteer Duty Roster

**Feature Branch**: `005-communications-volunteers`  
**Date**: 2026-10-27  
**Module**: Module 5 (`src/modules/communications/` & `src/modules/volunteers/`)

---

## 1. Prerequisites & Database Migration

Verify your local PostgreSQL connection and execute the Prisma migration adding Module 5's models:

```bash
# 1. Run Prisma migration for Module 5 schema additions
npx prisma migrate dev --name add_communications_volunteers_module

# 2. Regenerate Prisma Client
npx prisma generate
```

---

## 2. Seed Data Execution

Run the dedicated communications and volunteer seed script populating sample announcements, club policies, and match volunteer slots:

```bash
npm run seed:communications
```

Seeded records:
- **Announcements**:
  - `Annual General Meeting (AGM) Notice 2026` (`AGM_NOTICE`, `PINNED`, Club-Wide).
  - `Senior 1st XI Training Schedule - Spring 2026` (`SQUAD_UPDATE`, targeted to Senior 1st XI).
  - `Youth Masuri Kit Distribution` (`SQUAD_UPDATE`, targeted to Youth U15 with dual-parent delivery).
- **Scheduled Fixtures with Volunteer Slots**:
  - Upcoming match fixture with open slots:
    - 1x `SCORING` ("Official DCF Match Scorer")
    - 1x `UMPIRING` ("Square-Leg Umpire")
    - 1x `TEA_CATERING` ("Match-Day Tea & Hospitality")
    - 2x `YOUTH_CARPOOL` ("Parent Driver - Away Match vs Svanholm")
- **Club Governance Documents**:
  - `Roskilde Cricket Club Vedtægter 2026` (`BYLAWS`, `v2026.1`).
  - `RCC Child Protection & Børneattest Compliance Guidelines` (`CHILD_SAFETY`, `v2026.1`, mandatory for `COACH`).
  - `Club Seasonal Code of Conduct 2026` (`CODE_OF_CONDUCT`, `v2026.1`, mandatory for `PLAYER` & `PARENT`).

---

## 3. Running Unit & Domain Test Suites

Execute Vitest test suites verifying pure domain rules without requiring a live database connection:

```bash
# Run all unit tests
npm run test:unit

# Run specifically the communications, volunteer roster, and compliance tests
npx vitest run tests/unit/communications/
```

### Key Domain Test Suites
1. `announcement-dispatcher.test.ts`:
   - Verifies audience filtering (`ALL_MEMBERS`, `SQUAD_SPECIFIC`, `ROLE_SPECIFIC`).
   - Verifies simultaneous dual-parent notification dispatch for youth squads.
   - Verifies emergency weather cancellation hook (automatically transitioning linked fixture status to `CANCELLED`).
2. `volunteer-roster.test.ts`:
   - Verifies hybrid assignment flow (coach direct assignment vs. member 1-tap claim).
   - Verifies peer swap state machine (`CLAIMED` $\rightarrow$ `SWAP_REQUESTED` $\rightarrow$ `REASSIGNED`).
   - Verifies match lineup conflict warnings for playing XI members.
3. `policy-compliance.test.ts`:
   - Verifies version tracking on document sign-offs.
   - Verifies soft-warning amber banner evaluation for unacknowledged mandatory policies.
4. `communications-gdpr-guard.test.ts`:
   - Verifies upcoming volunteer duty slots held by erased members are vacated and returned to `OPEN`.
   - Verifies historical concluded duties are preserved under `"Former Member #[HASH]"`.
   - Verifies Article 20 export contains authored announcements, read receipts, volunteer duties, and signed documents.

---

## 4. Manual Browser Verification Scenarios

### Scenario A: Emergency Weather / Pitch Cancellation Auto-Update (<30s)
1. Sign in as Coach (e.g. `coach@example.dk`).
2. Open the Match Management console for an upcoming fixture.
3. Tap **"Urgent Cancellation"** banner button.
4. Fill reason ("Heavy morning rain, Roskilde ground pitch flooded") and click **"Publish & Cancel Match"**.
5. Verify in <30s:
   - Notice appears as red/amber emergency banner at top of dashboard.
   - Linked event card updates from `SCHEDULED` to `CANCELLED`.
   - Both registered parents of all youth squad players receive emergency cancellation emails.

### Scenario B: 1-Tap Mobile Volunteer Sign-Up & Dynamic Badge
1. Sign in as a Player or Parent on a mobile viewport (360px).
2. Navigate to **Volunteer Roster** (`/volunteers` or event details).
3. Locate an open slot: *"Official Match Scorer (Volunteers Needed: 0/1)"*.
4. Tap **"Volunteer for this Duty"**.
5. Verify in <10s:
   - Slot transitions to `CLAIMED` with the member's name.
   - Event card badge instantly updates to `"Duties Filled (1/1)"`.

### Scenario C: Peer-to-Peer Duty Swap
1. As the assigned volunteer from Scenario B, open your volunteer commitments.
2. Tap **"Request Swap"**, enter reason ("Called into weekend work shift"), and submit.
3. Slot badge turns amber: `"Swap Requested"`.
4. Sign in as another squad member or parent.
5. In the open volunteer pool, click **"Accept Swap"**.
6. Slot reassigns to the new volunteer; confirmation notification is dispatched.

### Scenario D: Mandatory Child-Safety (*Børneattest*) Soft Warning & Digital Sign-Off
1. Sign in as a Coach who has not yet signed the current season's child-safety policy.
2. Verify an amber banner appears across the dashboard: *"Mandatory Policy Sign-Off: RCC Child Safety & Børneattest Policy (Requires your review)"*.
3. Click the banner link, review the document markdown/PDF viewer, and click **"Confirm Digital Sign-Off"**.
4. Verify the banner immediately disappears and the audit log records the timestamp and document version `v2026.1`.

### Scenario E: Cross-Module GDPR Article 17 Erasure & Article 20 Export
1. Verify an upcoming volunteer slot is held by a test member.
2. In the Admin GDPR console (`/admin/gdpr`), execute Article 17 erasure on the test member.
3. Verify that the upcoming volunteer slot automatically vacates and reverts to `OPEN`.
4. Trigger a GDPR Article 20 export on another member and verify that the JSON archive includes `authoredAnnouncements`, `volunteerDutyHistory`, and `signedDocuments`.
