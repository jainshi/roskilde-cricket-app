# Implementation Plan: Club Inventory & Equipment Management

**Branch**: `002-inventory-equipment-management` | **Date**: 2026-10-25 | **Spec**: [specs/002-inventory-equipment-management/spec.md](file:///Users/shishirjain/p/s/roskilde-cricket-app/specs/002-inventory-equipment-management/spec.md)

**Input**: Feature specification from `specs/002-inventory-equipment-management/spec.md` adhering to Constitution v1.1.0, 5 clarification resolutions, and integration with Module 1 (`001-user-auth-rbac`).

---

## Summary

Module 2 provides comprehensive club inventory tracking, pitch-side equipment check-out/check-in, bulk consumable stock accounting, personal borrowing dashboards ("My Gear") with parent delegation, extension request workflows, damage reporting, automated overdue reminder escalation with a 24-hour notification cooldown, and cross-module GDPR erasure safeguards. 

Pure domain logic (state machine transitions, stock math, category return deadline calculators, and overdue cooldowns) is isolated into testable TypeScript modules (`src/modules/inventory/domain/`). Relational persistence uses PostgreSQL via Prisma, integrating seamlessly with Module 1's RBAC matrix, `NotificationService`, and `AuditLog`.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: Next.js 14+ (App Router), React 18, Tailwind CSS, shadcn/ui primitives, Prisma ORM, Zod, Lucide React  
**Storage**: PostgreSQL accessed exclusively through Prisma ORM with versioned migrations  
**Testing**: Vitest for unit & domain testing, `@testing-library/react` for UI components  
**Target Platform**: Full-stack Next.js web application deployed to Vercel and portable standalone Docker container (Coolify)  
**Project Type**: Web application (Next.js App Router modular monolith)  
**Performance Goals**: Pitch-side equipment check-out/check-in completable in <30 seconds on a 360 px mobile viewport; catalog search and filter queries execute in <500 ms for up to 2,000 items; initial page load <1.5s LCP on 4G  
**Constraints**: Zero unreturned club assets lost during GDPR account erasure; at most 1 active loan per serialized asset enforced at the database level; all monetary values stored in integer minor units (øre) and formatted in DKK; outbound notifications route through pluggable `NotificationService`  
**Scale/Scope**: ~2,000 inventory items, ~500 registered club members, 5 core inventory user stories across 6 UI views  

---

## Constitution Check

*GATE: All principles and domain constraints must pass before proceeding to task generation.*

| Principle / Constraint | Status | Compliance Details |
|---|---|---|
| **I. Type-Safe Full-Stack Modular Architecture** | **PASS** | Organized strictly under `src/modules/inventory/` with pure domain rules separated from database/React. Database accessed exclusively through Prisma with migrations. Outbound notifications route through `NotificationService`. Scheduled overdue runner exposed as a portable HTTP endpoint `/api/inventory/cron/overdue`. |
| **II. Security, RBAC & GDPR by Default** | **PASS** | Enforces the SRS §2 permission matrix via central authorization. Checks out to minor players automatically bind to linked parents (max 2). GDPR Article 17 erasure is strictly blocked if active/overdue loans exist, while retaining historical loan logs against the anonymized shell record (`"Former Member #..."`). Immutable audit records generated for all state mutations. |
| **III. Mobile-First Performance & Offline Resilience** | **PASS** | Mobile-responsive pitch-side UI designed for 360 px viewport with >=44×44 px touch targets. Server Components used by default; client components minimized to interactive checkout/checkin forms. |
| **IV. Strict Type Safety & Pragmatic Domain Testing** | **PASS** | TypeScript strict mode enabled with zero `any` / `@ts-ignore`. High-value Vitest unit tests cover state transitions, bulk stock math, return deadlines, overdue cooldowns, and GDPR erasure blocking. |
| **Domain Constraint: Relational Enforcement** | **PASS** | `EquipmentItem`, `EquipmentLoan`, `StockTransaction`, `EquipmentLoanExtension`, and `EquipmentDamageReport` modeled as explicit relational tables with foreign keys and enums. |
| **Domain Constraint: Parent-Child Delegation** | **PASS** | Parents can inspect gear loaned to linked children and submit extension/damage reports on their behalf via the Header Profile Switcher. |
| **Domain Constraint: Contact Resolution** | **PASS** | Minor borrower notifications resolve via `resolveMemberContacts()` to notify linked parents simultaneously. |
| **Domain Constraint: Inventory State Machine** | **PASS** | `AVAILABLE`, `ON_LOAN`, `UNDER_MAINTENANCE`, `RETIRED` database enum. Checkout only from `AVAILABLE`, return only from `ON_LOAN`, `RETIRED` is terminal. Mutations run inside Prisma `$transaction`. |
| **Domain Constraint: Currency in Minor Units** | **PASS** | Equipment purchase price stored in integer minor units (`øre`) and formatted as `DKK`. Direct billing deferred to the future finance module. |
| **Domain Constraint: Time Zone & Localisation** | **PASS** | UTC timestamps in database, displayed in `Europe/Copenhagen`. Locale strings stored in dictionary. |

---

## Project Structure

### Documentation (`specs/002-inventory-equipment-management/`)

```text
specs/002-inventory-equipment-management/
├── spec.md              # Feature specification with 5 clarified resolutions
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0: Technical research and architectural resolutions
├── data-model.md        # Phase 1: Prisma models, enums, relations, and indexes
├── contracts/           # Phase 1: Server action schemas, types, and cron contract
│   └── inventory-actions.contract.md
├── quickstart.md        # Phase 1: Testing and developer quickstart guide
└── checklists/
    └── requirements.md  # Spec quality checklist (16/16 passing)
```

### Source Code (`src/`)

```text
src/
├── app/
│   ├── (dashboard)/
│   │   ├── inventory/
│   │   │   ├── page.tsx                    # Equipment master catalog & search (Admin, Coach)
│   │   │   ├── new/page.tsx                # Add serialized/bulk asset (Admin)
│   │   │   ├── [id]/page.tsx               # Asset details, history & edit (Admin, Coach)
│   │   │   ├── checkout/page.tsx           # Mobile pitch-side checkout (Admin, Coach, Ad-Hoc Coach)
│   │   │   ├── checkin/page.tsx            # Mobile pitch-side check-in & condition routing
│   │   │   ├── extensions/page.tsx         # Extension request review queue (Admin, Coach)
│   │   │   └── damage/page.tsx             # Damage & loss incident queue (Admin)
│   │   └── profile/
│   │       └── gear/page.tsx               # "My Gear" personal & linked youth loans (All Members)
│   └── api/
│       └── inventory/
│           └── cron/
│               └── overdue/route.ts        # Secured overdue notification cron endpoint
├── components/
│   └── inventory/
│       ├── catalog-table.tsx               # Filterable catalog table with badge statuses
│       ├── pitchside-checkout-form.tsx     # Fast mobile checkout with predictive asset selector
│       ├── pitchside-checkin-form.tsx      # Return inspection & condition routing
│       ├── my-gear-card.tsx                # Active loans card with extension/damage triggers
│       ├── extension-review-modal.tsx      # 1-click extension approval/rejection modal
│       └── damage-report-dialog.tsx        # Incident reporting dialog
└── modules/
    ├── auth-rbac/
    │   └── services/
    │       └── gdpr-deletion.service.ts    # Extended with Module 2 active loan check
    └── inventory/
        ├── domain/
        │   ├── equipment-state-machine.ts   # Pure status transitions & validation
        │   ├── stock-math.ts               # Bulk loan vs. consumption math
        │   ├── return-deadline.ts          # Category-based default return calculator
        │   └── overdue-evaluator.ts        # Overdue logic & 24h notification cooldown guard
        ├── contracts/
        │   ├── catalog.contract.ts         # Zod schemas for asset CRUD
        │   ├── loan.contract.ts            # Zod schemas for checkout/checkin
        │   ├── stock.contract.ts           # Zod schemas for consumption & restocking
        │   ├── extension.contract.ts       # Zod schemas for loan extensions
        │   └── damage.contract.ts          # Zod schemas for damage reporting
        ├── services/
        │   ├── catalog.service.ts          # Catalog Prisma queries and filters
        │   ├── loan.service.ts             # Checkout/checkin transactions and locks
        │   ├── stock.service.ts            # Bulk consumption and stock ledger
        │   ├── extension.service.ts        # Extension submission and review
        │   ├── reminder.service.ts         # Overdue reminder dispatch & cooldown logic
        │   └── inventory-gdpr.service.ts   # GDPR active-loan guard for auth module
        └── actions/
            ├── catalog.actions.ts          # Server actions for catalog operations
            ├── loan.actions.ts             # Server actions for checkout/checkin
            ├── stock.actions.ts            # Server actions for consumption/restock
            ├── extension.actions.ts        # Server actions for loan extensions
            └── reminder.actions.ts         # Server actions for on-demand reminders
```

---

## Complexity Tracking

*No constitutional violations identified. Design adheres 100% to Constitution v1.1.0 without architectural exemptions.*
