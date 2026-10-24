# Quickstart & Verification Guide: Phase 1 (Auth, RBAC & Member Profiles)

**Feature**: `specs/001-user-auth-rbac`  
**Date**: 2026-10-25

---

## 1. Prerequisites & Environment Setup

- Node.js >= 20.x, npm >= 10.x
- Local PostgreSQL instance or connection string (e.g. Neon, Supabase, or local Docker container)

### Environment Configuration (`.env`)
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/roskilde_cricket?schema=public"
SESSION_SECRET="super-secret-at-least-32-chars-long"
NOTIFICATION_PROVIDER="console" # Options: console, smtp
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 2. Setup Commands

```bash
# 1. Install dependencies
npm install

# 2. Run Prisma migrations
npx prisma migrate dev --name init_phase1_auth_rbac

# 3. Seed initial Super Admin account (optional helper)
npm run db:seed
```

---

## 3. Automated Verification Tests

Execute focused, high-level unit tests covering core domain rules (Constitution Principle IV):

```bash
# Run Vitest unit tests for RBAC, state transitions, and fallback logic
npm run test:unit
```

### Key Scenarios Covered by Unit Tests
1. **RBAC Matrix Verification**:
   - Single and compound role evaluation (e.g., `PARENT` + `AD_HOC_COACH`).
   - Resource scoping: Parents can only act on linked children, not arbitrary youth.
   - Admin restriction: Inability to remove the last active Admin account.
2. **Parent-Child Linkage Constraints**:
   - Adding 1st and 2nd parent succeeds.
   - Adding a 3rd parent link triggers database & domain rejection.
3. **Contact Fallback Resolution**:
   - Player with personal email -> returns player email.
   - Youth player with no email + 2 linked parents -> returns both parents' emails simultaneously.
4. **Youth Login Guard**:
   - Profile age < 13 -> cannot create `UserAccount`.
   - Profile age 13–17 -> can create `UserAccount`, but only `PLAYER` role allowed.

---

## 4. End-to-End User Journey Walkthrough

1. **Admin Onboarding**:
   - Sign in as `admin@roskildecricket.dk`.
   - Navigate to `/admin/members/new`. Create a member profile with `grantLoginAccess = true`.
   - Terminal logs generated temporary invitation link and 6–8 char temporary password.
2. **First Login & Mandatory Reset Guard**:
   - Open browser in Incognito. Navigate to `/auth/signin`.
   - Sign in using temporary credentials.
   - Attempt to navigate to `/dashboard` or `/directory` -> Middleware forcibly redirects to `/auth/reset-password`.
   - Submit new compliant password (>= 8 chars, mixed case, number, symbol) -> Redirected to GDPR consent modal.
   - Accept privacy policy -> Lands on Member Dashboard.
3. **Parent Context Switcher**:
   - Sign in as a Parent linked to two youth cricketers.
   - Open header profile switcher (mobile/desktop).
   - Switch context to Child A -> Header visibly indicates acting on behalf of Child A.
   - Update kit sizes for Child A -> Changes saved to Child A's profile with Parent logged as actor.
4. **Directory Privacy Verification**:
   - View Member Directory as a regular Player.
   - Verify youth contact details and adults with hidden settings are omitted from the response.
