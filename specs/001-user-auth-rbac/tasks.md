# Tasks: Phase 1 (Auth, RBAC & Member Profiles)

**Input**: Feature design artifacts from `specs/001-user-auth-rbac/` (`spec.md`, `plan.md`, `data-model.md`, `contracts/`, `research.md`, `quickstart.md`).  
**Prerequisites**: Constitution v1.1.0 compliance.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, core runtime dependencies, styling, tooling, and database engine.

- [X] T001 Initialize Next.js 15+ App Router application with TypeScript (strict mode) and Tailwind CSS in repository root
- [X] T002 Install core runtime dependencies (`@prisma/client`, `zod`, `argon2`, `nodemailer`, `lucide-react`, `clsx`, `tailwind-merge`) and dev dependencies (`prisma`, `vitest`, `@types/nodemailer`, `@types/node`) in `package.json`
- [X] T003 [P] Configure TypeScript strict settings (`"strict": true`, `"noImplicitAny": true`) in `tsconfig.json`
- [X] T004 [P] Initialize shadcn/ui components architecture and add baseline UI primitives (button, input, label, card, dialog, dropdown-menu, select, checkbox) under `src/components/ui/`
- [X] T005 [P] Setup Vitest unit testing framework configuration in `vitest.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema, database client, notification adapter, i18n dictionaries, and session security middleware.

**⚠️ CRITICAL**: Must complete before any user story implementation can begin.

- [X] T006 Define complete Prisma relational schema (`MemberProfile`, `UserAccount`, `RoleAssignment`, `ParentChildLink`, `Session`, `EmergencyContact`, `PrivacySettings`, `ConsentRecord`, `AuditLog`, and Enums) with verbatim unique constraints in `prisma/schema.prisma`
- [X] T007 Initialize Prisma client singleton and database connection manager in `src/lib/db.ts`
- [X] T008 [P] Implement Argon2id password hashing and CSPRNG 6–8 alphanumeric temporary password generator in `src/lib/password.ts`
- [X] T009 [P] Implement pluggable `NotificationService` interface and `ConsoleNotificationAdapter` / `SmtpNotificationAdapter` in `src/modules/auth-rbac/notifications/notification.service.ts`
- [X] T010 [P] Implement i18n dictionary structure and helper with English (`src/i18n/dictionaries/en.json`) and Danish readiness (`src/i18n/dictionaries/da.json`) in `src/i18n/get-dictionary.ts`
- [X] T011 Implement database session management utilities (session creation, token resolution, sliding expiry, multi-device tracking) in `src/modules/auth-rbac/services/session.service.ts`
- [X] T012 Implement edge authentication and mandatory password reset middleware guard in `src/middleware.ts`

**Checkpoint**: Foundation ready — database, auth plumbing, notifications, and middleware guard active.

---

## Phase 3: User Story 1 - Admin onboards a member who activates their account (Priority: P1) 🎯 MVP

**Goal**: Admins can onboard members with optional login credentials (temporary password dispatched via notification); members can sign in, are forced to reset password, accept GDPR consent, and access the dashboard.

**Independent Test**: Create adult member with login access; verify temporary credentials email log; authenticate; verify forced redirect to password reset; submit valid password; accept GDPR privacy consent; verify dashboard arrival.

### Tests for User Story 1
- [X] T013 [P] [US1] Unit tests for password complexity validator and CSPRNG temporary password rules in `tests/unit/password-validation.test.ts`
- [X] T014 [P] [US1] Unit test for first-login reset gate and activation flow state transitions in `tests/unit/account-activation.test.ts`

### Implementation for User Story 1
- [X] T015 [P] [US1] Implement Zod schemas for member onboarding and password reset matching contracts in `src/modules/auth-rbac/contracts/schemas.ts`
- [X] T016 [US1] Implement member creation and credential provisioning service in `src/modules/auth-rbac/services/onboarding.service.ts`
- [X] T017 [US1] Implement user authentication, temporary credential verification, and account lockout after 5 failed attempts in `src/modules/auth-rbac/services/auth.service.ts`
- [X] T018 [US1] Create sign-in page UI (`/signin`) with username/password form and error handling in `src/app/(auth)/signin/page.tsx`
- [X] T019 [US1] Create mandatory password reset page UI (`/reset-password`) enforcing complexity rules in `src/app/(auth)/reset-password/page.tsx`
- [X] T020 [US1] Create GDPR consent modal / gate step and consent record persistence in `src/components/gdpr-consent-gate.tsx`
- [X] T021 [US1] Create Admin member onboarding form page (`/admin/members/new`) with credentials toggle in `src/app/(dashboard)/admin/members/new/page.tsx`
- [X] T022 [US1] Create baseline authenticated dashboard page in `src/app/(dashboard)/dashboard/page.tsx`

**Checkpoint**: User Story 1 is functional as a standalone MVP slice.

---

## Phase 4: User Story 2 - Members can only do what their roles allow (Priority: P1)

**Goal**: Strict server-side RBAC enforcement covering 5 roles (Admin, Coach, Ad-Hoc Coach, Player, Parent) with compound role union and server-side action guards.

**Independent Test**: Evaluate all roles against the SRS Section 2 permission matrix; verify compound roles union permissions; verify denied actions are rejected server-side even with forged requests; verify last admin cannot be deleted.

### Tests for User Story 2
- [X] T023 [P] [US2] Focused unit tests for pure RBAC evaluation function (`hasPermission`), compound role unions, and denial cases in `tests/unit/permissions.test.ts`
- [X] T024 [P] [US2] Unit test preventing last Admin role removal or account deactivation in `tests/unit/admin-safeguard.test.ts`

### Implementation for User Story 2
- [X] T025 [P] [US2] Implement pure `hasPermission(action, ctx)` function encoding the central permission matrix in `src/modules/auth-rbac/domain/permissions.ts`
- [X] T026 [US2] Implement server-side action authorization guard helper (`requirePermission`) in `src/modules/auth-rbac/services/auth-guard.ts`
- [X] T027 [US2] Implement role assignment and revocation service with minor role restriction (`PLAYER` only if age < 18) in `src/modules/auth-rbac/services/role.service.ts`
- [X] T028 [US2] Implement Admin role management UI in `src/app/(dashboard)/admin/members/[id]/roles/page.tsx`

**Checkpoint**: User Stories 1 and 2 work together; all mutations protected by server-side RBAC guards.

---

## Phase 5: User Story 3 - Parents are linked to youth players (Priority: P2)

**Goal**: Model parent-child relationships with a strict 2-parent limit per youth; decouple credentials so under-13 have no login while 13+ may optionally have limited Player logins; route notifications to both parents.

**Independent Test**: Link 1st and 2nd parent to youth; attempt linking 3rd parent and verify rejection; attempt credential grant to under-13 profile and verify rejection; grant credential to 14-year-old and verify Player-only role; resolve contact for player without email and verify simultaneous dual-parent delivery.

### Tests for User Story 5
- [X] T029 [P] [US3] Unit tests for `ParentChildLink` 2-parent limit and age-eligibility credential rules in `tests/unit/parent-child-rules.test.ts`
- [X] T030 [P] [US3] Unit tests for contact fallback resolution and dual-parent simultaneous notification routing in `tests/unit/contact-resolver.test.ts`

### Implementation for User Story 5
- [X] T031 [P] [US3] Implement pure contact resolver function (`resolveMemberContact`) supporting dual-parent fallback in `src/modules/auth-rbac/domain/contact-resolver.ts`
- [X] T032 [US3] Implement parent-child link management service enforcing max 2 parents per youth in `src/modules/auth-rbac/services/parent-child.service.ts`
- [X] T033 [US3] Implement youth login credential eligibility service enforcing age >= 13 rule in `src/modules/auth-rbac/services/youth-account.service.ts`
- [X] T034 [US3] Implement Admin parent-child linkage interface on member management page in `src/app/(dashboard)/admin/members/[id]/links/page.tsx`

**Checkpoint**: Parent-child links and youth credential decoupling fully operational.

---

## Phase 6: User Story 4 - Parents switch context to manage their children (Priority: P2)

**Goal**: Pitch-side header profile switcher allowing parents to seamlessly toggle active context between themselves and their linked youth on mobile and desktop without signing out.

**Independent Test**: Sign in as a parent linked to 2 youth; open header dropdown; switch to Child A; confirm child context indicator is active across all views; update kit size in Child A's context and verify audit log attributes parent as actor and child as subject.

### Tests for User Story 4
- [X] T035 [P] [US4] Unit test for delegated action context validation (parent acting on linked child vs unlinked youth) in `tests/unit/delegation-context.test.ts`

### Implementation for User Story 4
- [X] T036 [US4] Implement active context cookie/session resolver service (`getActiveContext`) in `src/modules/auth-rbac/services/context.service.ts`
- [X] T037 [US4] Create pitch-side responsive `Header` component with mobile-first viewport styling in `src/components/header.tsx`
- [X] T038 [US4] Create `ProfileSwitcher` dropdown component displaying parent and all linked youth in `src/components/profile-switcher.tsx`
- [X] T039 [US4] Integrate context banner into dashboard shell layout in `src/app/(dashboard)/layout.tsx`

**Checkpoint**: Parents can switch between themselves and linked youth in <= 2 clicks/taps pitch-side.

---

## Phase 7: User Story 5 - Members maintain profiles and browse a privacy-respecting directory (Priority: P2)

**Goal**: Full member profiles with cricket attributes (batting, bowling, secondary roles), kit sizes, emergency contacts, privacy toggles (hidden by default), and search/filter member directory.

**Independent Test**: Edit member cricket attributes and kit sizes; verify minor contact details hidden by default; verify directory search by name, role, batting/bowling style in < 1s; verify Coaches/Admins see full emergency details while Players see only privacy-permitted fields.

### Tests for User Story 5
- [X] T040 [P] [US5] Unit test for directory search filtering and field-level privacy masking (minors hidden, opt-in toggles) in `tests/unit/directory-privacy.test.ts`

### Implementation for User Story 5
- [X] T041 [P] [US5] Implement member profile data access service (cricket attributes, apparel sizes, emergency contacts) in `src/modules/auth-rbac/services/profile.service.ts`
- [X] T042 [US5] Implement privacy settings management service and server-side directory serialization filtering in `src/modules/auth-rbac/services/directory.service.ts`
- [X] T043 [US5] Create Profile View & Edit page (`/profile/[id]`) with cricket/kit attributes and privacy toggles in `src/app/(dashboard)/profile/[id]/page.tsx`
- [X] T044 [US5] Create Member Directory page (`/directory`) with search, role filters, and privacy-safe cards in `src/app/(dashboard)/directory/page.tsx`

**Checkpoint**: Complete profile management and privacy-respecting member directory functioning.

---

## Phase 8: User Story 6 - Members reset a forgotten password (Priority: P2)

**Goal**: Self-service tokenized password reset workflow with single-use expiring links, rate limiting, and multi-device session revocation ("Sign out everywhere").

**Independent Test**: Request password reset for existing email; verify generic success message; open emailed token link; reset password; verify old password rejected; verify "Sign out everywhere" terminates sessions across other devices.

### Tests for User Story 6
- [X] T045 [P] [US6] Unit test for password reset token lifecycle (single-use, 1-hour expiry, session invalidation) in `tests/unit/password-reset-lifecycle.test.ts`

### Implementation for User Story 6
- [X] T046 [US6] Implement tokenized password reset request and execution service with rate limiting in `src/modules/auth-rbac/services/password-reset.service.ts`
- [X] T047 [US6] Create Forgot Password request page (`/forgot-password`) with identical confirmation message in `src/app/(auth)/forgot-password/page.tsx`
- [X] T048 [US6] Create Password Reset token consumption page (`/reset-password/[token]`) in `src/app/(auth)/reset-password/[token]/page.tsx`
- [X] T049 [US6] Add "Sign out everywhere" action to profile/security settings revoking all active user sessions in `src/app/(dashboard)/profile/security/page.tsx`

**Checkpoint**: Self-service reset and multi-device revocation fully working.

---

## Phase 9: User Story 7 - Members exercise GDPR rights (Priority: P3)

**Goal**: Self-service GDPR machine-readable data export, deletion/anonymization requests, and Admin review/execution workflow preserving cricket match statistics integrity.

**Independent Test**: Request data export as member and verify generated JSON/CSV package; submit deletion request for member; approve as Admin; verify personal info purged immediately and member converted to anonymized shell ("Former Member #123") with credentials revoked.

### Tests for User Story 7
- [X] T050 [P] [US7] Unit test for GDPR data anonymization logic (purge personal data, retain stats shell, sever parent links) in `tests/unit/gdpr-anonymization.test.ts`

### Implementation for User Story 7
- [X] T051 [P] [US7] Implement GDPR data export generator assembling profile, roles, consent, and audit logs in `src/modules/auth-rbac/services/gdpr-export.service.ts`
- [X] T052 [US7] Implement GDPR account deletion and immediate anonymization service in `src/modules/auth-rbac/services/gdpr-deletion.service.ts`
- [X] T053 [US7] Create member GDPR privacy & export request UI in `src/app/(dashboard)/profile/privacy/page.tsx`
- [X] T054 [US7] Create Admin GDPR deletion requests review and execution dashboard in `src/app/(dashboard)/admin/gdpr/page.tsx`

**Checkpoint**: Full GDPR compliance workflows (export, consent, deletion/anonymization) operational.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Audit logging integration, mobile performance verification, quickstart validation, and seed script.

- [X] T055 [P] Implement centralized immutable `AuditLog` recording service in `src/modules/auth-rbac/services/audit.service.ts`
- [X] T056 [P] Create initial database seed script creating default Super Admin, test Coach, and test youth players in `prisma/seed.ts`
- [X] T057 [P] Run mobile performance check and verify initial route bundle sizes stay under 200KB JS budget
- [X] T058 Execute end-to-end walkthrough following `specs/001-user-auth-rbac/quickstart.md` and verify all scenarios pass

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) — BLOCKS all user stories.
- **User Stories (Phase 3+)**:
  - `US1 (P1)`: Depends on Phase 2 (Foundational). Delivers MVP!
  - `US2 (P1)`: Depends on Phase 2 and US1 authentication session context.
  - `US3 (P2)`: Depends on Phase 2 and US1/US2 member profile records.
  - `US4 (P2)`: Depends on US3 parent-child linkages.
  - `US5 (P2)`: Depends on US1/US2/US3 profiles.
  - `US6 (P2)`: Depends on US1 credentials and Phase 2 sessions.
  - `US7 (P3)`: Depends on US1, US3, US5 profile data.
- **Polish (Phase 10)**: Depends on all user stories being complete.

---

## Implementation Strategy (MVP First)

1. **Phase 1 + 2**: Establish Next.js App Router, Tailwind/shadcn, Prisma schema, session manager, and password utilities.
2. **Phase 3 (User Story 1)**: Deliver MVP onboarding, temporary password emails, mandatory reset, and baseline dashboard. **Validate MVP.**
3. **Phase 4 (User Story 2)**: Add pure RBAC permission matrix and server-side route/action guards.
4. **Phase 5 + 6 (User Stories 3 & 4)**: Implement 2-parent cap, youth credential rules, dual-parent notification routing, and header profile switcher.
5. **Phase 7, 8, 9**: Complete directory privacy, forgot password, and GDPR workflows.
6. **Phase 10**: Verify audit logging, seed script, and quickstart scenarios.
