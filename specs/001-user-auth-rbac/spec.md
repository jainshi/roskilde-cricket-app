# Feature Specification: Member Management, Authentication, RBAC & Member Profiles (Phase 1)

**Feature Branch**: `001-user-auth-rbac` (spec directory; no git branch created)

**Created**: 2026-10-24

**Status**: Draft

**Input**: User description: "Specify Phase 1 (Module 1: User Management, Authentication, RBAC &
Member Profiles) based on Section 2, Section 3.1, and Section 4.1 of the RCC SRS. Scope: RBAC with
5 roles and compound assignments plus a centralised permission matrix; admin onboarding with
decoupled member profiles and login accounts (under-13 no credentials, 13+ optional limited
credentials); 6–8 character temporary password and invitation email; mandatory first-login
password reset and self-service forgot-password; up to 2 parents per youth and 1 parent to many
youth; contact fallback to parents; header profile switcher; member directory with full profiles,
privacy toggles and minors hidden by default; GDPR consent, data export and deletion/anonymisation
requests; English default UI ready for Danish."

## Clarifications

### Session 2026-10-24

- Q: Who can create or remove parent-child links? → A: Admins only; Parents manage the linked
  youth's profile, privacy settings, and consent but cannot create or remove links.
- Q: What member details may Ad-Hoc Coaches see? → A: The privacy-respecting directory, plus
  resolved contact details and emergency contacts only for members invited to sessions they
  organise (applies once events exist in Phase 3).
- Q: How should concurrent user sessions and device login policies be managed? → A: Multiple
  concurrent sessions allowed (e.g. phone + laptop), with an explicit 'Sign out everywhere' action.
- Q: What is the exact data lifecycle and retention policy when an Admin approves a GDPR account deletion request? → A: Keep an anonymized shell record indefinitely (retaining player stats and audit references), and purge all personal fields immediately upon approval.
- Q: When a youth player has two linked parents, how should automated notifications be routed? → A: Send notifications to BOTH parents simultaneously.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin onboards a member who activates their account (Priority: P1)

A club Admin creates a member profile for a new adult member (name, email, date of birth, roles)
and chooses to grant login access. The system generates a temporary password and emails the
member an invitation. The member opens the invitation, signs in with the temporary password, is
forced to choose a new password, gives GDPR consent, and only then reaches their dashboard.

**Why this priority**: Nothing else in the application is usable until members can be created and
can sign in securely. This is the minimum viable slice of the platform.

**Independent Test**: An Admin creates a profile with login access; the invited member receives
the email, signs in, is blocked from every page until they set a compliant password and consent,
and then lands on the dashboard.

**Acceptance Scenarios**:

1. **Given** an Admin is signed in, **When** they create a member profile for an adult with a
   unique email and select "grant login access", **Then** the profile is saved, a temporary
   password of 6–8 random letters and digits is generated, and an invitation email containing an
   activation link and the temporary password is sent to that email address.
2. **Given** a member with a temporary password, **When** they sign in for the first time,
   **Then** they are taken directly to a "set new password" screen, and any attempt to open
   another page returns them to that screen.
3. **Given** the member is on the "set new password" screen, **When** they submit a password
   shorter than 8 characters or missing an uppercase letter, lowercase letter, digit, or symbol,
   **Then** the password is rejected with a message stating which rule failed.
4. **Given** the member has set a valid new password, **When** they have not yet given consent,
   **Then** they are shown the club privacy notice and must explicitly consent before reaching
   the dashboard.
5. **Given** an invitation was sent more than 7 days ago and never used, **When** the member tries
   to sign in with the temporary password, **Then** sign-in is refused with a message telling them
   to contact an Admin, and the Admin can resend a fresh invitation.
6. **Given** an Admin creates a profile without selecting "grant login access", **When** the
   profile is saved, **Then** no account, password, or invitation is created.

---

### User Story 2 - Members can only do what their roles allow (Priority: P1)

An Admin assigns one or more roles (Admin, Coach, Ad-Hoc Coach, Player, Parent) to each member.
A member holding several roles (e.g., Parent + Ad-Hoc Coach) gets the combined permissions of all
of them. Any action outside a member's permissions is refused, even if attempted directly.

**Why this priority**: Every later module (inventory, events, team, communications) depends on a
correct, central permission model. Errors here expose children's data.

**Independent Test**: Create members with single and compound roles; verify each can perform the
actions permitted by the permission matrix and is refused for the rest, including via direct
links to restricted pages.

**Acceptance Scenarios**:

1. **Given** a member with only the Player role, **When** they try to open the member-onboarding
   screen (by navigation or a direct link), **Then** access is refused.
2. **Given** a member holding Parent and Ad-Hoc Coach roles, **When** they use the application,
   **Then** they have every permission of both roles as defined in the permission matrix (e.g.,
   they manage their linked youth as a Parent and hold Ad-Hoc Coach permissions such as creating
   ad-hoc training drills once that module ships).
3. **Given** an Admin, **When** they remove the Coach role from a member, **Then** that member
   immediately loses Coach-only capabilities on their next action.
4. **Given** only one member holds the Admin role, **When** someone attempts to remove that role
   or deactivate that account, **Then** the change is refused.
5. **Given** an Admin, **When** they try to assign Admin, Coach, Ad-Hoc Coach, or Parent to a
   member under 18, **Then** the assignment is refused; only Player may be assigned to minors.

---

### User Story 3 - Parents are linked to youth players (Priority: P2)

An Admin creates profiles for youth players and links each youth to up to two parent accounts. A
parent may be linked to several youth. Youth under 13 are managed entirely through their parents
and have no login. Youth aged 13–17 may optionally receive their own login with Player-only
access while remaining linked to their parents. When the club needs to contact a youth who has no
email or phone of their own, the parents' details are used instead.

**Why this priority**: Most RCC youth members are managed by parents; without linkage, parents
cannot act for their children and the club cannot reach them.

**Independent Test**: Create a parent and two youth (age 10 and 15); link both; confirm the
10-year-old cannot be given a login, the 15-year-old can, a third parent link is refused, and
contact resolution for a youth without their own email returns the parents' emails.

**Acceptance Scenarios**:

1. **Given** a youth profile with two linked parents, **When** an Admin tries to link a third
   parent, **Then** the link is refused with a message that the 2-parent limit is reached.
2. **Given** a parent linked to three youth profiles, **When** they view their account, **Then**
   all three youth are listed as linked.
3. **Given** a youth profile with a date of birth showing age 11, **When** an Admin tries to grant
   login access, **Then** the option is unavailable and the system explains that login access
   requires age 13 or over.
4. **Given** a 15-year-old youth with their own email, **When** an Admin grants login access,
   **Then** the youth receives an invitation, has only Player permissions after activation, and
   both linked parents retain full management of the youth's profile.
5. **Given** a youth with no email and no phone and two linked parents, **When** the club sends
   the youth a notification, **Then** it is delivered to both parents' contact details.
6. **Given** a youth with their own phone but no email, **When** contact details are resolved,
   **Then** the youth's own phone is used and the parents' emails are used for email.
7. **Given** a parent who is not linked to a youth, **When** they try to view or edit that
   youth's restricted profile details, **Then** access is refused.

---

### User Story 4 - Parents switch context to manage their children (Priority: P2)

A parent uses a profile switcher in the header (on phone and desktop) to move between their own
context and each linked youth's context, so they can view and update each child's profile without
signing out.

**Why this priority**: Parents with several young cricketers are a large user group; switching
must be quick pitch-side on a phone.

**Independent Test**: Sign in as a parent with two linked youth; switch to each child, edit a
detail, and switch back; verify the active context is always clearly shown and changes are
recorded as made by the parent on behalf of the child.

**Acceptance Scenarios**:

1. **Given** a parent with linked youth, **When** they open the header switcher, **Then** they see
   themselves and each linked youth, and can switch with no more than 2 taps or clicks.
2. **Given** a parent has switched to a child's context, **When** they navigate around the
   application, **Then** the child's name is visibly shown as the active context on every screen
   until they switch back.
3. **Given** a parent acting in a child's context, **When** they update the child's kit size,
   **Then** the change is saved to the child's profile and the audit trail records the parent as
   the actor and the child as the subject.
4. **Given** a member with no linked youth, or a youth signed in with their own login, **When**
   they view the header, **Then** no profile switcher is shown.

---

### User Story 5 - Members maintain profiles and browse a privacy-respecting directory (Priority: P2)

Members (or parents, for linked youth) complete their profile: personal and emergency contact
details, cricket attributes, and kit sizes. They choose which contact details appear in the member
directory. Any member can browse the directory, but sees contact details only where the owner has
allowed it. Minors' contact details are hidden by default and can only be revealed by a linked
parent.

**Why this priority**: The directory and profiles are the core daily-use feature of Phase 1 and
feed squad selection and kit ordering in later phases.

**Independent Test**: Create an adult with phone visible and email hidden, and a minor with
defaults; as a Player, browse the directory and confirm only the adult's phone is shown and no
contact detail of the minor is shown; as a Coach, confirm full member details are visible.

**Acceptance Scenarios**:

1. **Given** a member editing their profile, **When** they select a batting position, bowling
   style, secondary roles, and shirt/trouser/cap sizes from the provided lists, **Then** the
   values are saved and shown on their profile.
2. **Given** a newly created member, **When** their privacy settings are inspected, **Then** email,
   phone, and address are all hidden from the directory by default.
3. **Given** a member under 18, **When** another Player or Parent views them in the directory,
   **Then** no contact details are shown unless a linked parent has enabled them.
4. **Given** a 15-year-old youth signed in with their own login, **When** they try to make their
   own contact details visible, **Then** the change is refused; they may only make settings more
   restrictive.
5. **Given** a Coach or Admin, **When** they view a member's details, **Then** they see contact
   details (using parent fallback for youth without their own), emergency contact, and kit sizes,
   regardless of directory visibility settings.
6. **Given** any member searching the directory, **When** they search by name or filter by role,
   batting position, or bowling style, **Then** matching members are listed.
7. **Given** a viewer not entitled to a hidden detail, **When** the directory is shown to them,
   **Then** the hidden detail is not obtainable by any means, not merely visually concealed.

---

### User Story 6 - Members reset a forgotten password (Priority: P2)

A member who has forgotten their password requests a reset link by email, follows it, and sets a
new password.

**Why this priority**: Without self-service reset, every forgotten password becomes Admin work.

**Independent Test**: Request a reset for an existing and a non-existent email; confirm identical
on-screen responses, a single-use link for the real account, and that the link expires.

**Acceptance Scenarios**:

1. **Given** any email address, **When** a reset is requested, **Then** the same confirmation
   message is shown whether or not an account exists for it.
2. **Given** a member who received a reset link, **When** they use it within 1 hour and set a
   compliant password, **Then** the password is changed, the link stops working, and all their
   other signed-in sessions are ended.
3. **Given** a reset link older than 1 hour or already used, **When** it is opened, **Then** it is
   rejected and the member is offered to request a new one.
4. **Given** a member with an unused temporary password, **When** they complete a forgot-password
   reset, **Then** the mandatory first-login reset is considered satisfied.

---

### User Story 7 - Members exercise GDPR rights (Priority: P3)

A member (or a parent on behalf of a linked youth) downloads a copy of their personal data or
requests deletion of their account. An Admin reviews deletion requests and completes them, after
which personal data is erased or irreversibly anonymised.

**Why this priority**: Legally required before full launch, but used infrequently; consent capture
(the time-critical GDPR element) is already covered in User Story 1.

**Independent Test**: Request an export and confirm it contains all of the member's personal
data; submit a deletion request, have an Admin complete it, and confirm the member can no longer
sign in and their personal data no longer appears anywhere.

**Acceptance Scenarios**:

1. **Given** a signed-in member, **When** they request a data export, **Then** within 10 minutes a
   downloadable file is available to them only, containing their profile, roles, parent-child
   links, privacy settings, consent history, and audit entries about them.
2. **Given** a parent, **When** they request an export for a linked youth, **Then** they receive
   that youth's data on the same terms.
3. **Given** a member submits a deletion request, **When** an Admin completes it, **Then** the
   member's login is revoked, their personal data is erased or irreversibly anonymised, their
   parent-child links are removed, and the requester is notified.
4. **Given** one parent requests deletion of a linked youth's profile, **When** the request is
   submitted, **Then** the other linked parent (if any) is notified.
5. **Given** a parent is deleted and a linked youth is left with no linked parent, **When** the
   deletion completes, **Then** Admins are alerted to resolve the youth's guardianship.

---

### Edge Cases

- A youth turns 13: the profile becomes eligible for login access; nothing changes automatically
  until an Admin grants it.
- A youth turns 18: minor-only restrictions (forced-hidden contacts, Player-only roles, inability
  to loosen own privacy) stop applying, but existing privacy settings are kept and nothing becomes
  visible automatically; parent links remain until an Admin removes them.
- A youth's date of birth is corrected so they are now under 13 while holding a login: the login
  is deactivated and an Admin is notified.
- Two members try to use the same email for login: refused; each login account needs a unique
  email. A parent and child may share a contact email only if the child has no login.
- A youth has neither own contact details nor any linked parent: contact resolution returns
  nothing and the profile is flagged to Admins as unreachable.
- A parent's contact details are hidden in the directory: fallback must not reveal them to a
  viewer who could not otherwise see them.
- Admin resends an invitation: the previous temporary password and activation link stop working.
- Repeated failed sign-ins: after 5 consecutive failures the account is locked for 15 minutes.
- Many reset requests for one email: requests are rate-limited; responses remain identical.
- A minor's profile exists but no parent has yet consented: the profile is visible only to Admins
  and excluded from the directory and all other views.
- The club privacy notice is updated: members (and parents for linked youth) must consent again
  at next sign-in.
- A parent who also holds the Coach role switches into a child's context: actions in that context
  are limited to what the parent may do on the child's behalf.
- An Admin deactivates an account: the member cannot sign in, existing sessions end, and the
  profile and links remain.

## Requirements *(mandatory)*

### Functional Requirements

#### Roles & Permissions

- **FR-001**: System MUST support exactly five roles: Admin, Coach, Ad-Hoc Coach, Player, Parent.
- **FR-002**: A member MUST be able to hold any combination of roles; their effective permissions
  MUST be the union of all held roles.
- **FR-003**: Only Admins MUST be able to assign or revoke roles. Role changes MUST take effect on
  the member's next action without requiring them to sign out.
- **FR-004**: Members under 18 MUST only be assignable the Player role.
- **FR-005**: System MUST always retain at least one active Admin; removing the last Admin role or
  deactivating the last Admin account MUST be refused.
- **FR-006**: System MUST maintain a single central permission matrix covering every action below.
  Restricted actions MUST be refused when attempted directly, not merely hidden from navigation.
  Permissions for modules delivered in later phases are defined now and enforced when those
  modules ship.

  | Action | Admin | Coach | Ad-Hoc Coach | Player | Parent |
  | :--- | :---: | :---: | :---: | :---: | :---: |
  | User onboarding & management | Full | View members | View members | View directory | View directory |
  | Parent-child linkage management | Full | Read-only | Read-only | Read-only | Manage linked youth's data; no link changes (FR-031) |
  | Inventory master catalog edit | Full | Read-only | Read-only | No access | No access |
  | Equipment checkout / check-in | Full | Full | Read-only | Self | Self / linked children |
  | Create official fixtures & events | Full | Full | No access | No access | No access |
  | Create ad-hoc training drills | Full | Full | Full | No access | No access |
  | RSVP / attendance check-in | Full / check-in | Full / check-in | Full / check-in | RSVP (self) | RSVP (linked children) |
  | Squad selection & lineup publishing | Full | Full | View only | View lineup | View lineup |
  | Match scoring & performance entry | Full | Full | View only | View stats | View stats |
  | Broadcast noticeboard announcements | Full | Full | No access | No access | No access |

- **FR-007**: Permissions scoped to "Self" or "Linked children" MUST be checked against the
  specific member being acted upon, not only against the actor's role.

#### Onboarding & Credentials

- **FR-010**: Only Admins MUST be able to create member profiles; there is no public
  self-registration.
- **FR-011**: A member profile MUST be able to exist without a login account. Granting login
  access MUST be an optional, separate Admin action available at creation or later.
- **FR-012**: Login access MUST only be grantable to members aged 13 or over, determined from the
  stored date of birth. Date of birth MUST be required for every profile holding the Player role;
  profiles without the Player role and without a date of birth are treated as adults.
- **FR-013**: Each login account MUST be identified by a unique email address belonging to that
  member. A youth without their own email address cannot be granted login access.
- **FR-014**: When login access is granted, System MUST generate an unpredictable temporary
  password of 6–8 letters and digits. Temporary passwords MUST never be shown in logs or stored in
  readable form.
- **FR-015**: System MUST email an invitation containing an activation link and the temporary
  password through the club's configured notification channel.
- **FR-016**: Temporary passwords and activation links MUST expire after 7 days. Admins MUST be
  able to resend an invitation, which generates a new temporary password and invalidates the
  previous one.
- **FR-017**: A member signing in with a temporary password MUST be required to set a new password
  before accessing any other part of the application; only setting a password and signing out are
  permitted until then.
- **FR-018**: Passwords MUST have at least 8 characters and include an uppercase letter, a
  lowercase letter, a digit, and a symbol, and MUST differ from the temporary password.
- **FR-019**: Members MUST be able to request a password reset by email. The on-screen response
  MUST be identical whether or not the email belongs to an account. Reset links MUST be single-use
  and expire after 1 hour. A successful reset MUST end all of the member's other sessions across all
  devices, invalidate other outstanding reset links, and satisfy any pending mandatory first-login reset.
- **FR-020**: After 5 consecutive failed sign-in attempts, the account MUST be locked for 15
  minutes. Password reset requests MUST be rate-limited.
- **FR-021**: System MUST support multiple concurrent active sessions per user account (e.g. phone
  and laptop). Users MUST have an explicit "Sign out everywhere" action that revokes all active
  sessions. Admins MUST be able to deactivate and reactivate a login account without deleting
  the member profile; deactivation MUST immediately terminate all active sessions across all devices.

#### Parent-Child Association & Contact Resolution

- **FR-030**: System MUST link Parent-role members to youth Player profiles. A parent MAY be linked
  to any number of youth; a player MUST have 0..2 linked parents:
  - **Adult / Senior Players** (age ≥ 18) MUST have `0` linked parents and manage their own profile and credentials independently.
  - **Youth / Minor Players** (age < 18) MAY be linked to `1..2` parents (strictly capped at 2 parents per youth).
  A duplicate link or a third parent link MUST be refused with an explanatory message.
- **FR-031**: Parent-child links MUST be created and removed only by Admins. Parents MUST NOT be
  able to create, claim, or remove links; they manage linked youth data as described in FR-032.
- **FR-032**: Linked parents MUST be able to view and edit their linked youth's profile details,
  privacy settings, and consent. Parents MUST NOT be able to access restricted details of youth
  they are not linked to.
- **FR-033**: A youth aged 13–17 with their own login MUST remain linked to their parents, and the
  parents MUST retain all management rights. The youth MUST be limited to Player permissions; they
  MAY edit their own cricket attributes, kit sizes, and own contact details, MAY make their
  privacy settings more restrictive, and MUST NOT loosen privacy settings or change consent.
- **FR-034**: System MUST resolve a player's email and phone separately, each by using the player's
  own value if present and otherwise the values of all linked parents. For notifications dispatched
  via fallback, System MUST deliver notifications to BOTH linked parents simultaneously. This
  resolution MUST be used for all notifications and for every view entitled to see contact details.
- **FR-035**: Contact details obtained through parent fallback MUST be labelled as belonging to
  the parent and MUST respect the viewer's entitlements and the parent's privacy settings. Fallback
  MUST reflect the parents' current details at the time of use.
- **FR-036**: Any action performed by a parent on behalf of a linked youth MUST be recorded with
  both the acting parent and the youth.

#### Profile Switcher

- **FR-040**: Members linked as a parent to at least one youth MUST see a profile switcher in the
  header on both phone and desktop layouts, listing themselves and each linked youth.
- **FR-041**: Switching context MUST take no more than 2 taps or clicks, require no re-entry of
  credentials, and persist while navigating until the parent switches again or signs out.
- **FR-042**: The active context MUST be clearly shown on every screen while a parent is acting
  as a youth.
- **FR-043**: While in a youth's context, a parent MUST only be able to perform actions they are
  entitled to perform on that youth's behalf; their own other roles do not apply to actions taken
  as the youth.
- **FR-044**: Members without linked youth, and youth signed in with their own login, MUST NOT see
  a profile switcher.

#### Member Profiles & Directory

- **FR-050**: Member profiles MUST capture: full name; date of birth; email; phone; postal
  address; emergency contact (name, relationship, phone); preferred batting position (Opening
  Batter, Top-Order, Middle-Order, Finisher, Tailender); bowling style (Right-Arm Fast, Right-Arm
  Medium, Left-Arm Fast, Left-Arm Medium, Off-Spin, Leg-Spin, Left-Arm Orthodox, Left-Arm
  Wrist-Spin, Does not bowl); secondary roles (Wicketkeeper, All-Rounder; multiple allowed); and
  shirt, trouser, and cap sizes chosen from predefined youth and adult size lists.
- **FR-051**: Members MUST be able to edit their own profile, parents MUST be able to edit linked
  youth profiles, and Admins MUST be able to edit any profile.
- **FR-052**: Profiles holding the Player role without an emergency contact MUST be flagged as
  incomplete, and the member (or linked parent) MUST be prompted to complete it after sign-in.
- **FR-053**: All signed-in members MUST be able to browse a member directory, search by name, and
  filter by role, batting position, and bowling style.
- **FR-054**: The general directory MUST always show name, roles, and cricket attributes. Email,
  phone, and address MUST each be shown only if the owner has enabled that field. Emergency
  contact, date of birth, and kit sizes MUST never appear in the general directory.
- **FR-055**: Each member MUST have separate visibility settings for email, phone, and address,
  all hidden by default.
- **FR-056**: For members under 18, contact details MUST be hidden by default and only a linked
  parent or an Admin MUST be able to make them visible.
- **FR-057**: Admins and Coaches MUST be able to view every member's full details, including
  resolved contact details, emergency contact, and kit sizes, regardless of directory settings.
- **FR-058**: Ad-Hoc Coaches MUST see the general directory on the same terms as Players and
  Parents. In addition, for members invited to a session the Ad-Hoc Coach organises, they MUST be
  able to see resolved contact details and emergency contacts, for as long as that session is
  upcoming or in progress. Until sessions exist (Phase 3), Ad-Hoc Coaches have directory access
  only.
- **FR-059**: Details a viewer is not entitled to see MUST NOT be obtainable by that viewer by any
  means, not merely visually hidden.

#### GDPR & Consent

- **FR-070**: System MUST capture explicit consent to the club privacy notice before granting
  access to the application. Adults consent for themselves; consent for a minor MUST be given by a
  linked parent. Each consent record MUST store who consented, for whom, when, and which version
  of the privacy notice.
- **FR-071**: A minor's profile without parental consent MUST be visible only to Admins and
  excluded from the directory and all other views until consent is given.
- **FR-072**: When the privacy notice version changes, members (and parents, for linked youth)
  MUST be asked to consent again at their next sign-in before continuing.
- **FR-073**: Members MUST be able to request a downloadable export of their personal data, and
  parents for linked youth. The export MUST include profile, roles, parent-child links, privacy
  settings, consent history, and audit entries about the member, in both machine-readable and
  human-readable form, available only to the requester and for 7 days.
- **FR-074**: Members MUST be able to request deletion of their account, and parents for linked
  youth. Withdrawing consent MUST be handled as a deletion request. Admins MUST be able to review
  and complete deletion requests; upon Admin approval, System MUST immediately purge all personal
  identifiable data (name, email, phone, physical address, emergency contact, date of birth) and
  revoke login credentials, while retaining an anonymised shell record indefinitely (e.g. "Former Member
  #123") to preserve historical cricket match statistics and immutable audit references. Parent-child
  linkages MUST be severed, and the requester notified upon completion.
- **FR-075**: When one parent requests deletion of a linked youth, the other linked parent MUST be
  notified. When a deletion leaves a youth with no linked parent, Admins MUST be alerted.

#### Audit

- **FR-080**: System MUST keep a tamper-proof audit trail, viewable by Admins, of: profile
  creation; login access granted, resent, deactivated, or reactivated; role changes; parent-child
  link changes; changes to a minor's privacy settings; consent given or withdrawn; export and
  deletion requests and completions; Admin edits to other members' profiles; and changes made by
  parents in a youth's context.

#### Language & Formatting

- **FR-090**: The interface and all system emails MUST be in English by default. All user-facing
  text MUST come from translatable resources so that Danish can be added without changing
  screens. Dates and numbers MUST be formatted according to the active language, and times shown
  in Copenhagen local time.

### Key Entities *(include if feature involves data)*

- **Member Profile**: A person known to the club. Holds personal, emergency, cricket, and kit
  details, date of birth, roles, and privacy settings. May exist without a login account.
- **Login Account**: The sign-in identity for one member profile: unique email, password status
  (temporary, active), activation state, lockout state. At most one per profile.
- **Role Assignment**: Links a member profile to one of the five roles; a profile can have
  several.
- **Parent-Child Link**: Connects a Parent-role profile to a youth Player profile. At most 2 per
  youth; unlimited per parent.
- **Emergency Contact**: Name, relationship, and phone of the person to call in an emergency,
  belonging to a member profile.
- **Privacy Settings**: Per-field directory visibility (email, phone, address) for a member
  profile, with minor-specific rules on who may change them.
- **Consent Record**: Who consented, on whose behalf, when, and for which privacy-notice version.
- **Invitation**: Temporary credential and activation link issued to a login account, with expiry
  and used/invalidated status.
- **Password Reset Request**: Single-use, time-limited reset link issued for a login account.
- **Data Export Request**: A member's or parent's request for a personal data copy, with status
  and expiry of the download.
- **Deletion Request**: A request to erase or anonymise a member's data, with requester, status,
  reviewing Admin, and completion date.
- **Audit Record**: An unchangeable entry of who did what, to whom, and when.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An Admin can create a member profile with login access and send the invitation in
  under 3 minutes.
- **SC-002**: 95% of invitation and reset emails arrive within 5 minutes of being triggered.
- **SC-003**: 100% of first sign-ins with a temporary password are forced through password change
  and consent before any other screen is reachable.
- **SC-004**: A newly invited member completes activation (sign-in, new password, consent) in
  under 3 minutes, and at least 90% do so without contacting an Admin.
- **SC-005**: In verification across every role and role combination, no hidden contact detail of
  any member (and no contact detail of a minor without parental opt-in) is obtainable by an
  unauthorised viewer.
- **SC-006**: A parent can switch between their own and a linked child's context in at most 2
  taps and under 2 seconds on a phone.
- **SC-007**: Directory search returns results in under 1 second for a club of up to 500 members.
- **SC-008**: Phase 1 screens finish loading in under 1.5 seconds on a typical 4G phone
  connection.
- **SC-009**: A member can complete a forgotten-password reset in under 3 minutes.
- **SC-010**: Data exports are available within 10 minutes; 100% of deletion requests are
  completed within 30 days.
- **SC-011**: A complete Danish translation can be introduced without modifying any screen.

## Assumptions

- Club size is up to roughly 500 member profiles and a few hundred login accounts.
- "Minor" means under 18; login eligibility starts at 13 (Danish digital age of consent).
- Parent-child links follow the constitution v1.1.0 model (up to 2 parents per youth), which
  supersedes the one-to-many wording in SRS §3.1.4; the SRS is to be amended accordingly.
- Directory contact visibility is opt-in (hidden by default) for adults as well as minors, per
  GDPR privacy-by-default.
- Emergency contacts are visible only to Admins, Coaches, the member, linked parents, and (from
  Phase 3) Ad-Hoc Coaches for invitees of their own sessions.
- Ad-Hoc Coach session-scoped access ends when the session is over; the precise window is to be
  confirmed in the Phase 3 events specification.
- Phase 1 has a single core consent (to the club privacy notice); directory visibility is handled
  by privacy settings, not separate consents.
- Invitations and resets are sent by email only in Phase 1; SMS/push delivery comes in Phase 5
  through the same notification capability.
- Sign-in is by email and password; single sign-on, social login, and multi-factor
  authentication are out of scope for Phase 1.
- Age categories (U11, U13, etc.), teams, and squads are assigned in later phases.
- Danish translations are not delivered in Phase 1; only translation readiness is required, so no
  language switcher is shown until Danish text exists.
- Profile photos are out of scope for Phase 1.
- An email delivery provider is available and configured for the club.
