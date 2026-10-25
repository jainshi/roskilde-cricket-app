# Server Actions & API Contracts: Teams, Squads, Training & Match Scheduling

**Feature Branch**: `003-teams-matches-scheduling`  
**Date**: 2026-10-25  
**Module**: `src/modules/teams-matches/`

---

## 1. Squad & Roster Management Contracts (`squad.contract.ts`)

### `createSquadAction`
- **Authorized Roles**: `ADMIN`, `COACH`
- **Input Schema**:
```typescript
export const createSquadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.enum(["SENIOR", "YOUTH", "SOCIAL"]),
  ageGroupRule: z.enum(["U13", "U15", "U17", "OPEN"]).default("OPEN"),
  defaultLineupSize: z.number().int().min(6).max(15).default(11),
  genderGroup: z.enum(["MENS", "WOMENS", "MIXED"]).default("MIXED"),
  description: z.string().trim().max(500).optional(),
});
```
- **Output**: `{ success: boolean; squad?: TeamSquad; error?: string }`

### `assignRosterMemberAction`
- **Authorized Roles**: `ADMIN`, `COACH`
- **Input Schema**:
```typescript
export const assignRosterMemberSchema = z.object({
  teamSquadId: z.string().uuid(),
  memberProfileId: z.string().uuid(),
  rosterRole: z.enum(["PLAYER", "CAPTAIN", "VICE_CAPTAIN"]).default("PLAYER"),
  jerseyNumber: z.number().int().min(1).max(99).optional(),
  hasDispensation: z.boolean().default(false),
  dispensationNotes: z.string().trim().max(500).optional(),
});
```
- **Output**: `{ success: boolean; membership?: TeamRosterMember; eligibilityStatus: "ELIGIBLE" | "PLAYING_UP"; error?: string }`
- **Domain Validation**: Rejects over-age players on junior squads unless `hasDispensation === true`.

---

## 2. Event Scheduling & Conflict Contracts (`event.contract.ts`)

### `createScheduledEventAction`
- **Authorized Roles**: `ADMIN`, `COACH`, `AD_HOC_COACH`
- **Input Schema**:
```typescript
export const createScheduledEventSchema = z.object({
  teamSquadId: z.string().uuid(),
  facilityId: z.string().uuid().optional(),
  eventType: z.enum(["MATCH", "TRAINING"]),
  matchType: z.enum(["LEAGUE", "FRIENDLY", "CUP", "TOURNAMENT"]).optional(),
  trainingType: z.enum(["NET_PRACTICE", "FIELDING_FITNESS", "INDOOR_WINTER", "OPEN_NETS"]).optional(),
  title: z.string().trim().min(3).max(150),
  date: z.string().datetime(),
  meetAt: z.string().datetime().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  isHome: z.boolean().default(true),
  opponentName: z.string().trim().max(100).optional(),
  venueName: z.string().trim().max(100).optional(),
  venueAddress: z.string().trim().max(250).optional(),
  rsvpDeadlineAt: z.string().datetime(),
  targetLineupSize: z.number().int().min(6).max(15).default(11), // 11 for Senior, 8-12 for Youth/Friendly
  scorecardUrl: z.string().url().max(300).optional(),
  linkedEquipmentLoanId: z.string().uuid().optional(), // Module 2 kit bag
  // Conflict Override (Admin only)
  collisionOverrideReason: z.string().trim().min(5).max(300).optional(),
});
```
- **Output**: 
```typescript
export type CreateEventResult = 
  | { success: true; event: ScheduledEvent; warning?: string }
  | { success: false; collisionDetected: true; conflictingEvent: ConflictingEventSummary; error: string }
  | { success: false; error: string };
```
- **Policy Enforcement**:
  - Regular Coach + collision = hard blocked (`collisionDetected: true`).
  - Admin + collision + `collisionOverrideReason` provided = permitted with collision metadata recorded.
- **Side Effect**: Seeds all active squad roster players with `EventRsvp(status: NO_RESPONSE)`.

---

## 3. 1-Tap RSVP & Delegation Contracts (`rsvp.contract.ts`)

### `submitEventRsvpAction`
- **Authorized Roles**: All Authenticated Members (Players and Parents with active delegation)
- **Input Schema**:
```typescript
export const submitEventRsvpSchema = z.object({
  scheduledEventId: z.string().uuid(),
  memberProfileId: z.string().uuid(), // Target player
  status: z.enum(["AVAILABLE", "UNAVAILABLE", "MAYBE"]),
  transportNote: z.string().trim().max(300).optional(),
});
```
- **Output**: `{ success: boolean; rsvp?: EventRsvp; isLocked?: boolean; error?: string }`
- **Delegation & Deadline**:
  - Validates `callerId === memberProfileId` OR caller is verified parent via `ParentChildLink`.
  - Rejects with `isLocked: true` if `now() >= event.rsvpDeadlineAt` unless caller has Coach/Admin role.

---

## 4. Match-Day Squad Selection Contracts (`selection.contract.ts`)

### `publishMatchLineupAction`
- **Authorized Roles**: `ADMIN`, `COACH`, and squad `CAPTAIN`
- **Input Schema**:
```typescript
export const publishMatchLineupSchema = z.object({
  scheduledEventId: z.string().uuid(),
  targetLineupSize: z.number().int().min(6).max(15),
  players: z.array(z.object({
    memberProfileId: z.string().uuid(),
    selectionRole: z.enum(["STARTING", "SUBSTITUTE", "RESERVE"]),
    tacticalRole: z.enum(["PLAYER", "CAPTAIN", "VICE_CAPTAIN", "WICKETKEEPER"]),
    battingOrderPosition: z.number().int().min(1).max(15).optional(),
  })).min(6),
  notes: z.string().trim().max(500).optional(),
});
```
- **Output**: `{ success: boolean; selectionId?: string; notifiedPlayerCount?: number; error?: string }`
- **Domain Invariants**:
  - Exactly `targetLineupSize` starting players.
  - Exactly 1 Captain and at most 1 Vice-Captain among starters.
  - Exactly 1 Wicketkeeper among starters.
- **Side Effects**: Dispatches simultaneous dual-parent notification via `NotificationService` for all minor players selected.

---

## 5. Pitch-Side Attendance Contracts (`attendance.contract.ts`)

### `recordPitchSideAttendanceAction`
- **Authorized Roles**: `ADMIN`, `COACH`, `AD_HOC_COACH`
- **Input Schema**:
```typescript
export const recordPitchSideAttendanceSchema = z.object({
  scheduledEventId: z.string().uuid(),
  attendanceList: z.array(z.object({
    memberProfileId: z.string().uuid(),
    status: z.enum(["PRESENT", "LATE", "ABSENT_EXCUSED", "NO_SHOW"]),
    arrivalTime: z.string().datetime().optional(),
    notes: z.string().trim().max(200).optional(),
  })),
  completeAndLock: z.boolean().default(false),
});
```
- **Output**: `{ success: boolean; recordedCount: number; isLocked: boolean; error?: string }`
- **Mobile Target**: Executable in <30 seconds on 360px viewport; defaults to `PRESENT` for selected or `AVAILABLE` players.

---

## 6. Municipal Attendance Export Contract (`folkeoplysning.contract.ts`)

### `exportFolkeoplysningCsvAction`
- **Authorized Roles**: `ADMIN`, `COACH`
- **Input Schema**:
```typescript
export const exportFolkeoplysningCsvSchema = z.object({
  fromYear: z.number().int().min(2020),
  toYear: z.number().int().max(2050),
  teamSquadId: z.string().uuid().optional(), // Optional filter by squad
});
```
- **Output**:
```typescript
export interface FolkeoplysningCsvResult {
  filename: string;
  csvContent: string;
  totalRecords: number;
  uniqueMembers: number;
}
```
- **Coverage**: Includes all attending club members regardless of age per Clarification #4.
