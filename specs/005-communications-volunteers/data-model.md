# Data Model: Module 5 - Club Communications, Announcements & Volunteer Duty Roster

**Feature Branch**: `005-communications-volunteers`  
**Date**: 2026-10-27  
**Module**: Module 5 (`src/modules/communications/` & `src/modules/volunteers/`)

---

## 1. Schema Entities & Prisma Schema Definitions

```prisma
// -------------------------------------------------------------
// Module 5: Club Communications, Announcements & Volunteer Duty Roster
// -------------------------------------------------------------

enum AnnouncementCategory {
  GENERAL
  SQUAD_UPDATE
  WEATHER_ALERT
  AGM
  SOCIAL_EVENT
}

enum AnnouncementPriority {
  NORMAL
  PINNED
  URGENT_WEATHER_ALERT
  AGM_NOTICE
}

enum AnnouncementAudience {
  ALL_MEMBERS
  SQUAD_SPECIFIC
  ROLE_SPECIFIC
}

enum VolunteerDutyType {
  SCORING
  UMPIRING
  PITCH_PREPARATION
  TEA_CATERING
  YOUTH_CARPOOL
  GENERAL_VOLUNTEER
}

enum VolunteerSlotStatus {
  OPEN
  CLAIMED
  SWAP_REQUESTED
}

enum DocumentCategory {
  BYLAWS
  CHILD_SAFETY
  CODE_OF_CONDUCT
  GENERAL_POLICY
}

model ClubAnnouncement {
  id              String               @id @default(uuid())
  title           String
  slug            String               @unique
  content         String               // Markdown formatted message body
  category        AnnouncementCategory @default(GENERAL)
  priority        AnnouncementPriority @default(NORMAL)
  audience        AnnouncementAudience @default(ALL_MEMBERS)
  targetSquadId   String?              // Optional FK to TeamSquad
  targetRole      Role?                // Optional FK/enum to Role for role-based targeting
  linkedEventId   String?              // Optional FK to ScheduledEvent (weather cancellation hook)
  authorProfileId String               // Author FK to MemberProfile
  isPinned        Boolean              @default(false)
  publishedAt     DateTime             @default(now())
  expiresAt       DateTime?
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  authorProfile MemberProfile              @relation("AuthoredAnnouncements", fields: [authorProfileId], references: [id], onDelete: Restrict)
  targetSquad   TeamSquad?                 @relation("SquadAnnouncements", fields: [targetSquadId], references: [id], onDelete: SetNull)
  linkedEvent   ScheduledEvent?            @relation("EventAnnouncements", fields: [linkedEventId], references: [id], onDelete: SetNull)
  readReceipts  AnnouncementReadReceipt[]

  @@index([category, priority])
  @@index([targetSquadId])
  @@index([publishedAt])
  @@index([isPinned])
}

model AnnouncementReadReceipt {
  id              String   @id @default(uuid())
  announcementId  String
  memberProfileId String
  readAt          DateTime @default(now())

  announcement  ClubAnnouncement @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  memberProfile MemberProfile    @relation("AnnouncementReadReceipts", fields: [memberProfileId], references: [id], onDelete: Cascade)

  @@unique([announcementId, memberProfileId])
  @@index([memberProfileId])
}

model VolunteerDutySlot {
  id                String              @id @default(uuid())
  eventId           String              // FK to ScheduledEvent
  dutyType          VolunteerDutyType
  title             String              // e.g. "Official Match Scorer"
  description       String?
  status            VolunteerSlotStatus @default(OPEN)
  assignedProfileId String?             // FK to MemberProfile (volunteer)
  claimedAt         DateTime?
  swapRequestedAt   DateTime?
  swapReason        String?
  carpoolSeats      Int?                // Available seats if dutyType === YOUTH_CARPOOL
  notes             String?             // Pitch-side instructions or notes
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  scheduledEvent  ScheduledEvent @relation("EventVolunteerSlots", fields: [eventId], references: [id], onDelete: Cascade)
  assignedProfile MemberProfile? @relation("AssignedVolunteerDuties", fields: [assignedProfileId], references: [id], onDelete: SetNull)

  @@index([eventId, status])
  @@index([assignedProfileId, status])
  @@index([dutyType])
}

model ClubDocument {
  id              String           @id @default(uuid())
  title           String
  slug            String           @unique
  category        DocumentCategory
  version         String           // Semantic version string e.g. "2026.1"
  fileUrl         String?          // Static PDF or external document link
  contentMarkdown String?          // Inlined markdown policy text
  requiresSignOff Boolean          @default(false)
  targetRole      Role?            // Specific role required to sign (e.g. COACH for child safety)
  isActive        Boolean          @default(true)
  publishedAt     DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  signOffs DocumentSignOff[]

  @@index([category, isActive])
  @@index([requiresSignOff])
}

model DocumentSignOff {
  id              String   @id @default(uuid())
  documentId      String
  memberProfileId String
  versionSigned   String   // The version string at time of signature
  signedAt        DateTime @default(now())
  ipAddress       String?
  userAgent       String?

  document      ClubDocument  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  memberProfile MemberProfile @relation("DocumentSignOffs", fields: [memberProfileId], references: [id], onDelete: Cascade)

  @@unique([documentId, memberProfileId, versionSigned])
  @@index([memberProfileId])
  @@index([documentId])
}
```

---

## 2. Updated Cross-Module Relations on Existing Models

### `MemberProfile` additions in `prisma/schema.prisma`:
```prisma
  // Module 5: Communications & Volunteer Relations
  authoredAnnouncements   ClubAnnouncement[]        @relation("AuthoredAnnouncements")
  announcementReadReceipts AnnouncementReadReceipt[] @relation("AnnouncementReadReceipts")
  assignedVolunteerDuties VolunteerDutySlot[]       @relation("AssignedVolunteerDuties")
  documentSignOffs        DocumentSignOff[]         @relation("DocumentSignOffs")
```

### `ScheduledEvent` additions in `prisma/schema.prisma`:
```prisma
  // Module 5: Event Volunteer Slots & Announcements
  volunteerSlots VolunteerDutySlot[] @relation("EventVolunteerSlots")
  announcements  ClubAnnouncement[]  @relation("EventAnnouncements")
```

### `TeamSquad` additions in `prisma/schema.prisma`:
```prisma
  // Module 5: Squad Targeted Announcements
  announcements ClubAnnouncement[] @relation("SquadAnnouncements")
```

---

## 3. Entity Integrity Rules & State Transitions

### A. Announcement Lifecycle & Weather Cancellation Hook
- **State Flow**:
  - `NORMAL` / `PINNED`: Composed by Admin/Coach $\rightarrow$ Saved & Published $\rightarrow$ Visible in member feed $\rightarrow$ Members view $\rightarrow$ `AnnouncementReadReceipt` created.
  - `URGENT_WEATHER_ALERT` linked to `ScheduledEvent`:
    1. Validates that `linkedEvent.date >= now()` (cannot auto-cancel past events).
    2. Atomically sets `ScheduledEvent.status = CANCELLED`.
    3. Publishes announcement with `priority = URGENT_WEATHER_ALERT` and `isPinned = true`.
    4. Automatically routes emergency alert to all RSVP'd members and linked parents via `NotificationService`.

### B. Volunteer Duty Slot State Transitions
```
                Admin / Coach Direct Assignment
                          OR
                  1-Tap Member Claim
                        ┌───────┐
                        │ OPEN  │
                        └───┬───┘
                            │
                            ▼
                       ┌─────────┐
                       │ CLAIMED │◄───────────────┐
                       └───┬─────┘                │
                           │                      │
           Volunteer Taps  │                      │ Peer Accepts Swap
           "Request Swap"  ▼                      │
                     ┌────────────────┐           │
                     │ SWAP_REQUESTED ├───────────┘
                     └────────────────┘
```
- **Lineup Conflict Check**: When a member in the confirmed Playing XI for a match attempts to claim an in-game duty (`SCORING`, `UMPIRING`), the domain validator warns that players in the active match squad should not hold officiating duties.

### C. Document Sign-Off Evaluation
- Evaluates whether a member has unacknowledged mandatory policies:
  ```ts
  hasUnsignedMandatoryPolicies(profileId: string, roles: Role[]): Promise<UnsignedPolicyResult>
  ```
- If unsigned policies exist, the system returns `hasUnsigned: true`, driving the persistent amber soft-warning banner across dashboards and match consoles.
