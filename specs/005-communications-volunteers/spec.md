# Feature Specification: Module 5 - Club Communications, Announcements & Volunteer Duty Roster

**Feature Branch**: `005-communications-volunteers`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Create and checkout a new feature branch named 005-communications-volunteers from master, and specify Module 5: Club Communications, Announcements & Volunteer Duty Roster for the Roskilde Cricket Club web application (adhering to Constitution v1.1.0 and integrating with Module 1 001-user-auth-rbac, Module 2 002-inventory-equipment-management, Module 3 003-teams-matches-scheduling, and Module 4 004-membership-fees-finance)"

## Clarifications

### Session 2026-10-27

- **Q: When an urgent weather or pitch cancellation announcement is published for a scheduled fixture or training, should it automatically update the event status to CANCELLED in Module 3?**  
  → **A: Yes (Recommended)**: Publishing an urgent weather/pitch cancellation announcement linked to an event automatically transitions the event status to `CANCELLED` in Module 3 and dispatches emergency cancellation notifications to all RSVP'd members and linked parents.
- **Q: How should volunteer duty slots (e.g., Umpiring, Scoring, Ground Prep, Tea, Carpool) be filled?**  
  → **A: Hybrid (Recommended)**: Admins and coaches can directly assign members or parents to duty slots, and members/parents can also self-signup or request swaps directly from event cards and the duty roster console.
- **Q: How should unacknowledged mandatory policies (such as child-safety Børneattest or Code of Conduct) be handled in the application?**  
  → **A: Prominent Banner & Soft Warning (Recommended)**: Display a persistent amber warning banner on member dashboards and event pages prompting 1-click digital sign-off, without blocking match selection or team attendance.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Targeted Club & Squad Announcements with Urgent Weather Alerts (Priority: P1)

As a Club Administrator or Team Coach,  
I want to compose and publish targeted announcements across club levels (Club-Wide, Squad/Team-Specific, or Role-Targeted like Coaches or Parents),  
And flag critical alerts with pinned priority and urgent banners (especially for weather or pitch inspections causing match/practice cancellations during Danish spring and autumn),  
And track read-receipts while automatically routing notifications to both linked parents simultaneously for youth announcements,  
So that members and families stay instantly informed about club activities and last-minute schedule changes.

**Why this priority**: Fast, reliable communication—particularly weather-induced cancellations—is the primary operational friction point for Danish outdoor sports clubs. Without announcement distribution, members arrive at unplayable grounds and coaches spend hours manually messaging parents.

**Independent Test**: Can be tested independently by publishing a club-wide notice, publishing a youth squad weather cancellation linked to a scheduled fixture, verifying the fixture automatically marks as `CANCELLED`, verifying that both parents receive notifications, and checking that read receipts increment as members view the notice.

**Acceptance Scenarios**:

1. **Given** a Club Administrator composing an announcement, **When** they select audience "Club-Wide", check "Pin to Noticeboard", format the text, and publish, **Then** the announcement is pinned to the top of all members' dashboards and sent via the club `NotificationService`.
2. **Given** a Youth U15 Coach facing heavy rain 2 hours before a match, **When** they publish an "Urgent Pitch Inspection Failed / Match Cancelled" announcement linked to the scheduled fixture, **Then** the linked `ScheduledEvent` status automatically transitions to `CANCELLED`, an amber/red emergency banner renders on the dashboard, and both linked parents of rostered players receive an immediate alert.
3. **Given** an active announcement, **When** an authenticated member opens and reads the full announcement on mobile or desktop, **Then** the system registers a read receipt with a timestamp, allowing admins and coaches to audit communication reach percentage.
4. **Given** an announcement targeted specifically to a team squad (e.g., "Senior 1st XI"), **When** members of other squads log in, **Then** the squad-specific announcement is excluded from their feed, preserving clean, relevant communications.

---

### User Story 2 - Match-Day & Club Volunteer Duty Roster with 1-Tap Mobile Sign-Up & Swaps (Priority: P2)

As a Club Administrator, Team Captain, or Event Organiser,  
I want to define and attach volunteer duty slots to `ScheduledEvent` fixtures and club sessions (e.g., Umpiring, Official Scoring, Pitch Preparation & Boundary Ropes, Tea & Match Catering, Youth Carpool Driver),  
And as an Adult Player or Parent of a youth player,  
I want a 1-tap mobile portal to claim unfilled duties, view my upcoming volunteer commitments, and request duty swaps if my schedule changes,  
So that match operations run smoothly, volunteer duties are equitably distributed across the club community, and duty shortages are surfaced proactively.

**Why this priority**: Cricket matches cannot proceed without umpires, scorers, and pitch preparation, and youth games rely entirely on parent drivers. Automating slot claims and swaps eliminates chaotic WhatsApp threads and spreadsheet tracking.

**Independent Test**: Can be tested independently by adding volunteer slots (e.g. Scorer, Umpire, Carpool) to a fixture, having a member or parent claim a slot in 1 tap, viewing the "Duties Filled (2/2)" badge on the match card, initiating a swap request, and having another eligible member accept the swap.

**Acceptance Scenarios**:

1. **Given** an upcoming match fixture, **When** the coach or match manager adds 2 volunteer slots ("Official Scorer" and "Tea & Catering"), **Then** the match fixture card displays an amber badge: `"Volunteers Needed (0/2)"`.
2. **Given** an open volunteer duty slot, **When** a player or parent taps **"Volunteer for this Duty"** on mobile (<10s), **Then** their name and contact info are attached to the slot, and the event card updates to `"Duties Filled (1/2)"`.
3. **Given** a parent logged into the mobile app with linked youth players, **When** viewing an upcoming away fixture for their child's squad, **Then** they can sign up for "Carpool Driver (3 passenger seats)" on behalf of their household.
4. **Given** an assigned volunteer who can no longer attend, **When** they tap **"Request Swap"** and provide an optional note ("Work travel on Saturday"), **Then** the slot status transitions to `SWAP_REQUESTED`, notifying squad members of the open replacement opportunity.
5. **Given** a slot with `SWAP_REQUESTED`, **When** a fellow squad member or parent taps **"Accept Swap"**, **Then** the duty slot is reassigned to the new volunteer, the original volunteer is released, and confirmation notices are dispatched to both parties.
6. **Given** an admin or coach reviewing team operations, **When** they view the Match Day volunteer console, **Then** they can directly assign or reassign any member to a duty slot if needed.

---

### User Story 3 - Club Documents, Policies & Mandatory Digital Sign-Offs (Priority: P3)

As a Club Secretary or Administrator,  
I want a centralized, versioned document repository for Roskilde Cricket Club bylaws (*Vedtægter*), child-safety policies (*Børneattest* compliance guidelines for coaches and youth volunteers), ground usage rules, and seasonal codes of conduct,  
And I want to require mandatory digital acknowledgment from specific member groups (e.g. Coaches must acknowledge child-safety guidelines; players/parents must sign seasonal conduct rules),  
And as a Member or Parent,  
I want a clear, 1-click sign-off modal and document reader with persistent download access,  
So that RCC fulfills Danish sports federation governance standards (*Danmarks Idrætsforbund* - DIF / DCF) with an immutable audit trail.

**Why this priority**: Danish law and sports federation statutes require strict child protection (*børneattest*) and transparent association governance (*foreningsvedtægter*). Digital sign-offs protect the club legally and ensure coaches and parents understand their responsibilities.

**Independent Test**: Can be tested independently by uploading a versioned document (e.g. "RCC Child Protection & Børneattest Policy 2026 v1.0"), designating it as mandatory for `COACH` roles, logging in as a coach, seeing the amber dashboard warning banner, opening the policy, clicking "I Agree & Acknowledge", and verifying the timestamped sign-off appears in the admin compliance log.

**Acceptance Scenarios**:

1. **Given** a Club Secretary in the Document Management console, **When** they publish a new document titled "Club Code of Conduct 2026" with category `CODE_OF_CONDUCT`, attach a PDF/markdown link, and set `requiresSignOff = true` for role `PLAYER`, **Then** the document is published and flagged as requiring acknowledgment for all active players.
2. **Given** a Coach logging into the application with an unacknowledged mandatory child safety policy, **When** they land on their dashboard or squad console, **Then** a prominent amber notice banner appears: *"Mandatory Policy Sign-Off: RCC Child Safety & Børneattest Policy (Requires your review)"*, linking directly to the sign-off view.
3. **Given** a member reviewing a mandatory document, **When** they scroll through the policy text and click **"Confirm Digital Sign-Off"**, **Then** a permanent sign-off record is created capturing `profileId`, `documentId`, `documentVersion`, and `signedAt`, and the warning banner is cleared.
4. **Given** a Club Secretary or Auditor reviewing annual compliance, **When** they open the Document Sign-Off Report, **Then** they can view the compliance rate (e.g., 94% signed), see which members have not yet acknowledged, and trigger a gentle 1-click email reminder.

---

### User Story 4 - Cross-Module Integration, App Navigation & GDPR Compliance (Priority: P4)

As a System Administrator or Club Member,  
I want seamless navigation across Modules 1–5 in the header and mobile launcher,  
And I want GDPR Article 17 (Right to Erasure) and Article 20 (Data Portability) compliance hooks that scrub personal announcement notes, release upcoming volunteer slots, anonymize historical duty records onto `"Former Member #[HASH]"`, and package authored notices, volunteer rosters, and signed policies into the member's "Download My Data" export,  
So that communications and volunteer management operate harmoniously within RCC's typed full-stack architecture and meet all Danish and EU privacy regulations.

**Why this priority**: Every module in the RCC platform must maintain strict data consistency, GDPR compliance, and seamless cross-module links (attaching duties to Module 3 events, dispatching notices via Module 1, and honoring user privacy).

**Independent Test**: Can be tested independently by creating announcements, volunteering for an upcoming fixture, signing a policy, performing a GDPR Article 20 export (verifying all communications and volunteer records are present), and performing an Article 17 anonymization (verifying upcoming slots are vacated for new volunteers, historical concluded duties are preserved as `"Former Member #[HASH]"`, and personal announcement comments/read-receipts are purged).

**Acceptance Scenarios**:

1. **Given** a member with an assigned volunteer duty on an *upcoming* event who undergoes GDPR Article 17 account erasure, **When** the erasure is executed, **Then** the upcoming volunteer slot is automatically unassigned and reverted to `OPEN` with a swap/reassignment alert sent to the squad coach.
2. **Given** historical concluded volunteer duties performed by an erased member, **When** erasure is executed, **Then** historical club service records remain preserved for statistical tallies under `"Former Member #[HASH]"` without retaining personal contact information.
3. **Given** a member requesting a GDPR Article 20 "Download My Data" export, **When** the JSON archive is generated, **Then** it contains the member's full communication history: authored announcements, read receipts, volunteer duty history, and signed policy acknowledgment records.
4. **Given** the global application shell navigation, **When** an authenticated user opens the desktop top-bar or mobile App Launcher drawer, **Then** direct links are available to **"Noticeboard"** (`/communications`), **"Volunteer Roster"** (`/volunteers`), and **"Club Documents"** (`/documents`), respecting user roles.

---

### Edge Cases

- **Double Booking Volunteer Duties**: What happens if a player is selected in the Playing XI for a match in Module 3 and attempts to sign up as the "Official Scorer" or "Umpire" for the same fixture?  
  *Resolution*: The system detects the fixture lineup conflict and presents a validation warning: *"You are already in the Playing XI squad for this match. Scoring/Umpiring should be performed by non-playing members or parents."*
- **Weather Alert on Completed Event**: What happens if a coach publishes an announcement linked to an event that has already concluded?  
  *Resolution*: The system prevents setting status to `CANCELLED` on historical past events and only publishes the announcement text without altering past attendance or match scores.
- **Unclaimed Duty at Match Start**: What happens if a required match duty (e.g., Umpire) remains unfilled 1 hour prior to match kickoff?  
  *Resolution*: The match card displays a bold red badge: `"Urgent: 1 Unfilled Duty (Kickoff in 1h)"` and notifies the Team Captain and Coach.
- **Parent Claiming Duty for Household**: What happens if a parent volunteers for carpool duty for an away match?  
  *Resolution*: The system attributes the volunteer duty to the parent's profile, associates the linked child's squad, and registers the car passenger capacity for the traveling team.
- **Document Re-versioning**: What happens when an updated version of a policy (e.g. from `v2025.1` to `v2026.1`) is published?  
  *Resolution*: Members who signed `v2025.1` retain their historical sign-off record, but the system marks the updated document as requiring a new signature for `v2026.1` and displays the sign-off prompt.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Club Announcements & Emergency Weather Alerts
- **FR-001**: The system MUST allow Administrators and Coaches to compose, edit, pin, and publish announcements with markdown formatting, audience scoping (`ALL_MEMBERS`, `SQUAD_SPECIFIC`, `ROLE_SPECIFIC`), and priority levels (`NORMAL`, `URGENT_WEATHER_ALERT`, `AGM_NOTICE`).
- **FR-002**: When an announcement is marked as `URGENT_WEATHER_ALERT` and linked to a `ScheduledEvent`, the system MUST automatically transition the linked event's status to `CANCELLED` and dispatch high-priority notifications.
- **FR-003**: When an announcement is targeted to a youth squad (`isYouth === true`), the system MUST automatically deliver the notification to all registered parents linked to squad players simultaneously.
- **FR-004**: The system MUST track read receipts for announcements, recording the authenticated `memberProfileId` and `readAt` timestamp upon viewing.
- **FR-005**: The member dashboard MUST display a dedicated Noticeboard section featuring pinned announcements at the top, followed by reverse-chronological club and squad notices.

#### Volunteer Duty Roster & Swaps
- **FR-006**: The system MUST allow Admins and Coaches to configure required volunteer duty slots attached to any `ScheduledEvent`, specifying `dutyType` (`SCORING`, `UMPIRING`, `PITCH_PREPARATION`, `TEA_CATERING`, `YOUTH_CARPOOL`, `GENERAL_VOLUNTEER`) and required volunteer count.
- **FR-007**: Members and linked parents MUST be able to claim open volunteer slots in 1 tap on mobile (<10 seconds).
- **FR-008**: Admins and Coaches MUST be able to directly assign or reassign any club member or parent to a duty slot.
- **FR-009**: Assigned volunteers MUST be able to submit a duty swap request with an optional note, transitioning the slot status to `SWAP_REQUESTED`.
- **FR-010**: Any eligible squad member or parent MUST be able to accept an open swap request in 1 tap, automatically transferring the duty assignment and notifying the event coach.
- **FR-011**: Match cards, event fixture details, and the volunteer dashboard MUST display dynamic visual badges indicating duty status (e.g. `"Duties Filled (3/3)"`, `"Volunteers Needed (1/3)"`, `"Swap Requested"`).
- **FR-012**: The system MUST enforce a warning check if a volunteer slot is claimed by a member already confirmed in the active playing lineup for the same match.

#### Club Document Repository & Policy Sign-Offs
- **FR-013**: The system MUST provide a central Document Repository categorized by type (`BYLAWS`, `CHILD_SAFETY`, `CODE_OF_CONDUCT`, `GENERAL_POLICY`) with version tracking, description, and downloadable resource link.
- **FR-014**: Admins MUST be able to designate documents as requiring mandatory digital sign-off, specifying target roles (`COACH`, `PLAYER`, `PARENT`, `ALL`).
- **FR-015**: When a mandatory policy is unacknowledged by a member, the system MUST display a persistent amber warning banner on their dashboard and event consoles with a 1-click modal to review and sign.
- **FR-016**: The system MUST record immutable digital policy acknowledgments capturing `memberProfileId`, `documentId`, `documentVersion`, `signedAt`, and `ipAddress` or audit metadata.
- **FR-017**: The system MUST provide an Administrative Compliance Dashboard displaying sign-off percentages and enabling 1-click reminder dispatches to unacknowledged members.

#### Cross-Module Integration & GDPR
- **FR-018**: The system MUST route all notifications (announcements, cancellation alerts, duty assignments, swap requests, and policy reminders) through Module 1's `NotificationService`.
- **FR-019**: Under GDPR Article 17 erasure, the system MUST vacate any upcoming volunteer duty slots held by the erased member, re-opening them for new volunteers, while anonymizing historical concluded duties onto `"Former Member #[HASH]"`.
- **FR-020**: Under GDPR Article 20 data portability, the system MUST include the member's authored announcements, read receipts, volunteer duty history, and signed policy acknowledgments in the "Download My Data" export.

---

### Key Entities *(include if feature involves data)*

- **ClubAnnouncement**: Represents a published notice or emergency alert.
  - Attributes: `id`, `title`, `slug`, `content`, `priority` (`NORMAL`, `PINNED`, `URGENT_WEATHER_ALERT`, `AGM_NOTICE`), `audienceType` (`ALL_MEMBERS`, `SQUAD_SPECIFIC`, `ROLE_SPECIFIC`), `targetSquadId` (optional link to `TeamSquad`), `targetRole` (optional), `linkedEventId` (optional link to `ScheduledEvent`), `authorProfileId`, `publishedAt`, `expiresAt`, `isPinned`.
  - Relationships: Belongs to `MemberProfile` (author), optionally belongs to `TeamSquad` and `ScheduledEvent`, has many `AnnouncementReadReceipt`.

- **AnnouncementReadReceipt**: Tracks member readership of announcements.
  - Attributes: `id`, `announcementId`, `memberProfileId`, `readAt`.
  - Relationships: Belongs to `ClubAnnouncement` and `MemberProfile`.

- **VolunteerDutySlot**: Represents a required helper role on a scheduled event or fixture.
  - Attributes: `id`, `eventId`, `dutyType` (`SCORING`, `UMPIRING`, `PITCH_PREPARATION`, `TEA_CATERING`, `YOUTH_CARPOOL`, `GENERAL_VOLUNTEER`), `title`, `description`, `assignedProfileId` (optional), `status` (`OPEN`, `FILLED`, `SWAP_REQUESTED`), `swapRequestedAt`, `swapReason`, `notes`, `capacity` (e.g. carpool seats).
  - Relationships: Belongs to `ScheduledEvent`, optionally assigned to `MemberProfile` (volunteer).

- **ClubDocument**: Represents a governance, compliance, or club operational document.
  - Attributes: `id`, `title`, `slug`, `category` (`BYLAWS`, `CHILD_SAFETY`, `CODE_OF_CONDUCT`, `GENERAL_POLICY`), `version` (e.g. `"2026.1"`), `fileUrl`, `contentMarkdown`, `requiresSignOff`, `targetRole` (optional), `publishedAt`, `updatedAt`, `isActive`.
  - Relationships: Has many `DocumentSignOff`.

- **DocumentSignOff**: Immutable record of digital policy acknowledgment.
  - Attributes: `id`, `documentId`, `memberProfileId`, `versionSigned`, `signedAt`, `auditLogId`.
  - Relationships: Belongs to `ClubDocument` and `MemberProfile`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Emergency weather and pitch cancellation announcements can be composed, linked to a fixture, and published in under **30 seconds** on a mobile viewport (360px).
- **SC-002**: 100% of youth squad announcements and cancellation alerts are delivered simultaneously to both registered parents of minor players.
- **SC-003**: Members and parents can sign up for an open match volunteer duty slot or accept an open swap request in **1 tap (<10 seconds)** on mobile.
- **SC-004**: Match fixture cards render real-time volunteer fulfillment status (`"Duties Filled"`, `"Volunteers Needed"`, `"Swap Requested"`) with zero layout shift.
- **SC-005**: 100% of child-safety (*Børneattest*) and Code of Conduct digital sign-offs generate immutable audit logs with timestamp and version tracking.
- **SC-006**: Zero regression across Module 1 RBAC, Module 2 Inventory, Module 3 Events/Matches, and Module 4 Finance suites (`npm run test:unit` passes 100%).

---

## Assumptions

- **Notification Transport**: Outbound communications utilize the existing pluggable `NotificationService` (console in test/development, SMTP/email in production) established in Module 1 and Constitution Principle I.
- **Event Linkage**: Volunteer duty slots attach directly to Module 3 `ScheduledEvent` records, allowing duty rosters to reflect fixture dates, venues, and team squads.
- **Parental Rights**: In accordance with Constitution Principle II and Danish sports club custom, registered parents have full authority to volunteer for duties (scoring, catering, carpool) associated with their linked children's teams.
- **Document Storage**: Document contents can be stored as formatted markdown directly within the application database and/or linked as static PDFs.
- **Soft Enforcement on Policies**: Based on user clarification, unacknowledged mandatory policies display persistent amber dashboard and event banners without strictly blocking match selection or attendance, maintaining a positive volunteer club culture.
