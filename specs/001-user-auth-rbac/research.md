# Research: Phase 1 (Auth, RBAC & Member Profiles)

**Date**: 2026-10-25  
**Feature**: `specs/001-user-auth-rbac`

---

## 1. Authentication & Session Strategy

### Decision
Implement session-based authentication backed by a database session table (`Session` model linked to `UserAccount`) using secure, `HttpOnly`, `SameSite=Lax`, `Secure` cookies with sliding session expiry.

### Rationale
- **Concurrent Device Sessions (FR-021)**: Requirements mandate allowing simultaneous logins (e.g. smartphone + laptop) while supporting an immediate, explicit "Sign out everywhere" action, as well as immediate session invalidation on password reset or admin deactivation. Database-backed session tokens make immediate revocation instantaneous across all devices without relying on stale JWT claims or complex Redis blacklist infrastructure.
- **Mandatory First-Time Reset Guard (FR-017)**: Session records include or directly relate to `UserAccount.mustResetPassword`. Next.js Middleware and Server Actions can easily verify this flag and restrict route access strictly to `/auth/reset-password` and `/api/auth/signout`.
- **Hosting Portability**: Requires zero proprietary services (no Vercel KV or third-party redis cluster needed), functioning identically on Vercel + Neon or Docker + Coolify + local PostgreSQL.

### Alternatives Considered
- **Stateless JWTs in Cookies**: Simpler without DB read on every request, but instant revocation of all active devices or immediate lockout on admin deactivation requires either an external blacklist (cache) or short expiry with refresh token rotation. Given club scale (~500 members), database-backed session lookups with Prisma connection pooling take <2ms and provide guaranteed immediate revocation.
- **NextAuth.js v5 (Auth.js)**: While versatile, custom Prisma session handling with Next.js App Router middleware gives 100% type-safe control over compound role guards, immediate multi-device revocation, first-login reset redirect loops, and parent profile-switching without third-party adapter idiosyncrasies.

---

## 2. Password Hashing & Temporary Credential Generation

### Decision
- **Hashing**: Use `argon2id` (via `argon2` npm package) for adaptive, memory-hard password hashing.
- **Temporary Password Generation**: Use Node.js `crypto.randomInt` / `crypto.randomBytes` generating 6–8 alphanumeric characters from an unambiguous charset (excluding `0`, `O`, `l`, `I`, `1` to prevent human transcription errors when receiving via email).
- **Temporary Credential Security**: Stored hashed like normal passwords; marked with `mustResetPassword = true` and `temporaryPasswordExpiresAt = now + 7 days`.

### Rationale
- Argon2id is the OWASP recommended winner of the Password Hashing Competition, superior against GPU/ASIC cracking.
- Constitution Principle II explicitly specifies CSPRNG generation, adaptive hashing (argon2id), and strictly preventing plain-text storage or log leakage.

### Alternatives Considered
- **bcrypt**: Reliable and widely supported, but argon2id provides better resistance to modern side-channel and memory-hard GPU attacks.

---

## 3. Pluggable NotificationService Architecture

### Decision
Establish a clean interface `NotificationService` in `src/modules/communications/` (or `src/modules/auth-rbac/notifications/` during Phase 1):

```typescript
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface NotificationService {
  sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;
}
```

Implement two concrete adapters:
1. `ConsoleNotificationAdapter`: Logs emails to console/stdout formatted with clear subject and content blocks (default in `NODE_ENV=development` and test environments).
2. `SmtpNotificationAdapter`: Standard `nodemailer` transport using environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`). Future adapters (Resend, SendGrid) implement the identical interface without altering business logic.

### Rationale
- Fully satisfies Constitution Principle I (Notification adapter pattern and hosting portability).
- Prevents hard-locking to third-party proprietary email APIs. Allows development without external SMTP credentials.

---

## 4. Internationalization (i18n) Dictionary Architecture

### Decision
Use a lightweight, type-safe compile-time dictionary pattern rather than heavyweight client-side runtime frameworks:
- Locale files: `src/i18n/dictionaries/en.json` (default) and `src/i18n/dictionaries/da.json`.
- Server-side helper `getDictionary(locale: 'en' | 'da')` with TypeScript `type Dictionary = typeof en`.
- Default locale stored in session/cookie or header (`Accept-Language`), defaulting strictly to `en`.

### Rationale
- Constitution Principle I & Domain Integrity: English default, no hardcoded strings in core UI views, and prepared for Danish.
- Server Components render zero extra client-side translation runtime JS, maintaining the <200 KB route JS budget and sub-1.5s mobile initial load.

---

## 5. Parent-Child & Youth Credential Architecture

### Decision
- **Decoupled Tables**:
  - `MemberProfile`: The core club identity (name, dateOfBirth, contact details, cricket attributes, kit sizes, privacy toggles).
  - `UserAccount`: Optional credentials (email, passwordHash, mustResetPassword, status). A `MemberProfile` has 0 or 1 `UserAccount`.
- **Youth Constraints**:
  - Profiles with `dateOfBirth` indicating age < 13 CANNOT have a `UserAccount` record created.
  - Profiles with age 13–17 can optionally have a `UserAccount`, but role assignments are strictly restricted to `PLAYER`.
- **Max-2 Parent Cap**:
  - Model `ParentChildLink` has a `slot` integer field (values: 1 or 2).
  - Unique composite index on `(playerId, slot)` and unique constraint on `(playerId, parentId)`.
  - Database schema physically prevents more than 2 parents from being linked to any youth.
- **Simultaneous Notification Routing**:
  - Pure function `resolveMemberContact(profileId)` resolves email/phone:
    - If profile has email/phone, returns it.
    - If empty and youth, queries `ParentChildLink` -> returns array of all linked parent contacts.
    - `NotificationService` sends to all resolved recipient addresses concurrently.

### Rationale
- Enforces user decisions from Specification and Clarification sessions directly in the relational schema and domain layer.
