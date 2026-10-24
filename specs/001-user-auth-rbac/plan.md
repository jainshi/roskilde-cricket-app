# Implementation Plan: Phase 1 (Auth, RBAC & Member Profiles)

**Branch**: `001-user-auth-rbac` | **Date**: 2026-10-25 | **Spec**: [specs/001-user-auth-rbac/spec.md](file:///Users/shishirjain/p/s/roskilde-cricket-app/specs/001-user-auth-rbac/spec.md)

**Input**: Feature specification from `/specs/001-user-auth-rbac/spec.md`

---

## Summary

Deliver Phase 1 (Module 1) of the Roskilde Cricket Club (RCC) web application, establishing the foundational authentication, compound Role-Based Access Control (RBAC), decoupled member profile and user credential architectures, database-enforced parent-child relationships (max 2 parents per child), header profile switcher, privacy-respecting member directory, GDPR workflows, and a pluggable notification dispatch system.

---

## Technical Context

**Language/Version**: TypeScript 5.x (Strict mode: `"strict": true`, `"noImplicitAny": true`)  
**Primary Dependencies**: Next.js 15+ (App Router), React 19, Tailwind CSS, shadcn/ui, Prisma ORM, Zod, argon2, nodemailer  
**Storage**: PostgreSQL (hosted on Neon/Supabase or local/Coolify Docker container)  
**Testing**: Vitest for fast, focused unit testing of pure domain logic (RBAC, parent delegation, contact resolution)  
**Target Platform**: Responsive Web Application (optimized for mobile 360px+ pitch-side operation)  
**Project Type**: Full-stack Next.js Web Application  
**Performance Goals**: Initial page load < 1.5s (LCP) on standard 4G networks; directory search < 1s for 500 members  
**Constraints**: Zero client bundle bloat (<200KB initial JS); offline-ready architecture; portable hosting (no proprietary serverless locking)  
**Scale/Scope**: ~500 club members, ~300 active parent/player accounts  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post-design.*

- **Principle I: Type-Safe Full-Stack Modular Architecture**:
  - Full-stack TypeScript with Next.js (App Router), Tailwind CSS, shadcn/ui. [PASS]
  - PostgreSQL with Prisma ORM; all migrations versioned. [PASS]
  - Modular organization under `src/modules/auth-rbac/`. [PASS]
  - Pluggable `NotificationService` interface decoupling email providers. [PASS]
  - Hosting-agnostic design (compatible with Vercel and Docker standalone). [PASS]
- **Principle II: Security, RBAC & GDPR by Default (NON-NEGOTIABLE)**:
  - 5 roles supported, compound role union, central typed permission matrix. [PASS]
  - Decoupled `MemberProfile` and `UserAccount`; youth under 13 have no credentials; youth 13+ optional login with `PLAYER` role only. [PASS]
  - Server-side authorization guards on all Server Actions and Route Handlers. [PASS]
  - Database-enforced 2-parent cap via composite unique indexes. [PASS]
  - CSPRNG temporary passwords (6–8 alphanumeric), argon2id hashing, mandatory first-login password reset gate. [PASS]
  - Minor contact details hidden by default; GDPR explicit consent and anonymization workflows. [PASS]
- **Principle III: Mobile-First Performance & Offline Resilience**:
  - Touch targets >= 44x44px; pitch-side one-handed header profile switching. [PASS]
  - Server Components default with minimal client JS (<200KB). [PASS]
- **Principle IV: Strict Type Safety & Pragmatic Domain Testing**:
  - `tsconfig.json` strict mode. [PASS]
  - Focused, high-level unit tests for RBAC matrix, parent delegation, and contact fallback. [PASS]
- **Domain Integrity Constraints**:
  - Relational tables with foreign keys and unique constraints. [PASS]
  - English default with i18n dictionary architecture ready for Danish. [PASS]

---

## Project Structure

### Documentation (this feature)

```text
specs/001-user-auth-rbac/
├── plan.md              # Implementation plan
├── research.md          # Technical research & architectural decisions
├── data-model.md        # Relational database schema & entity definitions
├── quickstart.md        # Step-by-step test and verification guide
├── contracts/           # TypeScript interface contracts & Zod schemas
│   ├── rbac-permissions.contract.ts
│   ├── notifications.contract.ts
│   └── schemas.contract.ts
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code Architecture (Target Workspace)

```text
src/
├── app/                                 # Next.js App Router routes
│   ├── (auth)/                          # Authentication route group
│   │   ├── signin/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (dashboard)/                     # Authenticated application shell
│   │   ├── layout.tsx                   # Layout containing Header & ProfileSwitcher
│   │   ├── dashboard/page.tsx
│   │   ├── directory/page.tsx           # Member directory
│   │   ├── profile/[id]/page.tsx        # Profile view / edit
│   │   └── admin/                       # Admin-only management routes
│   │       ├── members/page.tsx
│   │       └── members/new/page.tsx
│   └── api/                             # Minimal route handlers (auth endpoints/exports)
├── components/                          # Shared UI components
│   ├── ui/                              # shadcn/ui primitives (button, dialog, input, etc.)
│   ├── header.tsx                       # Pitch-side responsive header
│   └── profile-switcher.tsx             # Parent-child context switcher
├── modules/                             # Domain modular architecture
│   └── auth-rbac/                       # Module 1: Auth & RBAC
│       ├── domain/                      # Pure business logic (framework-agnostic)
│       │   ├── permissions.ts           # Central permission matrix & hasPermission()
│       │   ├── contact-resolver.ts      # Player -> Parent fallback logic
│       │   └── age-rules.ts             # Minor & 13+ youth credential guard logic
│       ├── services/                    # Application services & database operations
│       │   ├── auth.service.ts          # Sessions, credentials, password reset
│       │   └── member.service.ts        # Member profiles, parent-child links, directory
│       └── notifications/               # Pluggable notification adapter
│           ├── notification.interface.ts
│           ├── console.adapter.ts
│           └── smtp.adapter.ts
├── i18n/                                # Localization dictionaries
│   ├── dictionaries/
│   │   ├── en.json                      # Default English dictionary
│   │   └── da.json                      # Danish translations
│   └── get-dictionary.ts
├── lib/                                 # Shared utilities
│   ├── db.ts                            # Prisma client singleton
│   └── password.ts                      # Argon2 hashing & CSPRNG generator
└── middleware.ts                        # Next.js edge guard (session & mustResetPassword)

prisma/
└── schema.prisma                        # Prisma relational models & migrations

tests/
└── unit/                                # Focused unit test suite (Vitest)
    ├── permissions.test.ts              # RBAC matrix & compound role union tests
    ├── parent-child-delegation.test.ts  # Link cap & delegation scoping tests
    └── contact-resolver.test.ts         # Dual-parent fallback routing tests
```

---

## Complexity Tracking

> *No constitutional violations. All architecture directly adheres to Constitution v1.1.0.*
