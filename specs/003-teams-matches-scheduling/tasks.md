# Tasks: Teams, Squads, Training & Match Scheduling

**Branch**: `003-teams-matches-scheduling`  
**Date**: 2026-10-25  
**Spec**: [specs/003-teams-matches-scheduling/spec.md](file:///Users/shishirjain/p/s/roskilde-cricket-app/specs/003-teams-matches-scheduling/spec.md)  
**Plan**: [specs/003-teams-matches-scheduling/plan.md](file:///Users/shishirjain/p/s/roskilde-cricket-app/specs/003-teams-matches-scheduling/plan.md)  
**Status**: Ready for Implementation  

---

## Phase 1: Setup & Prisma Schema Migration

**Goal**: Establish the relational data schema for all teams, age-group squads, club facilities, scheduled fixtures/trainings, RSVPs, match selections, and pitch-side attendances; generate Prisma client types and provide realistic seed data for Roskilde Cricket Club.

- [ ] T001 Define Module 3 Enums (`SquadCategory`, `SquadStaffRole`, `RosterRole`, `FacilityType`, `EventType`, `MatchType`, `TrainingType`, `EventLifecycleStatus`, `RsvpStatus`, `SelectionPublicationStatus`, `LineupSlot`, `MatchTacticalRole`, `AttendanceStatus`) and Models (`TeamSquad`, `TeamCoachAssignment`, `TeamRosterMember`, `ClubFacility`, `ScheduledEvent`, `EventRsvp`, `MatchSelection`, `MatchSelectionPlayer`, `EventAttendance`) with `MemberProfile` and `EquipmentLoan` relations in `prisma/schema.prisma`
- [ ] T002 Create and execute Prisma migration `add_teams_matches_scheduling` and regenerate Prisma client via `npx prisma generate`
- [ ] T003 [P] Create realistic Roskilde Cricket Club seed script in `scripts/seed-teams-matches.ts` seeding club squads (1st XI, 2nd XI, U15 Youth, U13 Youth, Social XI), facilities (Poppelgårdsvej Main Pitch, Practice Nets 1-2, Practice Nets 3-4, Roskilde Hallen), upcoming fixtures, and recurring net practices
- [ ] T004 [P] Add seed execution script `seed:teams` in `package.json`

**Checkpoint**: Database schema migrated and validated; sample club squads, facilities, and upcoming events seeded.

---

## Phase 2: Pure Domain Logic & Unit Tests

**Goal**: Implement framework-agnostic, zero-dependency pure TypeScript business rules for age eligibility, facility conflict detection, RSVP deadline locks, configurable lineup sizing, attendance status defaults, and Folkeoplysning municipal CSV generation.

- [ ] T005 [P] Implement `src/modules/teams-matches/domain/age-eligibility.ts` calculating youth category eligibility against Danish Cricket Federation (DCF) Jan 1 cutoff date, detecting overage bounds, and permitting multi-squad "playing up"
- [ ] T006 [P] Implement unit tests in `tests/unit/teams-matches/age-eligibility.test.ts` covering U13, U15, U17 age boundaries, approved dispensation flags, and adult league eligibility
- [ ] T007 [P] Implement `src/modules/teams-matches/domain/facility-conflicts.ts` calculating interval overlaps on club facility resources, hard-blocking `COACH` / `AD_HOC_COACH` roles, and permitting `ADMIN` overrides with required audit reason
- [ ] T008 [P] Implement unit tests in `tests/unit/teams-matches/facility-conflicts.test.ts` verifying time-interval overlap detection, coach hard-blocking, and admin override validation
- [ ] T009 [P] Implement `src/modules/teams-matches/domain/rsvp-evaluator.ts` initializing roster members with `NO_RESPONSE` and enforcing self-service cutoff deadline locks (`now() >= rsvpDeadlineAt`)
- [ ] T010 [P] Implement unit tests in `tests/unit/teams-matches/rsvp-evaluator.test.ts` verifying `NO_RESPONSE` seeding, cutoff deadline locks, and parental delegation permissions
- [ ] T011 [P] Implement `src/modules/teams-matches/domain/lineup-validator.ts` validating configurable starting squad size (11 for Senior League, 8–12 for Youth and Friendlies), unique Captain/Vice-Captain/Wicketkeeper assignments, and duplicate player guards
- [ ] T012 [P] Implement unit tests in `tests/unit/teams-matches/lineup-validator.test.ts` verifying variable starting sizes (8, 10, 11, 12), tactical role uniqueness, and substitute slot invariants
- [ ] T013 [P] Implement `src/modules/teams-matches/domain/folkeoplysning-export.ts` generating Danish municipal CSV attendance reports covering all attending club members across date ranges
- [ ] T014 [P] Implement unit tests in `tests/unit/teams-matches/folkeoplysning-export.test.ts` verifying CSV formatting, age calculations at event date, and inclusion of all club members

**Checkpoint**: All domain unit tests passing with 100% pure function coverage (`npm run test:unit`).

---

## Phase 3: Teams, Squads & Roster Management (Priority: P1) 🎯 MVP

**Goal**: Deliver User Story 1 (P1) allowing Administrators and Coaches to create teams and age-group squads, assign coaching staff and team captains, manage player rosters with automated age-eligibility validation, and integrate with App Launcher Grid navigation.

- [ ] T015 [P] [US1] Define Zod validation schemas for squad and roster operations in `src/modules/teams-matches/contracts/squad.contract.ts`
- [ ] T016 [US1] Implement squad and roster management service in `src/modules/teams-matches/services/squad.service.ts` supporting squad CRUD, coach staff assignments, roster memberships, and age-eligibility checks
- [ ] T017 [US1] Implement Server Actions in `src/modules/teams-matches/actions/squad.actions.ts` (`createSquadAction`, `updateSquadAction`, `assignRosterMemberAction`, `removeRosterMemberAction`, `assignSquadCoachesAction`) with central RBAC session validation
- [ ] T018 [P] [US1] Build filterable squad roster table in `src/components/teams/squad-roster-table.tsx` with role badges, age categories, jersey numbers, and batting/bowling attributes
- [ ] T019 [P] [US1] Build squad card component in `src/components/teams/squad-card.tsx` displaying category badges, coach leadership, and active player counts
- [ ] T020 [US1] Build add roster member dialog with automated age-eligibility alerts in `src/components/teams/add-roster-member-dialog.tsx`
- [ ] T021 [US1] Build squad directory page in `src/app/(dashboard)/teams/page.tsx` and squad creation page in `src/app/(dashboard)/teams/new/page.tsx`
- [ ] T022 [US1] Build squad details and roster management page in `src/app/(dashboard)/teams/[id]/page.tsx` and `src/app/(dashboard)/teams/[id]/roster/page.tsx`
- [ ] T023 [US1] Update App Launcher Grid in `src/components/navigation/app-launcher-grid.tsx` with high-visibility shortcut to `/teams`

**Checkpoint**: Administrators and coaches can manage squads and rosters; age eligibility prevents junior misallocations while permitting senior multi-squad play; navigates seamlessly from App Launcher Grid.

---

## Phase 4: Facility Allocation, Match Fixtures & Training Scheduling (Priority: P2)

**Goal**: Deliver User Story 2 (P2) allowing Coaches and Administrators to schedule competitive matches and training sessions with facility collision detection, Coach hard-blocking, Admin warning overrides, optional external `scorecardUrl`, and Module 2 kit bag linkage.

- [ ] T024 [P] [US2] Define Zod validation schemas for event scheduling and facility bookings in `src/modules/teams-matches/contracts/event.contract.ts`
- [ ] T025 [US2] Implement facility management and conflict checking service in `src/modules/teams-matches/services/facility.service.ts`
- [ ] T026 [US2] Implement event scheduling service in `src/modules/teams-matches/services/event.service.ts` handling match/training creation, real-time facility conflict detection, admin collision override auditing, and automatic `NO_RESPONSE` RSVP seeding for rostered players
- [ ] T027 [US2] Implement Server Actions in `src/modules/teams-matches/actions/event.actions.ts` (`createScheduledEventAction`, `updateScheduledEventAction`, `updateEventLifecycleStatusAction`)
- [ ] T028 [P] [US2] Build master event and training calendar view in `src/components/events/event-calendar-view.tsx` with month/week filters and home/away badges
- [ ] T029 [US2] Build event scheduling form component in `src/components/events/event-form.tsx` featuring real-time facility collision alerts, Admin override input, optional `scorecardUrl`, and Module 2 equipment bag picker
- [ ] T030 [US2] Build master events schedule page in `src/app/(dashboard)/events/page.tsx` and event creation page in `src/app/(dashboard)/events/new/page.tsx`
- [ ] T031 [US2] Build administrative facilities directory and booking view in `src/app/(dashboard)/admin/facilities/page.tsx`

**Checkpoint**: Coaches and admins can schedule fixtures and net practices; overlapping facility bookings are hard-blocked for coaches and audited for admins; external scorecard links and Module 2 kit bags link directly.

---

## Phase 5: 1-Tap Mobile RSVP, Parental Delegation & Match Squad Selection Console (Priority: P3)

**Goal**: Deliver User Story 3 (P3) allowing players and parents to submit 1-tap availability RSVPs (`AVAILABLE`, `UNAVAILABLE`, `MAYBE`) with transport notes before cutoff deadlines, and providing Coaches with a Match Selection Console to pick configurable lineups (11 vs. 8–12) with simultaneous dual-parent alerts.

- [ ] T032 [P] [US3] Define Zod validation schemas for RSVP submission and lineup selection in `src/modules/teams-matches/contracts/rsvp.contract.ts` and `src/modules/teams-matches/contracts/selection.contract.ts`
- [ ] T033 [US3] Implement RSVP service in `src/modules/teams-matches/services/rsvp.service.ts` supporting 1-tap status submission, parental delegation verification via `validateDelegationAccess()`, transport notes, and cutoff deadline lock enforcement
- [ ] T034 [US3] Implement match selection service in `src/modules/teams-matches/services/selection.service.ts` managing draft/published lineup states, configurable starting size validation, and simultaneous dual-parent notification dispatch via `NotificationService`
- [ ] T035 [US3] Implement Server Actions in `src/modules/teams-matches/actions/rsvp.actions.ts` (`submitEventRsvpAction`) and `src/modules/teams-matches/actions/selection.actions.ts` (`saveMatchLineupDraftAction`, `publishMatchLineupAction`)
- [ ] T036 [P] [US3] Build 1-tap mobile RSVP status bar in `src/components/events/rsvp-status-bar.tsx` with touch-friendly pills, transport note modal, and cutoff lock state indicator
- [ ] T037 [US3] Build Match-Day Selection Console component in `src/components/events/match-selection-console.tsx` featuring player availability grouping, configurable starting lineup picker (11 vs. 8–12), substitute slots, and Captain/Vice-Captain/Wicketkeeper tactical role tags
- [ ] T038 [US3] Build event detail and RSVP view in `src/app/(dashboard)/events/[id]/page.tsx` integrated with `HeaderProfileSwitcher` delegation for linked youth players
- [ ] T039 [US3] Build match squad selection console route in `src/app/(dashboard)/events/[id]/selection/page.tsx`

**Checkpoint**: 1-tap mobile RSVP operates with parent delegation and cutoff locks; coaches can select and publish configurable lineups; dual-parent alerts dispatch reliably for selected minor players.

---

## Phase 6: Pitch-Side Mobile Attendance, Folkeoplysning CSV Export & GDPR Article 17/20 Hooks (Priority: P4)

**Goal**: Deliver User Story 4 (P4) and cross-module governance: build an ultra-fast (<30s on 360px viewport) pitch-side attendance checklist, immutable attendance locking, 1-click Danish Folkeoplysning municipal CSV report generation, and cross-module GDPR Article 17/20 hooks.

- [ ] T040 [P] [US4] Define Zod validation schemas for pitch-side attendance and municipal report export in `src/modules/teams-matches/contracts/attendance.contract.ts`
- [ ] T041 [US4] Implement attendance service in `src/modules/teams-matches/services/attendance.service.ts` defaulting to `PRESENT` for selected/available players, recording arrival times, and locking completed attendance sessions
- [ ] T042 [US4] Implement Folkeoplysning municipal export service in `src/modules/teams-matches/services/folkeoplysning.service.ts` streaming CSV data for all attending club members across date ranges
- [ ] T043 [US4] Implement Server Actions in `src/modules/teams-matches/actions/attendance.actions.ts` (`recordPitchSideAttendanceAction`, `lockAttendanceSessionAction`, `exportFolkeoplysningCsvAction`)
- [ ] T044 [P] [US4] Build mobile-first pitch-side attendance checklist in `src/components/events/pitchside-attendance-list.tsx` optimized for <30 seconds completion on a 360px screen with >=44px touch targets
- [ ] T045 [US4] Build pitch-side attendance route in `src/app/(dashboard)/events/[id]/attendance/page.tsx`
- [ ] T046 [US4] Build Danish Folkeoplysning municipal reporting page in `src/app/(dashboard)/admin/reports/attendance/page.tsx`
- [ ] T047 Update GDPR Article 17 erasure service in `src/modules/auth-rbac/services/gdpr-deletion.service.ts` to preserve statistical match selections and attendance records on `"Former Member #..."` while scrubbing personal transport notes and attendance notes
- [ ] T048 Update GDPR Article 20 export service in `src/modules/auth-rbac/services/gdpr-export.service.ts` to include squad memberships, event RSVPs, match selections, and historical attendance records
- [ ] T049 [P] Implement unit tests in `tests/unit/teams-matches/teams-gdpr-guard.test.ts` verifying personal transport note scrubbing and appearance count retention during account erasure
- [ ] T050 Execute full verification gate across the entire application (`npx tsc --noEmit`, `npm run test:unit`, and `npm run build`)

**Checkpoint**: Fast pitch-side attendance operational (<30s on 360px); Folkeoplysning municipal CSV export runs in 1-click; GDPR Article 17/20 compliance verified; full application builds cleanly.

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup)**: Can start immediately (creates database schema and seed data).
- **Phase 2 (Domain Logic)**: Depends on Phase 1 (blocking prerequisite for all user stories).
- **Phase 3 (User Story 1 - P1)**: Depends on Phase 2 (delivers core squads, rosters & MVP).
- **Phase 4 (User Story 2 - P2)**: Depends on Phase 3 (delivers events and facility booking).
- **Phase 5 (User Story 3 - P3)**: Depends on Phase 4 (delivers RSVPs, selection console & notifications).
- **Phase 6 (User Story 4 - P4 & Polish)**: Depends on Phase 5 (delivers attendance, municipal export & GDPR integrity).

### User Story Dependencies
- **User Story 1 (P1)**: Independent of other stories once Foundation is complete.
- **User Story 2 (P2)**: Requires squads from US1 to attach fixtures and training events.
- **User Story 3 (P3)**: Requires scheduled events from US2 and rosters from US1 to track availability and select lineups.
- **User Story 4 (P4)**: Requires published lineups/events from US3/US2 to run attendance and export Folkeoplysning records.

### Parallel Opportunities
- In Phase 1: T003 (Seed script) and T004 (npm script) can run in parallel.
- In Phase 2: Domain logic modules and tests (T005–T014) can be developed and verified concurrently across independent files.
- In Phase 3: Contract schemas (T015) and UI components (T018, T019, T020) can be built in parallel.
- In Phase 4: Facility service (T025) and calendar view (T028) can run in parallel.
- In Phase 5: RSVP status bar (T036) and Match Selection console (T037) can run in parallel.
- In Phase 6: Pitch-side checklist (T044) and GDPR export updates (T047, T048) can run in parallel.

---

## Implementation Strategy (MVP First)

1. **Phase 1 & Phase 2**: Migrate schema and verify pure domain rules with unit tests.
2. **Phase 3 (MVP)**: Deliver Teams, Age-Group Squads, and Roster management with automated age eligibility safeguards. **STOP & VALIDATE**.
3. **Phase 4**: Deliver Fixture & Training scheduling with facility conflict detection. **VALIDATE**.
4. **Phase 5**: Deliver 1-Tap Mobile RSVP, parental delegation, and Coach Match Selection with dual-parent notification. **VALIDATE**.
5. **Phase 6**: Deliver Pitch-Side Attendance checklist, Folkeoplysning CSV export, and GDPR Article 17/20 hooks. **FINAL VALIDATION**.
