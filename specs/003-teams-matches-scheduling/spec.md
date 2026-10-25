# Feature Specification: Module 3 - Teams, Squads, Training & Match Scheduling

**Feature Branch**: `003-teams-matches-scheduling`

**Created**: 2026-10-25

**Status**: Draft

**Input**: User description: "Create and checkout a new feature branch named 003-teams-matches-scheduling from master, and specify Module 3: Teams, Squads, Training & Match Scheduling for the Roskilde Cricket Club web application (adhering to Constitution v1.1.0 and integrating with Module 1 001-user-auth-rbac and Module 2 002-inventory-equipment-management)"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Teams, Squads & Roster Management with Eligibility Safeguards (Priority: P1)

As a Club Administrator or Head Coach,
I want to create and manage club teams and age-group squads (1st XI, 2nd XI, U15 Youth, U13 Youth, Social/Women XI), designate coaching staff and captains, and assign player rosters with automated age eligibility checks,
So that players are rostered into the correct competitive divisions, youth safety is maintained, and multi-squad eligibility (e.g., senior youth playing up into adult teams) is cleanly managed.

**Why this priority**: Teams and squad rosters are the fundamental organizing domain models upon which all scheduling, RSVPs, match selections, and attendance tracking depend. Without teams and roster memberships, no events can be scheduled.

**Independent Test**: Can be tested independently by creating teams/squads (e.g., "1st XI", "U15 Youth"), assigning coaches and captains, adding adult and youth players, and verifying that age boundary constraints prevent ineligible players from being assigned to junior squads while permitting multi-squad play for eligible seniors/youth.

**Acceptance Scenarios**:

1. **Given** a club administrator navigating to the Teams & Squads console, **When** they create a new squad with name "U15 Youth", category `YOUTH`, age cutoff date matching U15 rules, and assign a designated Coach, **Then** the squad is created and displayed in the club squad directory.
2. **Given** an administrator assigning players to the "U15 Youth" roster, **When** they select a player whose date of birth exceeds the U15 cutoff (e.g., age 17), **Then** the system rejects the assignment with a clear age-eligibility validation error.
3. **Given** an eligible youth player (e.g., age 14) already rostered on "U15 Youth", **When** an administrator or Coach adds the player to the "2nd XI" (Senior) roster, **Then** the system permits the assignment, creating a multi-squad membership so the player can participate in both squads.
4. **Given** an existing squad, **When** a Coach assigns a player as "Team Captain", **Then** the captain designation is updated, reflected on the roster, and permissions are granted for match-day lineup management.

---

### User Story 2 - Fixtures, Training & Facility Allocation with Conflict Detection (Priority: P2)

As a Coach or Administrator,
I want to schedule competitive matches (League, Friendly, Cup) and recurring training sessions (Nets, Fielding, Indoor Winter) with match times, meet times, home/away venues, opponent names, and facility/pitch allocations,
So that team members have clear schedules, facility collisions (e.g., two teams booking the Poppelgårdsvej main pitch at the same time) are prevented, and match kit gear can be directly linked from Module 2.

**Why this priority**: Players and parents require accurate fixture and training calendars. Preventing facility double-booking is vital for the club's physical grounds in Roskilde.

**Independent Test**: Can be tested independently by creating upcoming fixtures and training sessions across different dates, verifying facility collision detection when double-booking a pitch or net lane, and testing the optional link to equipment checkout bags.

**Acceptance Scenarios**:

1. **Given** a Coach scheduling a league fixture for the 1st XI, **When** they specify date, match start time (13:00), meet time (12:00), home venue, opponent "Svanholm CC", and select "Poppelgårdsvej Main Pitch", **Then** the fixture is created, published to squad members, and reserved on the facility schedule.
2. **Given** an existing fixture booked on "Poppelgårdsvej Main Pitch" on Saturday at 13:00, **When** another Coach attempts to schedule a 2nd XI friendly or training session on the same pitch during the overlapping time slot, **Then** the system detects the facility conflict, highlights the collision, and blocks creation until an alternative facility or time is selected.
3. **Given** a scheduled home match fixture, **When** the assigned Coach links a match-day kit bag or bulk match balls from the club equipment inventory (Module 2), **Then** the fixture displays the linked equipment reference, enabling pitch-side checkout.
4. **Given** an away match fixture, **When** the Coach inputs the away venue name, address, and meet time, **Then** the event clearly displays travel details and distinguishes itself visually from home ground sessions.

---

### User Story 3 - Mobile 1-Tap RSVP, Parental Delegation & Squad Selection (Priority: P3)

As a Player or Parent of a youth player,
I want to view upcoming fixtures and training sessions and submit 1-tap availability RSVPs (`AVAILABLE`, `UNAVAILABLE`, `MAYBE`) with optional notes, and as a Coach, I want to select the Playing XI + Substitutes from available players and publish the lineup,
So that coaches can reliably plan lineups before the RSVP deadline and notify parents/players instantly.

**Why this priority**: Availability tracking and match selection form the core weekly interactive loop for players, parents, and coaching staff. Parental delegation ensures parents can manage their children's availability seamlessly.

**Independent Test**: Can be tested independently by submitting RSVPs as an adult player, switching to a linked youth child via the profile switcher to submit an RSVP as a parent, viewing availability in the Coach selection console, locking selection, and verifying notification dispatch.

**Acceptance Scenarios**:

1. **Given** a player viewing their upcoming schedule, **When** they tap `AVAILABLE` for an upcoming fixture before the RSVP cutoff deadline, **Then** their RSVP status updates immediately to `AVAILABLE` with an affirmative timestamp.
2. **Given** a parent logged in with active delegation for their linked minor player via the Profile Switcher, **When** the parent views upcoming youth matches and submits `AVAILABLE` with note "Can provide transport for 2 extra players", **Then** the RSVP is recorded against the youth player's profile with the parent's attribution and note.
3. **Given** a fixture whose RSVP deadline has passed, **When** a player attempts to change their RSVP, **Then** the RSVP is locked, prompting them to contact the team Coach or Captain directly.
4. **Given** a Coach opening the Match-Day Squad Selection console for an upcoming match, **When** the Coach views the roster grouped by availability (`AVAILABLE`, `MAYBE`, `UNAVAILABLE`, `NO_RESPONSE`), selects 11 players for the Playing XI, assigns roles (Captain, Wicketkeeper), designates 2 substitutes, and clicks "Publish Lineup", **Then** the selection is finalized, saved, and marked as published.
5. **Given** a published lineup containing a minor youth player, **When** the announcement is published, **Then** both linked parents simultaneously receive an automated match selection notice via `NotificationService`.

---

### User Story 4 - Pitch-Side Attendance Checklist & Match Statistics Foundation (Priority: P4)

As a Coach or Ad-Hoc Coach standing on the pitch,
I want a mobile-optimized pitch-side attendance checklist (<30s on a 360px screen) to mark players as `PRESENT`, `LATE`, `ABSENT_EXCUSED`, or `NO_SHOW` for matches and training,
So that club attendance records are accurately tracked for Danish municipal (Folkeoplysning) youth grant compliance, team discipline is maintained, and individual appearance records are reliably aggregated.

**Why this priority**: Pitch-side usability under outdoor conditions is essential for coaches. Accurate attendance is legally required for Danish municipal youth sports funding and forms the basis for end-of-season awards.

**Independent Test**: Can be tested independently on a 360px mobile viewport by opening an ongoing or past fixture/training event, rapidly toggling player attendance statuses within 30 seconds, saving, and verifying historical attendance reports.

**Acceptance Scenarios**:

1. **Given** a Coach opening an ongoing training session on a smartphone (360px viewport), **When** they access the Pitch-Side Attendance view, **Then** the roster appears in a compact touch-list with 1-tap status pills (`PRESENT`, `LATE`, `EXCUSED`, `NO_SHOW`), defaulting to `PRESENT` for selected/RSVP'd players.
2. **Given** a player who did not show up without notice, **When** the Coach taps `NO_SHOW` and enters an optional note, **Then** the record is updated in real time and flagged in the player's seasonal attendance metrics.
3. **Given** all players have been marked, **When** the Coach taps "Complete Attendance", **Then** the attendance session is closed, locked against accidental edits, and aggregate appearance counters update.
4. **Given** a member account that undergoes GDPR Article 17 erasure (Module 1), **When** the member is converted to `"Former Member #..."`, **Then** historical match appearances, team selections, and attendance counts remain preserved against the statistical shell record, while personal notes and PII are permanently purged.

---

### Edge Cases

- **Multi-Squad Scheduling Collision**: A player is rostered on both the U15 squad and 2nd XI. Both teams have fixtures on the same Saturday afternoon. The system MUST display a conflict indicator on the Coach selection console for both matches alerting that the player is already selected or playing in another fixture at that time.
- **Dual-Parent Conflicting RSVPs**: Two linked parents attempt to submit conflicting RSVPs for the same youth player (e.g., Parent 1 says `AVAILABLE`, Parent 2 says `UNAVAILABLE`). The system MUST record the latest RSVP with timestamp and actor attribution, and display both parents' visibility.
- **Ad-Hoc Coach Temporary Access**: An Ad-Hoc Coach is assigned to lead a single training session. The system MUST grant pitch-side attendance and inventory checkout access for that specific event without granting permanent administrative privileges.
- **Fixture Postponement / Abandonment / Rescheduling**: A match is rained out or rescheduled. The Coach marks the match as `RAINED_OUT` or updates the date/time. The system MUST reset RSVPs if the date changes, release the previous facility booking, and dispatch an urgent notification to all rostered players and parents.
- **Under-Age & Over-Age Edge Cases**: A competitive youth match under DCF (Danish Cricket Federation) rules allows up to 2 dispensation players. The system MUST flag over-age players clearly with a "Dispensation Required" badge.
- **Zero-Player or Walkover Matches**: A match is cancelled due to opponent forfeit. The system MUST record the event as `OPPONENT_FORFEIT` without corrupting team attendance averages.

---

## Requirements *(mandatory)*

### Functional Requirements

#### 1. Teams, Squads & Rostering
- **FR-001**: System MUST allow Administrators and Coaches to create and manage Club Teams and Squads with name, category (`SENIOR`, `YOUTH`, `SOCIAL`), age group classification, and description.
- **FR-002**: System MUST allow assigning one or more Coaches or Ad-Hoc Coaches as team leaders, and designating a primary Team Captain (`MemberProfile`).
- **FR-003**: System MUST enforce age eligibility rules when adding minor players (`isMinor === true`) to age-restricted squads (e.g., U13, U15, U17) based on their verified date of birth.
- **FR-004**: System MUST support multi-squad membership, allowing a player to hold active roster memberships in more than one squad simultaneously (e.g., U17 player playing in 1st/2nd XI).
- **FR-005**: System MUST allow filtering and searching squad rosters by role, age group, batting position, and bowling style (integrating with Module 1 profile attributes).

#### 2. Fixtures & Training Session Scheduling
- **FR-006**: System MUST support scheduling competitive matches with match type (`LEAGUE`, `FRIENDLY`, `CUP`, `TOURNAMENT`), opponent club name, date, start time, meet time, home/away indicator, and venue details.
- **FR-007**: System MUST support scheduling training sessions with session type (`NET_PRACTICE`, `FIELDING_FITNESS`, `INDOOR_WINTER`, `OPEN_NETS`), recurring schedule patterns (e.g., every Tuesday & Thursday), date, start time, and end time.
- **FR-008**: System MUST manage club facilities/resources (e.g., "Poppelgårdsvej Main Pitch", "Practice Nets 1-2", "Practice Nets 3-4", "Indoor Sports Hall") and track bookings per event.
- **FR-009**: System MUST execute automated facility conflict detection, preventing two different events from reserving the same ground or facility resource during overlapping time windows.
- **FR-010**: System MUST allow Coaches to link required equipment items or bulk consumables from Module 2 (e.g., Match Ball Box, Kit Bag) to a scheduled event for 1-click pitch-side checkout.

#### 3. Availability Tracking (RSVPs) & Parental Delegation
- **FR-011**: System MUST provide a mobile-friendly 1-tap RSVP interface allowing players to indicate availability (`AVAILABLE`, `UNAVAILABLE`, `MAYBE`) with an optional note (e.g., "Arriving 15 mins late", "Need ride").
- **FR-012**: System MUST allow parents to view upcoming events and submit RSVPs on behalf of their linked minor child(ren) using the Module 1 `HeaderProfileSwitcher` delegation context.
- **FR-013**: System MUST support configuring an RSVP cutoff deadline (e.g., 48 hours prior to match meet time), after which self-service RSVP edits are locked.
- **FR-014**: System MUST aggregate squad availability in real time, displaying counts of `AVAILABLE`, `UNAVAILABLE`, `MAYBE`, and `NO_RESPONSE` players to team coaches.

#### 4. Match-Day Squad Selection & Lineup Publication
- **FR-015**: System MUST provide Coaches and Team Captains with a Match-Day Selection console to select the Playing XI (or custom squad size) and designated substitutes from the list of available players.
- **FR-016**: System MUST allow assigning match-day tactical roles to selected players, including Captain (`C`), Vice-Captain (`VC`), and Wicketkeeper (`WK`).
- **FR-017**: System MUST warn the Coach if a selected player has an active scheduling conflict (e.g., selected for another squad's match on the same day).
- **FR-018**: System MUST support draft selection state (`DRAFT`) and published state (`PUBLISHED`), allowing coaches to construct the lineup privately before releasing it.
- **FR-019**: System MUST dispatch selection notifications via `NotificationService` when a lineup is published, automatically notifying both linked parents simultaneously for any selected minor player.

#### 5. Pitch-Side Attendance Tracking & Statistics Foundation
- **FR-020**: System MUST provide a fast mobile-first pitch-side attendance checklist (<30s on 360px viewport) allowing Coaches and Ad-Hoc Coaches to mark attendance as `PRESENT`, `LATE`, `ABSENT_EXCUSED`, or `NO_SHOW`.
- **FR-021**: Attendance checklist MUST default to `PRESENT` for players who were selected or RSVP'd `AVAILABLE`, minimizing manual tapping on match day.
- **FR-022**: System MUST support finalizing and locking attendance records to generate immutable event attendance reports for Danish municipal youth sports reporting (Folkeoplysning).
- **FR-023**: System MUST maintain aggregate seasonal attendance percentages and match appearance counts per player per squad.

#### 6. Cross-Module GDPR Article 17 Integrity
- **FR-024**: When a member profile is anonymized into a `"Former Member #..."` shell record under GDPR Article 17 (Module 1), the system MUST preserve all historical match appearances, team lineup references, and attendance counts attached to the profile ID, ensuring club historical match records remain statistically accurate.
- **FR-025**: System MUST purge all personal notes, RSVP transportation comments, and free-text attendance explanations associated with an anonymized member.
- **FR-026**: System MUST update Module 1's "Download My Data" (GDPR Article 20) export package to include the member's complete match selections, RSVPs, and attendance records.

---

### Key Entities

- **Team**: Represents a high-level club team entity (e.g., "Roskilde 1st XI", "Roskilde U15", "Roskilde Social XI") with category (`SENIOR`, `YOUTH`, `SOCIAL`), gender group, and active status.
- **SquadMembership**: Junction entity connecting `MemberProfile` to `Team` with roster role (`PLAYER`, `COACH`, `AD_HOC_COACH`, `CAPTAIN`, `VICE_CAPTAIN`), jersey number, joined date, and active flag.
- **Facility**: Represents a physical club resource (e.g., Main Pitch, Nets 1-2, Indoor Gym, Clubhouse) with capacity, address, and availability rules.
- **ScheduledEvent**: Master event model representing either a competitive match or a training session, with event type (`MATCH`, `TRAINING`), sub-type (`LEAGUE`, `FRIENDLY`, `CUP`, `NET_PRACTICE`, `FIELDING_FITNESS`), title, date, start time, end time, meet time, home/away status, opponent name, venue, RSVP deadline, and facility allocation.
- **FacilityBooking**: Specific reservation linking a `ScheduledEvent` to a `Facility` for conflict detection during the event's time slot.
- **EventRsvp**: Availability response linking `MemberProfile` to `ScheduledEvent` with status (`AVAILABLE`, `UNAVAILABLE`, `MAYBE`), note, transport info, submitted by (`MemberProfileId`), and timestamp.
- **MatchSelection**: Official team lineup for a match event with status (`DRAFT`, `PUBLISHED`), published at, and published by.
- **MatchSelectionPlayer**: Junction linking `MatchSelection` to `MemberProfile` with selection status (`PLAYING_XI`, `SUBSTITUTE`, `RESERVE`), batting order position, match role (`CAPTAIN`, `VICE_CAPTAIN`, `WICKETKEEPER`), and player availability at selection time.
- **AttendanceRecord**: Pitch-side check-in record linking `MemberProfile` to `ScheduledEvent` with status (`PRESENT`, `LATE`, `ABSENT_EXCUSED`, `NO_SHOW`), checked-in by (`MemberProfileId`), timestamp, and arrival time.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Coaches can complete a full pitch-side attendance checklist for a 15-player training session or match in under **30 seconds** on a mobile screen (360px viewport).
- **SC-002**: Facility double-booking conflict detection runs instantly (<100ms) and prevents **100%** of overlapping pitch and net bookings.
- **SC-003**: Players and parents can submit or update an RSVP in **2 taps** (<5 seconds) directly from the mobile app or notification link.
- **SC-004**: When a match lineup is published, **100%** of selected minor players trigger simultaneous dual-parent notification alerts without delivery drop.
- **SC-005**: Age eligibility verification rejects **100%** of over-age players attempting to join age-restricted junior squad rosters (unless explicitly flagged with approved dispensation).
- **SC-006**: Lineup selection console allows a Coach or Captain to pick the Playing XI and assign tactical roles in under **60 seconds**.
- **SC-007**: GDPR Article 17 anonymization retains **100%** of historical match counts and appearance statistics on the `"Former Member #..."` shell while completely erasing all personal text notes and transport comments.
- **SC-008**: Danish municipal youth attendance export report can be generated for any date range in **1 click** (<2 seconds).

---

## Assumptions

- Roskilde Cricket Club primarily operates at the Poppelgårdsvej cricket ground, with seasonal use of local indoor municipal sports halls during Danish winter months (November to March).
- Competitive matches follow Danish Cricket Federation (DCF) standards (typically 11 players per side with up to 1-2 designated substitutes).
- Players under 18 years old are classified as minor players (`isMinor === true`), and their attendance and match notifications must adhere to Module 1's dual-parent notification governance.
- Training sessions may recur weekly or bi-weekly throughout the active season (April to September).
- Match kit bags and equipment items linked to fixtures will reference the existing `EquipmentItem` and `EquipmentLoan` entities from Module 2.
