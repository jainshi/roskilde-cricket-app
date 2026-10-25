# Technical Research: Teams, Squads, Training & Match Scheduling

**Feature Branch**: `003-teams-matches-scheduling`  
**Date**: 2026-10-25  
**Module**: Module 3 / Module 4 Domains (`src/modules/teams-matches/`)

---

## 1. Modular Domain Architecture & Boundaries

Per Constitution Principle I (Type-Safe Full-Stack Modular Architecture), the application isolates domain rules, persistence, validation contracts, and UI across defined modular boundaries. Module 3 manages teams, age-group squads, fixtures, training sessions, ground/facility reservations, 1-tap RSVPs, match squad selections, and pitch-side attendance checklists.

```text
src/modules/teams-matches/
├── domain/                    # Pure, framework-agnostic TypeScript business logic (no Prisma, no React)
│   ├── age-eligibility.ts     # Age calculation, youth eligibility & playing-up validation
│   ├── facility-conflicts.ts  # Interval overlap detection, role-based blocking & admin override
│   ├── rsvp-evaluator.ts      # Explicit NO_RESPONSE seeding & cutoff deadline lock evaluator
│   ├── lineup-validator.ts    # Configurable match squad sizing (11 vs 8–12), roles & duplicates
│   ├── attendance-rules.ts    # Attendance status defaults & session locking
│   └── folkeoplysning-export.ts # Danish municipal CSV attendance generator (all members)
├── contracts/                 # Runtime Zod validation schemas and DTOs
│   ├── squad.contract.ts      # Squad & roster CRUD contracts
│   ├── event.contract.ts      # Match/Training scheduling & facility booking contracts
│   ├── rsvp.contract.ts       # 1-tap RSVP & delegation contracts
│   ├── selection.contract.ts  # Lineup selection & publication contracts
│   └── attendance.contract.ts # Pitch-side check-in & municipal report export contracts
├── services/                  # Database orchestration with Prisma transactions
│   ├── squad.service.ts
│   ├── event.service.ts
│   ├── facility.service.ts
│   ├── rsvp.service.ts
│   ├── selection.service.ts
│   ├── attendance.service.ts
│   └── folkeoplysning.service.ts
└── actions/                   # Next.js Server Actions with RBAC & session verification
    ├── squad.actions.ts
    ├── event.actions.ts
    ├── rsvp.actions.ts
    ├── selection.actions.ts
    └── attendance.actions.ts
```

### Module Boundary Crossings
- **Auth/RBAC Module (`src/modules/auth-rbac`)**:
  - `requireSession()`, central `hasPermission(session, permission)` check, and `validateDelegationAccess()`.
  - `resolveMemberContacts(memberProfileId)` for simultaneous dual-parent contact fallback when notifying minors.
  - Integrates with `gdpr-deletion.service.ts` to preserve statistical appearance counters on `"Former Member #..."` while scrubbing personal notes.
  - Integrates with `gdpr-export.service.ts` to bundle squad memberships, RSVPs, selections, and attendance.
- **Inventory Module (`src/modules/inventory`)**:
  - Links match fixtures directly to `EquipmentItem` / `EquipmentLoan` bags for pitch-side checkout.
- **Communications Module (`src/modules/auth-rbac/notifications`)**:
  - Pluggable `notificationService` for dispatching lineup selections, fixture reschedules, and training cancellation alerts simultaneously to both linked parents for minor players.

---

## 2. Pure Domain Rules & Algorithmic Specifications

### 2.1 Age-Group Eligibility Evaluator (`age-eligibility.ts`)
- **Context**: In Danish cricket (DCF rules), youth categories are determined by participant age as of the cutoff date (January 1st of the competition season year).
- **Rules**:
  - `SENIOR` & `SOCIAL`: Open to all players aged 15+. Minors aged 13–17 may play senior cricket with active parent delegation ("playing up").
  - `YOUTH`:
    - `U13`: Must be <13 on the cutoff date.
    - `U15`: Must be <15 on the cutoff date.
    - `U17`: Must be <17 on the cutoff date.
  - **Validation Outcomes**:
    - `ELIGIBLE`: Date of birth strictly satisfies category rules.
    - `PLAYING_UP`: Younger player assigned to an older youth squad or senior squad (permitted with warning flag).
    - `OVERAGE_BLOCKED`: Player is older than squad age cap (blocked unless explicitly flagged with approved dispensation).

### 2.2 Facility / Ground Collision Detector (`facility-conflicts.ts`)
- **Interval Overlap Equation**:
  Two events $A$ and $B$ sharing the same physical `facilityId` collide if:
  $$\max(A.startAt, B.startAt) < \min(A.endAt, B.endAt)$$
- **Role-Based Policy (Clarification #3)**:
  - If a collision is detected and the user has role `COACH` or `AD_HOC_COACH`: Hard block creation, return `{ allowed: false, collision: ConflictingEventSummary }`.
  - If the user has role `ADMIN`: Allow collision override if `collisionOverrideReason` is non-empty; return `{ allowed: true, isOverride: true, auditEntry: ... }`.

### 2.3 Explicit `NO_RESPONSE` RSVP & Cutoff Lock Evaluator (`rsvp-evaluator.ts`)
- **Initialization (Clarification #2)**:
  - When any scheduled event (competitive match or recurring training session) is published, all active squad roster members are seeded with status `NO_RESPONSE`.
- **Lock Evaluation**:
  - If `now() >= event.rsvpDeadlineAt`, player/parent self-service edits are locked: returns `{ isLocked: true, message: "RSVP deadline has passed. Please contact team Coach directly." }`.
  - Coaches and Admins retain override access to update player availability pitch-side.

### 2.4 Configurable Match Squad Lineup Validator (`lineup-validator.ts`)
- **Lineup Sizing (Clarification #1)**:
  - Default target starting size: 11 for Senior League.
  - Customizable target size: 8 to 12 for Youth and Friendlies.
- **Validation Invariants**:
  - No duplicate players between `STARTING`, `SUBSTITUTE`, and `RESERVE` slots.
  - Selected starting players must exactly equal `targetLineupSize` prior to publication.
  - Exactly one `CAPTAIN` and at most one `VICE_CAPTAIN` assigned among starting players.
  - Exactly one `WICKETKEEPER` assigned among starting players.
  - Selected minor players trigger dual-parent notifications on lineup publication.

### 2.5 Danish Folkeoplysning Municipal Attendance CSV Generator (`folkeoplysning-export.ts`)
- **Scope (Clarification #4)**:
  - Generates CSV reports covering all attending club members regardless of age across the specified date range.
- **Columns**:
  - `Session Date`, `Session Type`, `Squad Name`, `Facility / Venue`, `Member Name`, `Member ID`, `Date of Birth`, `Age At Session`, `Attendance Status`, `Arrival Time`, `Recorded By`.

### 2.6 Out of Scope: Live Match Scoring (Clarification #5)
- In-app ball-by-ball scoring, live run-counters, bowling figures, and league tables are permanently out of scope. Matches track lifecycle status (`SCHEDULED`, `PLAYED`, `RAINED_OUT`, `CANCELLED`) with an optional external `scorecardUrl` link.

---

## 3. Technology Choices & Justifications

| Concern | Choice | Rationale | Alternatives Rejected |
|---------|--------|-----------|------------------------|
| **Facility Conflict Detection** | Pure TS function + Prisma indexed interval queries | Microsecond execution (<5ms) with zero heavy external booking engine dependencies. | Cron poller (too slow); external calendar sync (excessive operational complexity). |
| **Municipal Export** | In-memory CSV streaming via Node streams | Instant generation (<100ms for 5,000 attendance records) with zero client bundle overhead. | Heavy PDF generation libraries; client-side JS CSV builders. |
| **Lineup Publication** | Transactional publication with atomic notification dispatch | Ensures lineup state and audit trail are committed before external emails/alerts are dispatched. | Non-transactional mutation (risk of partial publication failure). |
| **Pitch-Side Usability** | Mobile-first touch list (<30s on 360px) with 1-tap pills | Optimized for outdoor sunlight visibility and cold Danish weather with >=44px touch targets. | Multi-click nested dropdown menus; desktop tables. |
