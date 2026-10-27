# Implementation Tasks: Module 5 - Club Communications, Announcements & Volunteer Duty Roster

**Feature Branch**: `005-communications-volunteers`  
**Date**: 2026-10-27  
**Module**: Module 5 (`src/modules/communications/` & `src/modules/volunteers/`)  
**Design Artifacts**:
- Spec: [specs/005-communications-volunteers/spec.md](file:///Users/shishirjain/p/s/roskilde-cricket-app/specs/005-communications-volunteers/spec.md)
- Plan: [specs/005-communications-volunteers/plan.md](file:///Users/shishirjain/p/s/roskilde-cricket-app/specs/005-communications-volunteers/plan.md)
- Data Model: [specs/005-communications-volunteers/data-model.md](file:///Users/shishirjain/p/s/roskilde-cricket-app/specs/005-communications-volunteers/data-model.md)
- Contracts: [specs/005-communications-volunteers/contracts/communications-volunteers.contract.md](file:///Users/shishirjain/p/s/roskilde-cricket-app/specs/005-communications-volunteers/contracts/communications-volunteers.contract.md)
- Quickstart: [specs/005-communications-volunteers/quickstart.md](file:///Users/shishirjain/p/s/roskilde-cricket-app/specs/005-communications-volunteers/quickstart.md)

---

## Phase 1: Setup & Prisma Schema Migration

**Purpose**: Database schema expansion for Module 5 models, reverse relations, migration execution, and seed data.

- [ ] T001 Define Module 5 enums (`AnnouncementCategory`, `AnnouncementPriority`, `AnnouncementAudience`, `VolunteerDutyType`, `VolunteerSlotStatus`, `DocumentCategory`) and models (`ClubAnnouncement`, `AnnouncementReadReceipt`, `VolunteerDutySlot`, `ClubDocument`, `DocumentSignOff`) with reverse relations on `MemberProfile`, `ScheduledEvent`, and `TeamSquad` in `prisma/schema.prisma`
- [ ] T002 Execute Prisma database migration `add_communications_volunteers_module` and regenerate client in `prisma/migrations/`
- [ ] T003 Implement realistic Roskilde Cricket Club communications and volunteer seed script with sample announcements, emergency weather cancellation triggers, match volunteer slots, and versioned club governance documents in `scripts/seed-communications.ts`
- [ ] T004 Register `seed:communications` script in `package.json` and verify seed execution with `npm run seed:communications`

---

## Phase 2: Foundational Pure Domain Logic & Unit Tests

**Purpose**: Framework-agnostic pure domain calculation and validation rules with comprehensive Vitest unit test suites.

- [ ] T005 [P] Implement pure announcement audience filtering, dual-parent notification dispatching logic, and weather emergency event cancellation evaluator in `src/modules/communications/domain/announcement-dispatcher.ts`
- [ ] T006 [P] Create Vitest unit test suite for announcement audience scoping, dual-parent dispatching, and weather emergency cancellation triggers in `tests/unit/communications/announcement-dispatcher.test.ts`
- [ ] T007 [P] Implement pure volunteer duty assignment logic, 1-tap mobile claims, peer-to-peer swap state machine (`CLAIMED` $\rightarrow$ `SWAP_REQUESTED` $\rightarrow$ `REASSIGNED`), and match playing XI lineup conflict safeguard in `src/modules/volunteers/domain/volunteer-roster.ts`
- [ ] T008 [P] Create Vitest unit test suite for volunteer duty assignments, peer swaps, and match lineup conflict warnings in `tests/unit/volunteers/volunteer-roster.test.ts`
- [ ] T009 [P] Implement pure document version sign-off validation and soft-warning amber banner evaluator in `src/modules/communications/domain/policy-compliance.ts`
- [ ] T010 [P] Create Vitest unit test suite for document version tracking and unacknowledged mandatory policy soft-warning banner evaluation in `tests/unit/communications/policy-compliance.test.ts`

**Checkpoint**: Pure domain foundation ready. All Vitest unit test suites in `tests/unit/communications/` and `tests/unit/volunteers/` pass 100%.

---

## Phase 3: User Story 1 - Targeted Announcements, Weather Alerts & Dual-Parent Routing (Priority: P1)

**Goal**: Deliver targeted club and squad announcements with emergency weather alerts that auto-cancel linked Module 3 events and route notifications to both linked parents simultaneously.

**Independent Test**: Compose and publish an urgent weather cancellation announcement linked to a scheduled fixture, verify the fixture automatically transitions to `CANCELLED`, verify that both linked parents receive notification emails, and check that read receipts are recorded upon viewing.

- [ ] T011 [P] [US1] Define Zod schemas and TypeScript contracts for announcements and weather cancellations (`createAnnouncementSchema`, `publishWeatherCancellationSchema`, `markAnnouncementReadSchema`) in `src/modules/communications/contracts/announcement.contract.ts`
- [ ] T012 [US1] Implement Announcement Service managing CRUD, audience scoping (`ALL_MEMBERS`, `SQUAD_SPECIFIC`, `ROLE_SPECIFIC`), dual-parent notification delivery via `NotificationService`, read-receipt tracking, and atomic event cancellation hooks in `src/modules/communications/services/announcement.service.ts`
- [ ] T013 [US1] Implement Server Actions for announcements (`createAnnouncementAction`, `publishWeatherCancellationAction`, `markAnnouncementReadAction`, `deleteAnnouncementAction`) in `src/modules/communications/actions/announcement.actions.ts`
- [ ] T014 [P] [US1] Build fast, mobile-responsive emergency weather/pitch cancellation modal with 1-click event cancellation in `src/components/communications/weather-cancellation-modal.tsx`
- [ ] T015 [P] [US1] Build rich announcement composer modal with audience targeting selector and pinned priority checkbox in `src/components/communications/announcement-composer-modal.tsx`
- [ ] T016 [P] [US1] Build member noticeboard feed component displaying pinned notices, urgent weather banners, and read-receipt indicators in `src/components/communications/announcement-feed.tsx`
- [ ] T017 [US1] Build Member Noticeboard & Club Announcements page in `src/app/(dashboard)/communications/page.tsx`
- [ ] T018 [US1] Integrate emergency weather cancellation button and active cancellation banner into Module 3's Event Details page in `src/app/(dashboard)/events/[id]/page.tsx`

**Checkpoint**: User Story 1 functional. Announcements published with audience targeting, emergency weather notices automatically cancel linked fixtures, dual-parent dispatch verified, and read receipts tracked.

---

## Phase 4: User Story 2 - Volunteer Duty Roster, Hybrid Assignment & Peer Swaps (Priority: P2)

**Goal**: Attach volunteer duty slots directly to Module 3 `ScheduledEvent` fixtures (scoring, umpiring, ground prep, tea/catering, carpool) with hybrid assignment (admin direct assign vs. 1-tap mobile claim), peer swaps, and live fixture card badges.

**Independent Test**: Add volunteer slots to a fixture, claim a duty in 1 tap on a 360px mobile viewport, verify the event card badge updates from `"Volunteers Needed (0/2)"` to `"Duties Filled (1/2)"`, submit a peer swap request, and accept the swap as another member.

- [ ] T019 [P] [US2] Define Zod schemas and TypeScript contracts for volunteer slots and swaps (`createVolunteerDutySlotSchema`, `assignVolunteerDutySlotSchema`, `claimVolunteerDutySlotSchema`, `requestVolunteerSwapSchema`, `acceptVolunteerSwapSchema`) in `src/modules/volunteers/contracts/volunteer.contract.ts`
- [ ] T020 [US2] Implement Volunteer Service handling slot creation, admin direct assignment, 1-tap mobile claims, peer swap request/acceptance workflows, and lineup conflict checks in `src/modules/volunteers/services/volunteer.service.ts`
- [ ] T021 [US2] Implement Server Actions for volunteer duties (`createVolunteerDutySlotAction`, `assignVolunteerDutySlotAction`, `claimVolunteerDutySlotAction`, `requestVolunteerSwapAction`, `acceptVolunteerSwapAction`, `unassignVolunteerDutySlotAction`) in `src/modules/volunteers/actions/volunteer.actions.ts`
- [ ] T022 [P] [US2] Build reusable visual volunteer fulfillment badge component (`"Duties Filled"`, `"Volunteers Needed"`, `"Swap Requested"`) in `src/components/volunteers/volunteer-badge.tsx`
- [ ] T023 [P] [US2] Build volunteer duty card component with 1-tap claim, carpool seat selector, and contact details in `src/components/volunteers/volunteer-duty-card.tsx`
- [ ] T024 [P] [US2] Build peer-to-peer volunteer duty swap modal in `src/components/volunteers/volunteer-swap-modal.tsx`
- [ ] T025 [P] [US2] Build match-day volunteer console and roster manager in `src/components/volunteers/volunteer-roster-console.tsx`
- [ ] T026 [US2] Integrate volunteer duty roster section and live fulfillment badges into Module 3's Event Details page in `src/app/(dashboard)/events/[id]/page.tsx`
- [ ] T027 [US2] Build dedicated Volunteer Duty Roster hub page in `src/app/(dashboard)/volunteers/page.tsx`

**Checkpoint**: User Story 2 functional. Volunteer duty slots attached to fixtures, 1-tap claims and peer swaps active, lineup conflict safeguards enforced, and dynamic event card badges visible.

---

## Phase 5: User Story 3 - Club Governance Documents & Mandatory Digital Sign-Offs (Priority: P3)

**Goal**: Centralize club governance documents (Bylaws, Child-Safety *Børneattest* guidelines, Codes of Conduct) with version tracking, 1-click digital sign-offs, persistent amber soft-warning banners, and compliance auditing.

**Independent Test**: Upload a mandatory child-safety policy for coaches, verify an unacknowledged coach sees the persistent amber dashboard banner, complete 1-click digital sign-off, verify the banner clears, and check the admin compliance audit report.

- [ ] T028 [P] [US3] Define Zod schemas and TypeScript contracts for documents and sign-offs (`createClubDocumentSchema`, `signOffDocumentSchema`) in `src/modules/communications/contracts/document.contract.ts`
- [ ] T029 [US3] Implement Document Service managing document versioning, digital sign-offs with audit logs, and soft-warning banner evaluation in `src/modules/communications/services/document.service.ts`
- [ ] T030 [US3] Implement Server Actions for document management and sign-offs (`createClubDocumentAction`, `signOffDocumentAction`, `sendPolicyReminderAction`) in `src/modules/communications/actions/document.actions.ts`
- [ ] T031 [P] [US3] Build persistent amber soft-warning policy banner component for unacknowledged mandatory documents in `src/components/communications/policy-warning-banner.tsx`
- [ ] T032 [P] [US3] Build document sign-off modal with policy markdown viewer and 1-click confirmation in `src/components/communications/document-sign-off-modal.tsx`
- [ ] T033 [P] [US3] Build club document library table component with category filters and version tags in `src/components/communications/document-library.tsx`
- [ ] T034 [US3] Build Club Documents & Policy Sign-Offs page in `src/app/(dashboard)/documents/page.tsx`
- [ ] T035 [US3] Build Admin Document Compliance & Audit Report page in `src/app/(dashboard)/admin/compliance/page.tsx`
- [ ] T036 [US3] Integrate `PolicyWarningBanner` into the global dashboard layout in `src/app/(dashboard)/layout.tsx`

**Checkpoint**: User Story 3 functional. Document repository active, 1-click sign-offs logged with timestamps, persistent amber soft-warning banner renders on unacknowledged accounts, and admin compliance auditing active.

---

## Phase 6: User Story 4 - Cross-Module Integration, GDPR Hooks & Navigation (Priority: P4)

**Goal**: Enforce GDPR Article 17 erasure rules (vacating upcoming volunteer duties and anonymizing historical records) and Article 20 data portability, plus polish navigation across desktop top-bar and mobile App Launcher.

**Independent Test**: Execute GDPR erasure on a member with upcoming and past volunteer duties, verify upcoming duties revert to `OPEN` while past duties link to `"Former Member #[HASH]"`, run Article 20 export verifying communications data is present, and verify desktop and mobile navigation links.

- [ ] T037 [US4] Implement communications and volunteer GDPR helper service in `src/modules/communications/services/communications-gdpr.service.ts`
- [ ] T038 [US4] Update `gdpr-deletion.service.ts` to vacate upcoming volunteer duty slots (`assignedProfileId = null`, `status = OPEN`), anonymize historical duties onto `"Former Member #[HASH]"`, and scrub personal announcement commentary upon approved erasure in `src/modules/auth-rbac/services/gdpr-deletion.service.ts`
- [ ] T039 [US4] Update `gdpr-export.service.ts` to include authored announcements, read receipts, volunteer duty history, and signed documents in Article 20 "Download My Data" export package in `src/modules/auth-rbac/services/gdpr-export.service.ts`
- [ ] T040 [P] [US4] Create Vitest unit test suite verifying GDPR Article 17 upcoming slot vacating, historical duty anonymization, and Article 20 data extraction in `tests/unit/communications/communications-gdpr-guard.test.ts`
- [ ] T041 [P] [US4] Update desktop navigation top-bar in `src/components/navigation/app-shell.tsx` with links to Noticeboard (`/communications`), Volunteer Roster (`/volunteers`), and Club Documents (`/documents`)
- [ ] T042 [P] [US4] Update mobile App Launcher 2-column grid in `src/components/navigation/mobile-drawer.tsx` with cards for Noticeboard, Volunteer Roster, Club Documents, and Admin Compliance

**Checkpoint**: User Story 4 functional. GDPR Article 17/20 hooks verified with unit tests and global navigation updated.

---

## Phase 7: Polish & Final Verification Gate

**Purpose**: Type check, full test suite pass, production build validation, and quickstart documentation.

- [ ] T043 Update developer integration and verification documentation in `specs/005-communications-volunteers/quickstart.md`
- [ ] T044 Run TypeScript compiler check `npx tsc --noEmit` and resolve any type discrepancies
- [ ] T045 Run full unit test suite `npm run test:unit` ensuring 100% pass rate across all 35+ test files
- [ ] T046 Run production build `npm run build` ensuring all 40+ static and dynamic routes generate with 0 errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup & Schema)**: No dependencies — can start immediately.
- **Phase 2 (Foundational Domain)**: Depends on Phase 1 schema models being generated — BLOCKS all user stories.
- **Phase 3 (User Story 1 - P1)**: Depends on Phase 2 pure domain logic completion.
- **Phase 4 (User Story 2 - P2)**: Depends on Phase 2 pure domain logic and Phase 3 event integration.
- **Phase 5 (User Story 3 - P3)**: Depends on Phase 2 pure domain logic completion.
- **Phase 6 (User Story 4 - P4)**: Depends on Phases 3, 4, and 5 being implemented.
- **Phase 7 (Final Polish & Gate)**: Depends on all user stories being completed.

---

## Parallel Execution Opportunities

- Phase 2: Domain tasks `T005`, `T007`, and `T009` and their test suites `T006`, `T008`, and `T010` can be developed in parallel.
- Phase 3: UI modals `T014`, `T015`, and `T016` can be built in parallel.
- Phase 4: UI components `T022`, `T023`, `T024`, and `T025` can be built in parallel.
- Phase 5: UI components `T031`, `T032`, and `T033` can be built in parallel.
- Phase 6: Navigation updates `T041` and `T042` and test suite `T040` can be built in parallel.

---

## Implementation Strategy (MVP First)

1. **Sprint 1 (MVP)**: Complete Phase 1 (Schema & Seed), Phase 2 (Domain & Tests), and Phase 3 (User Story 1 - Announcements & Weather Emergency Cancellations). Stop and verify that weather cancellations auto-update fixtures and notify parents.
2. **Sprint 2 (Volunteer Roster)**: Complete Phase 4 (User Story 2 - Match-Day Volunteer Roster, 1-Tap Mobile Claims, and Peer Swaps). Stop and verify pitch-side duty fulfillment.
3. **Sprint 3 (Club Documents & Policies)**: Complete Phase 5 (User Story 3 - Versioned Documents, 1-Click Sign-Offs, and Soft Warning Banner).
4. **Sprint 4 (GDPR & Production Gate)**: Complete Phase 6 & Phase 7, run `npx tsc --noEmit`, `npm run test:unit`, and `npm run build` to confirm readiness to merge into `master`.
