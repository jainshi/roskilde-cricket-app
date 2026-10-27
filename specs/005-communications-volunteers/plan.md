# Implementation Plan: Module 5 - Club Communications, Announcements & Volunteer Duty Roster

**Branch**: `005-communications-volunteers` | **Date**: 2026-10-27 | **Spec**: [specs/005-communications-volunteers/spec.md](file:///Users/shishirjain/p/s/roskilde-cricket-app/specs/005-communications-volunteers/spec.md)

**Input**: Feature specification from `specs/005-communications-volunteers/spec.md`

---

## Summary

Deliver Module 5: Club Communications, Announcements & Volunteer Duty Roster for the Roskilde Cricket Club web application. This module provides:
1. Targeted announcements (Club-Wide, Squad-Specific, and Role-Targeted) with emergency weather/pitch cancellation alerts that automatically update linked Module 3 `ScheduledEvent` statuses to `CANCELLED` and route notifications to both linked parents simultaneously via Module 1's `NotificationService`.
2. A match-day and club volunteer duty roster directly attached to `ScheduledEvent` fixtures (scoring, umpiring, ground prep, tea/catering, carpool drivers) with a hybrid fulfillment flow (Admin/Coach direct assignment + Member/Parent 1-tap self-signup) and peer-to-peer duty swaps.
3. A centralized, versioned document repository for club bylaws, child-safety (*Børneattest*) policies, and codes of conduct with 1-click digital sign-offs and persistent soft-warning amber banners for unacknowledged mandatory policies.
4. Seamless integration with Module 1 RBAC, Module 3 Events & Match Squad consoles, and GDPR Article 17 erasure and Article 20 data portability services.

---

## Technical Context

**Language/Version**: TypeScript 5.7+ (strict mode enabled).  
**Primary Dependencies**: Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui primitives, Lucide React, Zod runtime schema validation.  
**Storage**: PostgreSQL via Prisma ORM (pooled connection via `DATABASE_URL`, direct connection via `DIRECT_URL`).  
**Testing**: Vitest for pure domain logic and mock-driven unit tests (`npm run test:unit`).  
**Target Platform**: Mobile-first responsive web application (supporting viewports down to 360px), deployed as standalone Node.js container / Vercel.  
**Project Type**: Full-stack modular web application organized in functional modules (`src/modules/communications/` and `src/modules/volunteers/`).  
**Performance Goals**:
- Emergency weather cancellation alert published and event status updated in under **30 seconds** on a 360px viewport.
- 1-tap volunteer slot claim and swap request in under **10 seconds** on mobile.
- Zero layout shift on fixture cards when rendering live volunteer badges.  
**Constraints**:
- Strictly zero floating-point math; integer identifiers and timestamps.
- Zero ad-hoc role checks; strictly use central `hasPermission` / `session-guard` from Module 1.
- Pluggable notifications routed exclusively through Module 1 `NotificationService` interface.  
**Scale/Scope**:
- ~200 active club members and parents, ~15 team squads, ~50 fixtures and events per season, ~300 volunteer duty slots per year.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [X] **Principle I: Type-Safe Full-Stack Modular Architecture**:
  - Full-stack TypeScript in Next.js App Router with Prisma ORM.
  - Source code organized under `src/modules/communications/` and `src/modules/volunteers/` with clear domain, service, and action boundaries.
  - Pluggable notifications route through `NotificationService` (no direct SMTP/provider imports in domain code).
  - Pure domain rules implemented in framework-agnostic TypeScript files (`announcement-dispatcher.ts`, `volunteer-roster.ts`, `policy-compliance.ts`).
- [X] **Principle II: Security, RBAC & GDPR by Default**:
  - Authorisation enforced server-side on every Server Action via `requireRole` and `requireActivatedSession`.
  - Dual-parent notification routing ensures both linked parents of youth players receive squad notices simultaneously.
  - GDPR Article 17 erasure vacates upcoming volunteer duty slots, anonymizes historical completed duties onto `"Former Member #[HASH]"`, and purges personal announcement notes.
  - GDPR Article 20 export packages authored notices, volunteer rosters, and signed policies.
- [X] **Principle III: Pitch-Side First & Mobile Responsive**:
  - 1-tap volunteer claim and peer-to-peer swap flows optimized for mobile touch targets on 360px viewports.
  - Clear visual duty badges (`"Duties Filled"`, `"Volunteers Needed"`, `"Swap Requested"`) visible on fixture cards.
- [X] **Principle IV: Strict Type Safety & Pragmatic Domain Testing**:
  - 100% type-safe inputs and outputs validated via Zod runtime schemas.
  - Focused Vitest test suites covering weather cancellation auto-updates, hybrid volunteer duty assignments, peer swaps, and compliance warning banners.

---

## Project Structure

### Documentation (this feature)

```text
specs/005-communications-volunteers/
├── spec.md              # Feature specification & user requirements
├── plan.md              # This implementation plan
├── research.md          # Technical context & architecture decisions
├── data-model.md        # Prisma models, enums & relational integrity rules
├── quickstart.md        # Verification scenarios & validation guide
├── contracts/           # Zod schemas & Server Action interface contracts
│   └── communications-volunteers.contract.md
├── checklists/
│   └── requirements.md  # Quality validation checklist (100% PASS)
└── tasks.md             # Implementation tasks (generated via /speckit-tasks)
```

### Source Code Layout

```text
src/
├── modules/
│   ├── communications/
│   │   ├── domain/
│   │   │   ├── announcement-dispatcher.ts   # Pure domain audience filter & weather cancellation evaluator
│   │   │   └── policy-compliance.ts        # Pure domain document versioning & soft-warning banner evaluator
│   │   ├── contracts/
│   │   │   ├── announcement.contract.ts     # Zod schemas for announcements & weather alerts
│   │   │   └── document.contract.ts         # Zod schemas for documents & sign-offs
│   │   ├── services/
│   │   │   ├── announcement.service.ts      # Announcement publishing, read receipts, and event cancellation
│   │   │   ├── document.service.ts          # Document repository & sign-off service
│   │   │   └── communications-gdpr.service.ts # GDPR Article 17/20 hooks
│   │   ├── actions/
│   │   │   ├── announcement.actions.ts      # Server Actions for announcements
│   │   │   └── document.actions.ts          # Server Actions for document management & sign-offs
│   │   └── index.ts
│   │
│   └── volunteers/
│       ├── domain/
│       │   └── volunteer-roster.ts          # Pure domain volunteer assignment, peer swaps, and lineup conflict evaluator
│       ├── contracts/
│       │   └── volunteer.contract.ts        # Zod schemas for volunteer duty slots and swaps
│       ├── services/
│       │   └── volunteer.service.ts         # Volunteer slot CRUD, claims, swaps, and badge counters
│       ├── actions/
│       │   └── volunteer.actions.ts         # Server Actions for volunteer slots
│       └── index.ts
│
├── components/
│   ├── communications/
│   │   ├── announcement-feed.tsx            # Noticeboard with pinned announcements & read indicators
│   │   ├── announcement-composer-modal.tsx  # Modal to compose club/squad announcements
│   │   ├── weather-cancellation-modal.tsx   # Fast 1-click weather cancellation & emergency alert modal
│   │   ├── document-library.tsx             # Document repository table with download links
│   │   ├── document-sign-off-modal.tsx      # Modal to review markdown/PDF and sign policy
│   │   └── policy-warning-banner.tsx        # Persistent amber soft-warning banner on dashboards
│   │
│   └── volunteers/
│       ├── volunteer-duty-card.tsx          # Card displaying duty slot, status badge, and claim button
│       ├── volunteer-roster-console.tsx     # Match/Event duty roster manager with hybrid assign & swap
│       ├── volunteer-swap-modal.tsx         # Modal to request or accept a peer duty swap
│       └── volunteer-badge.tsx              # Reusable status badge ("Duties Filled", "Volunteers Needed")
│
├── app/(dashboard)/
│   ├── communications/
│   │   └── page.tsx                         # Member Noticeboard & Club Announcements
│   ├── volunteers/
│   │   └── page.tsx                         # Volunteer Duty Roster Console
│   ├── documents/
│   │   └── page.tsx                         # Club Document Library & Policy Sign-Offs
│   └── admin/compliance/
│       └── page.tsx                         # Admin Policy Sign-Off Compliance Report
│
└── tests/unit/
    ├── communications/
    │   ├── announcement-dispatcher.test.ts  # Weather cancellation & audience dispatching
    │   ├── policy-compliance.test.ts        # Versioned policy sign-off & soft warning tests
    │   └── communications-gdpr-guard.test.ts# GDPR Article 17 erasure & Article 20 export tests
    └── volunteers/
        └── volunteer-roster.test.ts         # Hybrid assignment, peer swaps & lineup conflict tests
```

---

## Phases & Execution Order

### Phase 1: Setup & Data Modeling
- Add Module 5 enums and models (`ClubAnnouncement`, `AnnouncementReadReceipt`, `VolunteerDutySlot`, `ClubDocument`, `DocumentSignOff`) to `prisma/schema.prisma`.
- Generate and run versioned Prisma migration `add_communications_volunteers_module`.
- Implement seed script `scripts/seed-communications.ts` and register `npm run seed:communications`.

### Phase 2: Foundational Pure Domain Logic & Unit Tests
- Implement pure domain rules in:
  - `src/modules/communications/domain/announcement-dispatcher.ts`
  - `src/modules/communications/domain/policy-compliance.ts`
  - `src/modules/volunteers/domain/volunteer-roster.ts`
- Write Vitest unit test suites in `tests/unit/communications/` and `tests/unit/volunteers/`.

### Phase 3: User Story 1 - Targeted Announcements & Weather Alerts
- Implement Zod contracts in `announcement.contract.ts`.
- Implement `announcement.service.ts` with audience resolution, dual-parent youth dispatch, and event cancellation integration.
- Implement Server Actions in `announcement.actions.ts`.
- Build UI components: `announcement-feed.tsx`, `announcement-composer-modal.tsx`, `weather-cancellation-modal.tsx`, and page `/communications`.

### Phase 4: User Story 2 - Match-Day Volunteer Duty Roster & Swaps
- Implement Zod contracts in `volunteer.contract.ts`.
- Implement `volunteer.service.ts` handling hybrid assignment, 1-tap claim, swap requests, swap acceptance, and event card badge calculations.
- Implement Server Actions in `volunteer.actions.ts`.
- Build UI components: `volunteer-duty-card.tsx`, `volunteer-roster-console.tsx`, `volunteer-swap-modal.tsx`, `volunteer-badge.tsx`, and integrate into `/events/[id]` and page `/volunteers`.

### Phase 5: User Story 3 - Club Documents & Policy Sign-Offs
- Implement Zod contracts in `document.contract.ts`.
- Implement `document.service.ts` managing document versions, digital sign-offs, and soft-warning banner evaluation.
- Implement Server Actions in `document.actions.ts`.
- Build UI components: `document-library.tsx`, `document-sign-off-modal.tsx`, `policy-warning-banner.tsx`, `/documents`, and `/admin/compliance`.

### Phase 6: User Story 4 - Cross-Module Polish & GDPR Hooks
- Update `src/modules/auth-rbac/services/gdpr-deletion.service.ts` to vacate upcoming volunteer slots and anonymize historical records.
- Update `src/modules/auth-rbac/services/gdpr-export.service.ts` to include announcements, volunteer duties, and signed policies.
- Update `app-shell.tsx` and `mobile-drawer.tsx` navigation linking `/communications`, `/volunteers`, and `/documents`.
- Write GDPR integration unit test in `tests/unit/communications/communications-gdpr-guard.test.ts`.

### Phase 7: Polish & Final Verification Gate
- Run full verification suite:
  - `npx tsc --noEmit`
  - `npm run test:unit`
  - `npm run build`
- Confirm production readiness and summarize deliverables.
