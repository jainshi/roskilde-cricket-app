# Roskilde Cricket Club (RCC) – Members-Only Web Application
## Software Requirements Specification (SRS) & Functional Feature Document

**Document Version:** 1.0.0  
**Status:** Approved Specification  
**Target Audience:** Development Team, RCC Committee, Club Coaches & Administrators  
**Platform:** Responsive Web Application (Mobile-First & Desktop)  

---

## 1. Executive Summary & System Overview

The **Roskilde Cricket Club (RCC) Members-Only Web Application** is a specialized club management and engagement platform designed to streamline administrative workflows, simplify inventory logistics, facilitate training and match participation, track player growth, and provide clear communication channels across players, parents, coaches, and club administration.

### 1.1 Key Objectives
- **Centralized Member Operations:** Unified user directory with strict role-based access control (RBAC) and parent-child profile associations.
- **Equipment Accountability:** End-to-end tracking of club assets (bats, protective gear, training equipment, bowling machines).
- **Flexible Event & Training Coordination:** Support for both official club fixtures and parent-led ad-hoc training sessions.
- **Player Development & Match Records:** Integrated fixture scheduling, squad selection workflows, and individual cricket performance tracking.
- **Targeted Communications:** Multi-channel broadcast alerts, automated system triggers, and weather/ground updates.

---

## 2. User Roles & Permission Matrix (RBAC)

The system enforces granular Role-Based Access Control across five distinct user roles:

| Feature / Action | Admin | Coach | Ad-Hoc Coach | Player | Parent |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **User Onboarding & Management** | Full | View Members | View Members | View Directory* | View Directory* |
| **Parent-Child Linkage Management** | Full | Read-Only | Read-Only | Read-Only | Self-Manage Linked Youth |
| **Inventory Master Catalog Edit** | Full | Read-Only | Read-Only | No Access | No Access |
| **Equipment Checkout / Check-in** | Full | Full | Read-Only | Self (My Gear) | Self / Linked Children |
| **Create Official Fixtures & Events**| Full | Full | No Access | No Access | No Access |
| **Create Ad-Hoc Training Drills** | Full | Full | Full | No Access | No Access |
| **RSVP to Events / Attendance Check**| Full / Check-in | Full / Check-in | Full / Check-in | RSVP (Self) | RSVP (Linked Children) |
| **Squad Selection & Lineup Publishing**| Full | Full | View Only | View Lineup | View Lineup |
| **Match Scoring & Performance Entry**| Full | Full | View Only | View Stats | View Stats |
| **Broadcast Noticeboard Announcements**| Full | Full | No Access | No Access | No Access |

*\* Note: Directory visibility for players/parents respects privacy toggles (e.g., hidden contact details).*

---

## 3. Functional Modules & System Features

### 3.1 Module 1: User Management, Authentication & Security

#### 3.1.1 Role-Based Access Control (RBAC)
- Multi-role assignments supporting compound responsibilities (e.g., a member can be both a *Parent* and an *Ad-Hoc Coach*).
- System-wide authorization guards ensuring restricted actions are only accessible by authorized roles.

#### 3.1.2 Automated Credential Generation & Onboarding
- System generates a temporary, cryptographically secure 6–8 character alphanumeric password upon user account creation by Admin.
- Automated invitation email dispatched containing activation link and temporary credentials.

#### 3.1.3 Onboarding Security & Password Lifecycle
- **Mandatory Password Reset:** Enforced upon initial login before any application dashboard features can be accessed.
- Password complexity requirements (minimum 8 characters, mix of uppercase, lowercase, numbers, and symbols).
- Self-service "Forgot Password" / secure tokenized password reset workflows.

#### 3.1.4 Parent-Child Account Association
- One-to-many linkage between a single Parent account and multiple youth Player profiles.
- Dual-action delegation: Parents can submit event RSVPs, sign consent forms, and borrow club equipment on behalf of linked youth players.
- Seamless profile switching on mobile and desktop headers for parents managing multiple young cricketers.

#### 3.1.5 Member Directory & Comprehensive Profiles
- **Personal & Contact Info:** Full name, phone number, email address, physical address, and emergency contact details (Name, Relationship, Phone).
- **Cricket Attributes:**
  - Preferred Batting Position (e.g., Opening Batter, Top-Order, Middle-Order, Finisher, Tailender).
  - Bowling Style (e.g., Right-Arm Fast, Left-Arm Medium, Off-Spin, Leg-Spin, Orthodox).
  - Secondary Roles (e.g., Wicketkeeper, All-Rounder).
- **Apparel & Kit Details:** Official club shirt, trouser, and cap sizes.
- **Privacy Settings:** Granular opt-in/opt-out toggles for sharing contact info in the public members directory.

---

### 3.2 Module 2: Club Inventory & Equipment Management

#### 3.2.1 Equipment Master Catalog
- Centralized, searchable repository of all club assets.
- Data points per item:
  - Asset Tag / Unique Serial Number.
  - Item Name & Brand / Model.
  - Category taxonomy: *Bats*, *Batting Pads*, *Wicketkeeping Pads/Gloves*, *Helmets*, *Match/Practice Balls*, *Practice Nets*, *Bowling Machines*, *Stumps & Accessories*.
  - Physical Storage Location (e.g., Main Clubhouse Shed, Container 2, Indoor Sports Hall).
  - Acquisition Date, Purchase Price, and Warranty details.

#### 3.2.2 Real-Time Inventory Status Tracking
- Granular asset state machine:
  - `AVAILABLE`: Ready for immediate checkout.
  - `ON_LOAN`: Checked out to an active member.
  - `UNDER_MAINTENANCE`: Marked for repair, safety inspection, or refurbishment.
  - `RETIRED`: Decommissioned or written off.
- Filterable inventory view with export capabilities (CSV/PDF) for annual club audits.

#### 3.2.3 Equipment Checkout & Return System
- **Checkout Authorization:** Initiated and approved by Admins or Coaches.
- **Transaction Logging:** Captures Borrower ID (Player/Parent), Approver ID (Coach/Admin), Checkout Timestamp, and Expected Return Date.
- **Return Processing:** Captures Actual Return Timestamp, Receiving Official, and Return Condition Notes (e.g., Minor wear, Handle cracked, Good condition).
- Automated condition flagging for damaged or heavily worn gear requiring maintenance review.

#### 3.2.4 Personal Borrowing History ("My Gear")
- Dedicated dashboard view for Players and Parents displaying:
  - Current active loans with remaining loan duration and return deadlines.
  - Historical checkout/return logs with past condition notes.
  - Option to request return extensions (subject to Coach/Admin approval).

---

### 3.3 Module 3: Events, Matches & Ad-Hoc Training Sessions

#### 3.3.1 Dual-Engine Event Creation
- **Official Events (Admin & Coach only):**
  - League Matches, Friendly Matches, Cup Tournaments.
  - Regular Weekly Training Sessions & Net Practices.
  - Annual General Meetings (AGM) and Club Social Gatherings.
- **Ad-Hoc Training Sessions (Designated Ad-Hoc Coach Parents):**
  - Informal weekend net practice, fitness drills, or small-group fielding sessions.
  - Capability for registered Ad-Hoc Coaches to quickly create sessions, book net slots, and invite peer members.

#### 3.3.2 Targeted Audience Invitations
- Segmentation filters when publishing an event:
  - By Age Category (e.g., U11, U13, U15, U17, Senior 1st XI, Senior 2nd XI, Social XI).
  - By Specific Squad or Team Roster.
  - Custom multi-select member list.
- Option to mark events as *Open to All Members* or *Restricted Invite Only*.

#### 3.3.3 RSVP & Real-Time Attendance Tracking
- **One-Click RSVP:** `Going`, `Not Going`, and `Tentative` with optional notes (e.g., "Arriving 15 mins late").
- **Organizer Dashboard:**
  - Real-time RSVP counters, breakdown graphs, and guest list export.
  - Instant list of non-respondents with quick "Send RSVP Reminder" action.
- **On-Field Live Check-In:**
  - Mobile-optimized attendance roster allowing coaches to check off attendees physically present at the ground.
  - Historical attendance logs feeding into player commitment analytics.

---

### 3.4 Module 4: Team Management, Fixtures & Statistics

#### 3.4.1 Squad Selection & Lineup Publishing
- Match lineup builder for Coaches and Team Captains.
- Visual batting order arrangement and designated fielding/bowling assignments (Captain, Vice-Captain, Wicketkeeper, 12th Man).
- Integration with RSVP status: visual indicators showing player availability before squad selection.
- One-click squad publication triggering immediate alert notifications to selected players/parents.

#### 3.4.2 Fixture Calendar & Ground Navigation
- Interactive calendar view (Month, Week, Agenda) covering matches, training, and club socials.
- Match cards detailing opponent, venue, toss time, start time, dress code (Whites vs. Colored kit), and match format (T20, 40-overs, 50-overs).
- One-tap navigation integration linking directly to Google Maps / Apple Maps for away grounds across Denmark.

#### 3.4.3 Performance & Match Data Entry
- Post-match scorecard data entry:
  - **Batting:** Runs scored, balls faced, 4s, 6s, dismissal method (Bowled, Caught, LBW, Run Out, Not Out), strike rate.
  - **Bowling:** Overs bowled, maidens, runs conceded, wickets taken, economy rate, extras.
  - **Fielding:** Catches taken, stumpings, run-outs assisted/direct.
  - **Match Outcome:** Team scores, result (Win, Loss, Draw, Abandoned due to rain), Player of the Match.

#### 3.4.4 Player Statistics Engine
- Automated aggregation of individual and club statistics:
  - **Batting:** Total runs, batting average, highest score, strike rate, 50s, 100s.
  - **Bowling:** Total wickets, bowling average, best bowling figures (BBI), 5-wicket hauls, economy rate.
  - **Career & Season Breakdown:** View performance segmented by cricket season, tournament, or format.
  - Visual achievement badges and milestone counters (e.g., 500 Club Runs, 50 Wickets).

---

### 3.5 Module 5: Communication, Announcements & Notifications

#### 3.5.1 Club Noticeboard & Digital Broadcast
- Centralized bulletin board on the home dashboard for official announcements.
- Categorized channels: *General News*, *Ground & Weather Alerts*, *Tournaments*, *Social Events*.
- Urgent banner broadcast system for sudden ground closures, pitch inspections, or weather-affected training cancellations.

#### 3.5.2 Multi-Channel Notification Engine
- **Delivery Channels:** In-app notification bell center, automated transactional emails, and optional SMS/push hooks.
- **Triggered Notification Workflows:**
  - *New Event Invitations & Schedule Updates.*
  - *Squad Selection Announcements.*
  - *Equipment Overdue Warnings (Automated 24h before and daily after due date).*
  - *Emergency Weather & Ground Closure Alerts.*

---

## 4. Technical Architecture & Non-Functional Requirements

### 4.1 Security & Compliance
- **Authentication:** Token-based authentication (JWT / Secure Sessions) with HTTPS enforcement.
- **Data Privacy & GDPR:**
  - Explicit consent handling during onboarding.
  - Right to access and right to be forgotten data export/deletion workflows.
  - Youth player protection: contact details of minors hidden by default from general directory.

### 4.2 Performance & Responsiveness
- Target initial page load time under 1.5 seconds on standard 4G mobile networks.
- Mobile-first responsive UI tailored for pitch-side smartphone operation by coaches and parents.
- Offline-resilient attendance check-in cache for areas with spotty ground connectivity.

---

## 5. Summary & Implementation Roadmap

| Phase | Core Deliverables | Target Milestone |
| :--- | :--- | :--- |
| **Phase 1: Foundation** | RBAC, User Onboarding, Profile Directory, Password Reset Workflows | Month 1 |
| **Phase 2: Operations** | Inventory Catalog, Equipment Checkout/Return, "My Gear" Tab | Month 2 |
| **Phase 3: Scheduling** | Event Engine (Official & Ad-Hoc), RSVPs, Attendance Check-In | Month 3 |
| **Phase 4: Match Hub** | Squad Selection, Fixtures, Scorecard Entry, Player Statistics Engine | Month 4 |
| **Phase 5: Comms & Launch** | Noticeboard, Multi-Channel Notifications, Field Testing & Full Rollout | Month 5 |

---
*Document produced for Roskilde Cricket Club (RCC). All rights reserved.*
