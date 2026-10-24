<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0 (MINOR)
Bump rationale: Materially expanded guidance (identity/credential model, contact fallback,
localisation & currency, notification adapter, hosting portability). Principle IV testing scope
was relaxed, not redefined: any artifact compliant with 1.0.0 remains compliant with 1.1.0, so
the change is not backward-incompatible and does not warrant MAJOR.

Modified principles:
  - I. Type-Safe Full-Stack Modular Architecture — added pluggable NotificationService adapter
    and hosting-agnostic deployment rules.
  - II. Security, RBAC & GDPR by Default — added profile/credential decoupling, youth credential
    age rule (13+), max-2-parent delegation, and contact fallback privacy rules.
  - IV. Strict Type Safety & Tested Domain Logic → IV. Strict Type Safety & Pragmatic Domain
    Testing — replaced exhaustive test mandates with focused high-level tests.

Added sections / clauses:
  - Domain Integrity Constraints: Identity & credentials, Parent-child cap, Contact resolution,
    Localisation, Currency.
  - Development Workflow & Quality Gates: i18n and adapter checks in PR checklist.

Removed sections: none.

Templates / dependent artifacts:
  - .specify/templates/* — not modified (read constitution at runtime per Spec Kit scope guard).

Follow-up TODOs:
  - TODO(SRS_3_1_4): docs/Roskilde_Cricket_Club_App_Specification.md §3.1.4 describes a
    one-to-many Parent→Player linkage; it MUST be amended to reflect "up to 2 Parents per Player"
    and the under-13 managed-profile / 13+ credential model (Governance: SRS conflicts must be
    explicitly resolved).
-->

# Roskilde Cricket Club (RCC) Members-Only Web Application Constitution

## Core Principles

### I. Type-Safe Full-Stack Modular Architecture

- The application MUST be a single full-stack TypeScript codebase built on Next.js (App Router),
  styled with Tailwind CSS, and composed from shadcn/ui primitives. Introducing an alternative
  UI framework, CSS system, or component library requires a constitution amendment.
- Persistence MUST use PostgreSQL accessed exclusively through Prisma ORM. Raw SQL is permitted
  only for performance-critical aggregate queries (e.g., statistics), MUST be parameterised, and
  MUST be documented in the owning feature's plan.
- Source code MUST be organised into the five functional modules defined in the SRS:
  1. **Auth/RBAC** — authentication, onboarding, users, roles, parent-child links, directory, privacy.
  2. **Inventory** — equipment catalog, status state machine, checkout/return, "My Gear".
  3. **Events/Attendance** — official and ad-hoc events, invitations, RSVPs, check-in.
  4. **Team/Stats** — squads, lineups, fixtures, scorecards, statistics engine.
  5. **Communications** — noticeboard, urgent banners, notification engine.
- Each module owns its domain logic, validation schemas, Server Actions/Route Handlers, and UI.
  Modules MUST interact only through each other's explicitly exported service functions; importing
  another module's internal files is prohibited.
- Core domain logic (permission evaluation, state transitions, statistics calculations) MUST be
  implemented as pure, framework-agnostic TypeScript functions, separate from React components,
  Prisma calls, and route handlers.
- All external input (forms, Server Action arguments, route params, query strings, sync payloads)
  MUST be validated at the server boundary with a runtime schema validator before use.
- Schema changes MUST ship as versioned Prisma migrations; `prisma db push` MUST NOT be used
  against shared or production databases.
- **Pluggable notifications**: All outbound notifications (Email, In-App, SMS, Push) MUST be sent
  through a provider-agnostic `NotificationService` interface owned by the Communications module.
  Concrete provider adapters (e.g., SMTP, Resend, SendGrid, Web Push) MUST be selected via
  environment variables. Domain code MUST depend only on the interface and MUST NOT import
  provider SDKs directly. A no-op/console adapter SHOULD exist for local development and tests.
- **Hosting portability**: The application MUST remain deployable both to Vercel with a managed
  PostgreSQL (e.g., Neon, Supabase) and as a standalone Docker image (e.g., Coolify) using Next.js
  `output: "standalone"`. Consequently:
  - All configuration MUST come from environment variables; no host-specific config in code.
  - Vendor-proprietary platform services (e.g., Vercel KV, Edge Config, Vercel Cron) MUST NOT be
    required by core features; if used, they MUST sit behind an adapter with a portable fallback.
  - Scheduled jobs (e.g., equipment overdue warnings) MUST be exposed as secured, idempotent
    endpoints or scripts invocable by any scheduler.
  - Prisma configuration MUST support both pooled and direct connection URLs.

**Rationale**: A single typed stack with a relational store lets the database and compiler
enforce the club's integrity rules, while module boundaries keep the five phased deliverables
independently buildable, reviewable, and testable. Adapters for notifications and hosting keep a
volunteer-run club free to switch providers on cost grounds without rewriting domain code.

### II. Security, RBAC & GDPR by Default (NON-NEGOTIABLE)

- **Roles**: The system MUST support exactly five roles — Admin, Coach, Ad-Hoc Coach, Player,
  Parent. A member MAY hold multiple roles; effective permissions are the union of all held roles.
- **Profiles vs. credentials**: Member profiles (the person, their roles and cricket data) MUST be
  modelled separately from authentication credentials (login identity). A profile MAY exist
  without credentials; a credential MUST belong to exactly one profile.
- **Youth credentials**: Players under 13 MUST exist only as parent-managed profiles without
  login credentials. Players aged 13+ MAY be granted their own credentials, limited to Player
  role permissions; their Parent-Child links and parents' delegation rights remain active.
  Eligibility MUST be derived server-side from the stored date of birth.
- **Single permission source**: The SRS §2 permission matrix MUST be encoded in one centralised,
  typed permission map. Scattered ad-hoc checks such as `role === "COACH"` are prohibited; all
  checks MUST go through the central authorisation API.
- **Server-side enforcement**: Every Server Action, Route Handler, and server-side data loader
  MUST authenticate the session and authorise the action before reading or mutating data.
  Authorisation is deny-by-default. Hiding UI elements is a UX convenience, never a security
  control.
- **Resource scoping**: Permissions qualified as "Self" or "Linked Children" MUST be verified
  against the target resource's owner on every request, not only against the caller's role.
- **Parent-child delegation**: A Parent MAY act (RSVP, consent, equipment borrowing) only on behalf
  of youth profiles linked to them via a persisted parent-child record, verified server-side per
  request. A Player profile MAY be linked to at most 2 Parent accounts. Delegated actions MUST
  record both the acting user and the subject player.
- **Contact fallback privacy**: When a player's contact details are resolved via parent fallback
  (see Domain Integrity Constraints), the result MUST still respect the viewer's authorisation
  and the contact owner's privacy settings; fallback MUST NOT expose a parent's details to a
  viewer who could not otherwise see them.
- **Credential lifecycle**: Temporary passwords MUST be generated with a CSPRNG, stored only as
  hashes, and expire. Accounts created with temporary credentials MUST be flagged so that every
  route except password change and logout is blocked until the password is reset. Passwords MUST
  be hashed with an adaptive algorithm (argon2id or bcrypt) and meet SRS §3.1.3 complexity rules.
- **Youth protection**: Contact details (phone, email, address) of minors MUST be hidden from the
  member directory by default. Filtering MUST occur in the server query/serialisation layer so
  hidden fields never reach the client payload.
- **GDPR**: Explicit consent MUST be captured and stored with timestamp, consent version, and the
  consenting user (parent/guardian for minors). Members MUST have a self-service data export
  (machine-readable) and a deletion workflow that erases or irreversibly anonymises personal data;
  historical match records MAY be retained only in anonymised form.
- **Transport & secrets**: HTTPS is mandatory; session cookies MUST be `HttpOnly`, `Secure`, and
  `SameSite`. Secrets MUST never be exposed to client bundles. Personal data MUST NOT be written
  to application logs.
- **Audit trail**: Role changes, parent-child link changes, equipment transactions, consent
  changes, and data deletions MUST produce an immutable audit record.

**Rationale**: The platform holds personal data of children and families. A single authorisation
failure or leaked minor's contact detail is a safeguarding and legal incident, so these rules
override convenience and delivery speed.

### III. Mobile-First Performance & Offline Resilience

- UI MUST be designed for a 360 px-wide viewport first and progressively enhanced for desktop.
  Interactive targets MUST be at least 44×44 px. Pitch-side flows (attendance check-in, RSVP,
  equipment checkout/return) MUST be completable one-handed on a smartphone.
- Initial page load MUST complete in under 1.5 seconds (Largest Contentful Paint) on a standard
  4G mobile network profile, measured with Lighthouse mobile emulation on production builds.
- React Server Components are the default; `"use client"` MUST be limited to components that need
  interactivity. First-load JavaScript per route SHOULD remain under 200 KB gzipped; exceeding it
  requires justification in the feature plan.
- **Offline attendance**: The check-in roster for an event MUST be cacheable on the device before
  connectivity is lost. Check-ins recorded offline MUST be persisted locally (e.g., IndexedDB)
  with a client timestamp and idempotency key, queued, and automatically synchronised when
  connectivity returns. Server-side sync MUST be idempotent and re-run full authorisation.
  The UI MUST clearly indicate pending-sync and sync-failed states. Conflict resolution MUST be
  deterministic and documented in the attendance feature plan.
- Offline write support is scoped to attendance check-in; extending it to other features requires
  a constitution amendment.

**Rationale**: Coaches and parents operate the app at cricket grounds on phones with weak signal.
If check-in fails or the app is slow pitch-side, the attendance data it exists to capture is lost.

### IV. Strict Type Safety & Pragmatic Domain Testing

- `tsconfig.json` MUST enable `"strict": true` (including `noImplicitAny`). Explicit `any`,
  `@ts-ignore`, and non-null assertions on external data are prohibited unless accompanied by an
  inline justification comment; `@ts-expect-error` is preferred over `@ts-ignore`.
- Prisma-generated types and validated schema types MUST be the source of truth for data shapes;
  hand-duplicated model types are prohibited.
- Testing MUST be pragmatic and high-level. Focused unit tests are REQUIRED only for these core
  rules, covering representative allow/deny paths and key edge cases rather than every
  combination:
  - **RBAC authorisation**: representative allow/deny per role, compound-role union, and parent
    delegation (including denial for an unlinked child).
  - **Inventory state transitions**: the main checkout/return/maintenance/retire paths and the
    key forbidden transitions (e.g., checkout of a non-`AVAILABLE` item, any move out of
    `RETIRED`).
  - **Cricket statistics formulas**: batting average, strike rate, bowling average, economy, and
    overs/balls conversion, including the zero-denominator case.
- Deep, redundant, or implementation-coupled test suites (e.g., exhaustive matrix permutations,
  snapshot-heavy UI tests) SHOULD be avoided. Additional tests beyond the above are OPTIONAL and
  SHOULD be added only where a defect has occurred or risk is clearly elevated.
- Type-checking (`tsc --noEmit`), linting, and the unit test suite MUST pass before merge.

**Rationale**: Permissions, equipment accountability, and player statistics are where silent
errors cause real harm. Strict types catch most mistakes cheaply; a small, high-signal test suite
guards the critical rules without slowing a small team with maintenance-heavy tests.

## Domain Integrity Constraints

- **Relational enforcement**: Parent-child links, role assignments, equipment loans, RSVPs, and
  scorecard entries MUST be modelled as explicit relational records with foreign keys, enums, and
  unique constraints. Relationships MUST NOT be inferred from free text or JSON blobs.
- **Identity & credentials**: Member profile and credential MUST be separate tables with an
  optional one-to-one relation from profile to credential. Roles MUST attach to the profile.
- **Parent-child cap**: Parent-Child links are many-to-many with a hard limit of 2 Parents per
  Player, enforced both in domain validation and at the database level (e.g., a constrained
  slot column with a unique `(playerId, slot)` index, or a trigger). Duplicate links for the
  same parent-player pair MUST be rejected by a unique constraint.
- **Contact resolution**: A player's email and phone MUST be resolved through one central
  function: use the player's own value if present; otherwise fall back to the linked parent(s)'
  values. All notification dispatch and authorised directory/coach views MUST use this function.
  Fallback is resolved at read time; parent contact data MUST NOT be copied onto the player record.
- **Inventory state machine**: Status MUST be one of `AVAILABLE`, `ON_LOAN`, `UNDER_MAINTENANCE`,
  `RETIRED`, stored as a database enum. Allowed transitions MUST be defined in a single explicit
  transition table in code. Invariants:
  - Checkout is permitted only from `AVAILABLE`; return only from `ON_LOAN`.
  - An item MUST have at most one active loan, enforced by a database constraint.
  - `RETIRED` is terminal.
  - Each transition MUST run in a database transaction together with its loan/audit record.
- **Statistics derivation**: Aggregated statistics MUST be computed from raw scorecard entries and
  MUST NOT be hand-edited. Bowling volume MUST be stored as integer balls and displayed in overs
  notation (e.g., 22 balls → `3.4`). Undefined ratios (e.g., average with zero dismissals) MUST
  render as "—" rather than `0`, `Infinity`, or `NaN`.
- **Atomicity**: Any mutation touching more than one record (checkout, squad publication, sync
  batches) MUST execute inside a single database transaction.
- **Time**: Timestamps MUST be stored in UTC and displayed in the `Europe/Copenhagen` time zone.
- **Localisation**: The UI MUST default to English (`en`) and be architected for Danish (`da`)
  via an i18n dictionary pattern. User-facing strings in core views MUST come from locale
  dictionaries, not be hardcoded. Dates and numbers MUST be formatted with locale-aware
  formatters (`Intl`).
- **Currency**: Monetary values (e.g., equipment purchase price) MUST be stored as integer minor
  units (øre, preferred) or a fixed-precision decimal type; floating-point types MUST NOT be used.
  Amounts MUST be displayed formatted as Danish Kroner (`DKK`).

## Development Workflow & Quality Gates

- Features MUST follow the Spec Kit flow: specify → (clarify) → plan → tasks → implement. Each
  `plan.md` MUST contain a Constitution Check covering Principles I–IV and the Domain Integrity
  Constraints; violations MUST be listed with justification in its Complexity Tracking section.
- Feature sequencing SHOULD follow the SRS §5 roadmap (Foundation → Operations → Scheduling →
  Match Hub → Comms & Launch); later-phase features MUST NOT bypass Phase 1 RBAC primitives.
- Every pull request MUST:
  - State which roles and modules are affected and confirm server-side guards exist for each new
    or changed Server Action/Route Handler.
  - Include Prisma migrations for any schema change.
  - Add new user-facing strings to the locale dictionaries rather than hardcoding them.
  - Route any new outbound notification through `NotificationService`.
  - Pass CI gates: type-check, lint, unit tests, and production build.
- User-facing routes SHOULD be checked against the Principle III performance budget before
  release; pitch-side flows MUST be manually verified on a throttled mobile profile, including
  the offline check-in path.

## Governance

- This constitution supersedes all other engineering practices for the RCC application. The SRS
  (`docs/Roskilde_Cricket_Club_App_Specification.md`) remains the authority for functional
  requirements; where the two conflict, one MUST be explicitly amended — neither may be silently
  ignored.
- Amendments MUST be made via pull request modifying this file, include a Sync Impact Report, and
  be approved by the project maintainer before merge.
- Versioning follows semantic versioning:
  - **MAJOR**: removal or backward-incompatible redefinition of a principle or constraint.
  - **MINOR**: a new principle/section or materially expanded guidance.
  - **PATCH**: clarifications, wording, and non-semantic refinements.
- Compliance is reviewed at three points: the Constitution Check in every `plan.md`, every pull
  request review, and the `/speckit-analyze` consistency pass before implementation.
- Any added complexity or deviation MUST be justified in writing in the relevant plan; unjustified
  deviations are grounds for rejecting the change.

**Version**: 1.1.0 | **Ratified**: 2026-10-24 | **Last Amended**: 2026-10-24
