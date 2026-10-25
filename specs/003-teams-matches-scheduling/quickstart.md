# Developer Quickstart: Teams, Squads, Training & Match Scheduling

**Feature Branch**: `003-teams-matches-scheduling`  
**Date**: 2026-10-25  
**Module**: Module 3 (`src/modules/teams-matches/`)

---

## 1. Prerequisites & Database Migration

Ensure your local PostgreSQL database is running and environment variables are configured:

```bash
# 1. Verify environment configuration
cat .env | grep -E "DATABASE_URL|DIRECT_URL"

# 2. Run Prisma migration for Module 3 schema additions
npx prisma migrate dev --name add_teams_matches_scheduling_module

# 3. Regenerate Prisma client types
npx prisma generate
```

---

## 2. Running Unit & Domain Test Suites

Unit tests for Module 3 execute in Vitest without requiring a live database connection:

```bash
# Run all unit tests
npm run test:unit

# Run specifically the teams & scheduling domain tests
npx vitest run tests/unit/teams-matches/
```

### Key Domain Test Suites
1. `facility-conflicts.test.ts`:
   - Verifies overlapping time-slot calculation on the same facility resource.
   - Verifies hard-blocking for `COACH` and `AD_HOC_COACH` roles.
   - Verifies `ADMIN` override permitted when `collisionOverrideReason` is supplied.
2. `age-eligibility.test.ts`:
   - Verifies U13, U15, U17 age calculation based on competition cutoff date (Jan 1).
   - Verifies blocking overage players unless approved dispensation is flagged.
   - Verifies multi-squad "playing up" permissions for eligible minors in senior squads.
3. `lineup-validator.test.ts`:
   - Verifies configurable starting lineup sizing (strict 11 for Senior League, 8–12 for Youth and Friendlies).
   - Verifies unique assignment of Captain, Vice-Captain, and Wicketkeeper tactical roles.
   - Verifies rejection of duplicate player assignments.
4. `rsvp-evaluator.test.ts`:
   - Verifies explicit `NO_RESPONSE` seeding on event creation for all rostered members.
   - Verifies lock behavior when `now() >= rsvpDeadlineAt`.
   - Verifies parental delegation validation via `ParentChildLink`.
5. `folkeoplysning-export.test.ts`:
   - Verifies CSV generation covering all attending club members regardless of age.
   - Verifies correct header names, date formatting, and age calculation at session date.
6. `teams-gdpr-guard.test.ts`:
   - Verifies that GDPR Article 17 anonymization scrubs personal transport and attendance notes while preserving historical match selections and appearance tallies on the `"Former Member #..."` statistical shell.

---

## 3. Seeding Sample Teams, Facilities & Fixtures

Seed sample teams, physical facilities, upcoming fixtures, and recurring training sessions:

```bash
npx tsx scripts/seed-teams-matches.ts
```

### Seeded Entities Overview:
1. **Club Squads**:
   - `Roskilde 1st XI` (`SENIOR`, defaultLineup: 11)
   - `Roskilde 2nd XI` (`SENIOR`, defaultLineup: 11)
   - `Roskilde U15 Youth` (`YOUTH`, defaultLineup: 10, ageGroup: "U15")
   - `Roskilde U13 Youth` (`YOUTH`, defaultLineup: 8, ageGroup: "U13")
   - `Roskilde Social XI` (`SOCIAL`, defaultLineup: 11)
2. **Club Facilities**:
   - `Poppelgårdsvej Main Pitch` (`MAIN_PITCH`, outdoor grass wicket)
   - `Practice Nets 1-2` (`PRACTICE_NETS`)
   - `Practice Nets 3-4` (`PRACTICE_NETS`)
   - `Roskilde Hallen Indoor Arena` (`INDOOR_HALL`, winter facility)
3. **Scheduled Events & Matches**:
   - League Fixture: 1st XI vs. Svanholm CC (Poppelgårdsvej Main Pitch, Saturday 13:00)
   - Youth Match: U15 vs. Albertslund CC (Saturday 10:00, targetLineup: 10)
   - Training Sessions: Weekly Senior Net Practice (Tuesdays & Thursdays 18:00–20:00)

---

## 4. End-to-End Validation Scenarios

### Scenario A: Facility Collision Blocking & Admin Override
1. As a `COACH`, navigate to `/events/new`.
2. Schedule a friendly match on `Poppelgårdsvej Main Pitch` overlapping an existing 1st XI match.
3. Submit form -> Verify error banner: "Ground Collision Detected: Poppelgårdsvej Main Pitch is already booked by 1st XI." Creation is blocked.
4. Log in as `ADMIN`. Open the same form, check "Acknowledge Conflict & Override", enter reason "Double-header split wicket event", and submit -> Verify match is created with collision metadata recorded.

### Scenario B: 1-Tap Mobile RSVP & Parental Delegation
1. Log in as a Parent linked to an active youth player.
2. In the header profile switcher, switch active context to the child.
3. View upcoming U15 fixture -> Tap `AVAILABLE`, add transport note: "Can seat 2 extra players".
4. Verify RSVP immediately updates to `AVAILABLE` with parent attribution.

### Scenario C: Pitch-Side Attendance Checklist (<30s on Mobile Viewport)
1. Open browser DevTools in responsive mobile mode (360×740 px).
2. Navigate to `/events/[id]/attendance`.
3. Verify roster displays compact touch cards with pre-selected `PRESENT` pills for `AVAILABLE` players.
4. Tap `LATE` on one player, `NO_SHOW` on an absent player.
5. Tap "Lock Attendance" -> Verify completed session within 30 seconds.

### Scenario D: Danish Municipal (Folkeoplysning) CSV Export
1. As an `ADMIN`, navigate to `/admin/reports/attendance`.
2. Select Year: 2026 -> Click "Export Folkeoplysning Report".
3. Verify browser downloads a valid UTF-8 CSV containing all attendees, dates, ages, and attendance statuses.
