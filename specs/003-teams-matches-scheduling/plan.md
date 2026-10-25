# Implementation Plan: Teams, Squads, Training & Match Scheduling

**Branch**: `003-teams-matches-scheduling` | **Date**: 2026-10-25 | **Spec**: [specs/003-teams-matches-scheduling/spec.md](file:///Users/shishirjain/p/s/roskilde-cricket-app/specs/003-teams-matches-scheduling/spec.md)

**Input**: Feature specification from `specs/003-teams-matches-scheduling/spec.md` adhering to Constitution v1.1.0, 5 clarified decisions, and integration with Module 1 (`001-user-auth-rbac`) and Module 2 (`002-inventory-equipment-management`).

---

## Summary

Module 3 provides comprehensive team, squad, fixture, and training session management for Roskilde Cricket Club. It enables administrators and coaches to organize senior, youth, and social squads with automated age-eligibility validation; schedule competitive matches and recurring training sessions with physical facility conflict detection (hard-blocking regular coaches while permitting audited admin overrides); collect 1-tap mobile RSVPs with explicit `NO_RESPONSE` seeding and cutoff deadline locks; publish configurable match squad selections (11-a-side for Senior League, 8–12 for Youth/Friendlies) with simultaneous dual-parent alerts; run pitch-side mobile attendance checklists (<30 seconds on a 360 px screen); generate Danish municipal (Folkeoplysning) CSV reports covering all club attendees; and preserve historical match appearances under GDPR Article 17 anonymization.

Pure domain logic (age-eligibility checking, facility interval overlap detection, RSVP deadline locks, configurable lineup validation, and municipal export formatting) is isolated into testable TypeScript modules (`src/modules/teams-matches/domain/`). Relational persistence uses PostgreSQL via Prisma, integrating seamlessly with Module 1's RBAC matrix, `NotificationService`, and `AuditLog`, plus Module 2's equipment checkout linkage and the App Launcher Grid navigation.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: Next.js 15+ (App Router), React 19, Tailwind CSS, shadcn/ui primitives, Prisma ORM, Zod, Lucide React  
**Storage**: PostgreSQL accessed exclusively through Prisma ORM with versioned migrations  
**Testing**: Vitest for unit & domain testing, `@testing-library/react` for UI components  
**Target Platform**: Full-stack Next.js web application deployed to Vercel and portable standalone Docker container (Coolify)  
**Project Type**: Web application (Next.js App Router modular monolith)  
**Performance Goals**: Pitch-side attendance checklist completed in <30 seconds on a 360 px mobile viewport; facility conflict check runs in <100 ms; 1-click Folkeoplysning CSV export generates in <2 seconds for up to 5,000 attendance records; initial page load <1.5s LCP on 4G  
**Constraints**: Zero overlapping pitch/net bookings permitted for regular coaches; admin collision overrides strictly require an audit reason; match scoring is out of scope (fixtures support optional external `scorecardUrl`); zero historical match appearance records lost during GDPR Article 17 account erasure; all notifications route through pluggable `NotificationService`  
**Scale/Scope**: ~10 club squads, ~500 registered members, ~200 seasonal fixtures/practices, 4 physical club facilities, 5 core user scenarios across 6 UI views  

---

## Constitution Check

*GATE: All principles and domain constraints must pass before proceeding to task generation.*

| Principle / Constraint | Status | Compliance Details |
|---|---|---|
| **I. Type-Safe Full-Stack Modular Architecture** | **PASS** | Organized strictly under `src/modules/teams-matches/` with pure domain rules separated from database/React. Database accessed exclusively through Prisma with migrations. Outbound notifications route through `NotificationService`. Module interactions occur via exported service interfaces. |
| **II. Security, RBAC & GDPR by Default** | **PASS** | Enforces the centralized RBAC permission matrix. Minor player selections and schedule updates trigger simultaneous dual-parent notifications. GDPR Article 17 anonymization converts member profiles into `"Former Member #..."` while retaining historical match appearance and attendance statistics, permanently scrubbing personal transport and attendance notes. |
| **III. Mobile-First Performance & Offline Resilience** | **PASS** | Mobile-responsive pitch-side attendance checklist optimized for 360 px viewport with >=44×44 px touch targets. Server Components used by default; client components minimized to interactive forms and attendance toggles. |
| **IV. Strict Type Safety & Pragmatic Domain Testing** | **PASS** | TypeScript strict mode enabled with zero `any` / `@ts-ignore`. High-value Vitest unit tests cover facility collision detection, youth age eligibility, configurable lineup sizing, RSVP deadline locks, and Folkeoplysning CSV exports. |
| **Domain Constraint: Relational Enforcement** | **PASS** | `TeamSquad`, `TeamCoachAssignment`, `TeamRosterMember`, `ClubFacility`, `ScheduledEvent`, `EventRsvp`, `MatchSelection`, `MatchSelectionPlayer`, and `EventAttendance` modeled as explicit relational tables with foreign keys and enums. |
| **Domain Constraint: Parent-Child Delegation** | **PASS** | Parents can submit RSVPs on behalf of linked youth players using the `HeaderProfileSwitcher` active delegation context. |
| **Domain Constraint: Contact Resolution** | **PASS** | Minor player notifications resolve via `resolveMemberContacts()` to notify linked parents simultaneously. |
| **Domain Constraint: Time Zone & Localisation** | **PASS** | UTC timestamps in database, formatted in Danish local time (`Europe/Copenhagen`). Municipal exports conform to Danish Folkeoplysning reporting requirements. |

---

## Project Structure

### Documentation (`specs/003-teams-matches-scheduling/`)

```text
specs/003-teams-matches-scheduling/
├── spec.md              # Feature specification with 5 clarified resolutions
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0: Technical research and architectural resolutions
├── data-model.md        # Phase 1: Prisma models, enums, relations, and indexes
├── contracts/           # Phase 1: Server action schemas, types, and contracts
│   └── teams-scheduling-actions.contract.md
├── quickstart.md        # Phase 1: Testing and developer quickstart guide
└── checklists/
    └── requirements.md  # Spec quality checklist (16/16 passing)
```

### Source Code (`src/`)

```text
src/
├── app/
│   ├── (dashboard)/
│   │   ├── teams/
│   │   │   ├── page.tsx                    # Squad directory & team cards (All Members)
│   │   │   ├── new/page.tsx                # Create new squad (Admin, Coach)
│   │   │   └── [id]/
│   │   │       ├── page.tsx                # Squad details, roster & staff (All Members)
│   │   │       └── roster/page.tsx         # Roster management & age validation (Admin, Coach)
│   │   ├── events/
│   │   │   ├── page.tsx                    # Master fixture & training calendar (All Members)
│   │   │   ├── new/page.tsx                # Schedule fixture/training with conflict detector (Admin, Coach)
│   │   │   └── [id]/
│   │   │       ├── page.tsx                # Event details, 1-tap RSVP & venue info (All Members)
│   │   │       ├── selection/page.tsx      # Match-day squad selection console (Coach, Captain)
│   │   │       └── attendance/page.tsx     # Pitch-side attendance checklist (Admin, Coach, Ad-Hoc Coach)
│   │   └── admin/
│   │       ├── facilities/page.tsx         # Club facilities & booking calendar (Admin)
│   │       └── reports/
│   │           └── attendance/page.tsx     # Folkeoplysning municipal CSV report generator (Admin, Coach)
├── components/
│   ├── teams/
│   │   ├── squad-card.tsx                  # Squad category badge, captain & member count
│   │   ├── squad-roster-table.tsx          # Filterable roster by age, role, batting/bowling style
│   │   └── add-roster-member-dialog.tsx    # Member picker with automated age eligibility checks
│   ├── events/
│   │   ├── event-calendar-view.tsx         # Monthly/weekly fixture & practice calendar
│   │   ├── event-form.tsx                  # Scheduling form with live facility collision alerts
│   │   ├── rsvp-status-bar.tsx             # 1-tap mobile RSVP bar (Available, Unavailable, Maybe)
│   │   ├── match-selection-console.tsx     # Lineup drag/click builder with tactical role assigner
│   │   └── pitchside-attendance-list.tsx   # Fast touch checklist (<30s on 360px viewport)
│   └── navigation/
│       └── app-launcher-grid.tsx           # Updated with Teams, Matches, and Calendar shortcuts
└── modules/
    ├── auth-rbac/
    │   └── services/
    │       ├── gdpr-deletion.service.ts    # Extended to scrub RSVP/attendance notes
    │       └── gdpr-export.service.ts      # Extended to include squad memberships, RSVPs, attendance
    └── teams-matches/
        ├── domain/
        │   ├── age-eligibility.ts          # Age calculation, junior caps & playing-up rules
        │   ├── facility-conflicts.ts       # Interval collision detector & admin override
        │   ├── rsvp-evaluator.ts           # NO_RESPONSE seeding & cutoff deadline lock
        │   ├── lineup-validator.ts         # Configurable lineup sizing (11 vs 8-12) & roles
        │   ├── attendance-rules.ts         # Attendance status defaults & session locking
        │   └── folkeoplysning-export.ts    # Danish municipal CSV attendance generator
        ├── contracts/
        │   ├── squad.contract.ts
        │   ├── event.contract.ts
        │   ├── rsvp.contract.ts
        │   ├── selection.contract.ts
        │   └── attendance.contract.ts
        ├── services/
        │   ├── squad.service.ts
        │   ├── event.service.ts
        │   ├── facility.service.ts
        │   ├── rsvp.service.ts
        │   ├── selection.service.ts
        │   ├── attendance.service.ts
        │   └── folkeoplysning.service.ts
        └── actions/
            ├── squad.actions.ts
            ├── event.actions.ts
            ├── rsvp.actions.ts
            ├── selection.actions.ts
            └── attendance.actions.ts
```

---

## Complexity Tracking

*No constitution violations. All features adhere strictly to modular architecture, type safety, relational integrity, and GDPR requirements.*
