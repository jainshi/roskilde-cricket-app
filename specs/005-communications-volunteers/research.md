# Technical Research & Architecture Decisions: Module 5 - Communications & Volunteer Duty Roster

**Feature Branch**: `005-communications-volunteers`  
**Date**: 2026-10-27  
**Module**: Module 5 (`src/modules/communications/` & `src/modules/volunteers/`)

---

## 1. Targeted Announcements & Weather Cancellation Hook

### Decision
Implement `announcement-dispatcher.ts` as a pure domain evaluator in `src/modules/communications/domain/announcement-dispatcher.ts`, paired with a server service in `src/modules/communications/services/announcement.service.ts`:
1. **Audience Scoping**:
   - `ALL_MEMBERS`: Broadcast to all active profiles.
   - `SQUAD_SPECIFIC`: Filtered to rostered players of `targetSquadId` AND their registered parents.
   - `ROLE_SPECIFIC`: Filtered to members holding the specified `Role` (e.g., `COACH`, `PARENT`, `PLAYER`).
2. **Dual-Parent Routing for Youth**:
   - When an announcement targets a squad with minor players (`isYouth === true`), query `ParentChildLink` to retrieve both parents.
   - Dispatch emails to both parents simultaneously via Module 1's `NotificationService.sendEmail(...)`, adhering to Constitution Principle II.
3. **Weather Cancellation Integration Hook**:
   - When an announcement has category `WEATHER_ALERT` and is linked to an upcoming `ScheduledEvent`, publishing the announcement automatically updates the `ScheduledEvent.status` to `CANCELLED` within a Prisma transaction, creates an `AuditLog` entry, and dispatches high-priority notices to all RSVP'd attendees and linked parents.

### Rationale
Danish spring and autumn cricket matches are frequently subject to sudden rain and unplayable pitches. Coupling the announcement publication with the event status transition ensures that match calendars, player RSVPs, and parent transport schedules update simultaneously with zero lag or duplicate data entry by coaches.

### Alternatives Considered
- *Separate Announcement & Manual Event Cancellation*: Rejected because coaches in pitch-side emergencies frequently forget to update the match calendar after sending a cancellation message, leading to confused members and parents traveling to closed grounds.

---

## 2. Match-Day & Club Volunteer Duty Roster Architecture

### Decision
Model volunteer duty slots directly linked to Module 3 `ScheduledEvent` records in `prisma/schema.prisma` via `model VolunteerDutySlot`:
1. **Slot Types**:
   - `SCORING`: Official match scoring (DIF / DCF match book / electronic scoring).
   - `UMPIRING`: Square-leg or main match umpiring.
   - `PITCH_PREPARATION`: Boundary ropes, sightscreens, pitch rolling, and crease marking.
   - `TEA_CATERING`: Match-day tea and refreshments (standard in Danish league cricket).
   - `YOUTH_CARPOOL`: Parent driver transporting youth players to away fixtures (recording vehicle passenger seat capacity).
   - `GENERAL_VOLUNTEER`: Field setup, barbecue, clubhouse cleanup.
2. **Hybrid Fulfillment Model**:
   - **Administrative Assignment**: Admins and team coaches can directly assign any active member or parent to a duty slot via `assignVolunteerDutySlotAction`.
   - **Self-Service 1-Tap Claim**: Members and parents can claim open slots in <10s on a 360px mobile viewport via `claimVolunteerDutySlotAction`.
3. **Peer-to-Peer Duty Swap State Machine**:
   - States: `OPEN` $\rightarrow$ `CLAIMED` $\rightarrow$ `SWAP_REQUESTED` $\rightarrow$ `REASSIGNED` (or `CLAIMED`).
   - An assigned volunteer unable to fulfill their duty taps "Request Swap", providing an optional reason ("Work travel on Saturday"). The slot transitions to `SWAP_REQUESTED`.
   - Any eligible squad peer or parent can tap "Accept Swap", reassigning the slot to themselves, releasing the previous volunteer, and notifying the coach without requiring admin intervention.
4. **Playing Lineup Conflict Safeguard**:
   - If a member in the confirmed Playing XI for a match attempts to claim an in-game duty (e.g. Scorer or Umpire), the domain evaluator emits a soft warning prompting confirmation, ensuring match focus is preserved.

### Rationale
Sports clubs in Denmark rely heavily on volunteer support (*frivillighed*). Fulfilling match duties pitch-side requires extreme simplicity: 1 tap to claim, and a seamless peer swap flow so coaches don't spend match day frantically seeking a replacement scorer or umpire.

### Alternatives Considered
- *Strictly Admin-Assigned Only*: Rejected because volunteer culture thrives on autonomy and self-selection.
- *Strictly Self-Signup Only*: Rejected because coaches must occasionally designate umpires or drivers when slots remain unfilled before match kickoff.

---

## 3. Versioned Document Repository & Soft-Warning Policy Sign-Offs

### Decision
Implement central club governance document management in `src/modules/communications/` with `model ClubDocument` and `model DocumentSignOff`:
1. **Document Categories**:
   - `BYLAWS`: Club statutes (*Roskilde Cricket Club Vedtægter*).
   - `CHILD_SAFETY`: Danish sports federation child safety regulations and *Børneattest* guidelines.
   - `CODE_OF_CONDUCT`: Player and parent seasonal codes of conduct.
   - `GENERAL_POLICY`: Ground rules, facility usage, and fee guidelines.
2. **Version Tracking**:
   - Each document maintains a semantic version string (e.g., `"2026.1"`). When a new revision is published, historical sign-offs remain recorded against the previous version, while members with target roles are flagged as needing to sign the updated version.
3. **Soft-Warning Enforcement**:
   - In accordance with the user's clarified decision, unacknowledged mandatory policies display a prominent, persistent amber banner across dashboard and event views with a direct link to review and sign in 1 click.
   - Crucially, it does NOT hard-block match selection or event RSVPs, preventing sudden lineup disruptions while maintaining active compliance pressure.
4. **Audit Trail**:
   - Digital sign-offs record `memberProfileId`, `documentId`, `versionSigned`, `signedAt`, and `ipAddress` or session metadata, generating an immutable `AuditLog` entry.

### Rationale
Compliance with Danish sports federation (*DIF/DCF*) requirements mandates that coaches and youth volunteers have clean child-safety documentation (*børneattest*) and understand club conduct rules. The soft-warning banner provides persistent visibility without disrupting club match operations.

### Alternatives Considered
- *Hard Enforcement Gate*: Evaluated and rejected per user clarification to maintain a positive, welcoming volunteer atmosphere and avoid disqualifying players pitch-side due to missing paperwork.

---

## 4. Cross-Module GDPR Article 17 & Article 20 Integration

### Decision
Hook Module 5 data models into existing GDPR services in `src/modules/auth-rbac/`:
1. **Article 17 (Right to Erasure)**:
   - When `executeMemberAnonymization` is called for a member:
     - **Upcoming Volunteer Slots**: Any duty slots assigned to the target member on *upcoming* events (`date >= now()`) are automatically set to `status = OPEN` and `assignedProfileId = null`, and an alert is logged so the squad coach can reassign the slot.
     - **Concluded Historical Duty Slots**: Duty slots on past events retain their service record linked to the member's permanent statistical shell `"Former Member #[HASH]"`, preserving municipal volunteer participation records.
     - **Announcement Comments & Read Receipts**: Scrub personal comments on announcements; read receipts anonymized or deleted.
     - **Document Sign-Offs**: Sign-off audit records remain tied to `"Former Member #[HASH]"` as proof of historical compliance during active membership without retaining personal identifiers.
2. **Article 20 (Data Portability)**:
   - Update `generateGdprExport`:
     - Add `authoredAnnouncements`: title, category, published date.
     - Add `volunteerDutyHistory`: event title, date, duty type, role status.
     - Add `signedDocuments`: document title, category, version signed, signed date.

### Rationale
Preserves statutory club governance records while strictly upholding the member's right to be forgotten under EU GDPR Article 17.
