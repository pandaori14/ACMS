# ACMS — Product Backlog

**Phase**: 6 — Technical Backlog  
**Date**: 2026-06-08  
**Document ID**: ACMS-BACKLOG-001

---

## Epic 1: Shared Foundation & Authentication
**Goal**: Establish system access, security roles, and base infrastructure.

### Features:
- **FEAT-1.1: UMS SSO Integration**
  - *Story*: As a user, I want to log in using my UMS credentials.
  - *AC*: OAuth2 redirect works; JWT token issued; user created if not exists.
- **FEAT-1.2: RBAC Matrix Implementation**
  - *Story*: As a Super Admin, I want to assign roles to users.
  - *AC*: 8 default roles seeded; Middleware blocks unauthorized route access.
- **FEAT-1.3: Audit Trail Engine**
  - *Story*: As a Kaprodi, I want all system actions to be logged immutably.
  - *AC*: Model observers capture CRUD events; async queue writes to `audit_logs`.

## Epic 2: Academic Core
**Goal**: Setup programs, cohorts, and clinical rotation definitions.

### Features:
- **FEAT-2.1: Program & Stase Management**
  - *Story*: As an Admin Prodi, I want to create stase requirements.
  - *AC*: Stase created with duration, prerequisites, and passing grade.
- **FEAT-2.2: Student Enrollment**
  - *Story*: As an Admin Prodi, I want to bulk import a student cohort.
  - *AC*: CSV upload parses NIM, name; generates user accounts; sets status to active.

## Epic 3: Rotation Scheduling (MVP)
**Goal**: Allow manual assignment of students to hospitals.

### Features:
- **FEAT-3.1: Hospital Capacity Configuration**
  - *Story*: As an Admin RS, I want to set max student capacity per stase.
  - *AC*: Admin RS inputs quotas for upcoming periods; system prevents overflow.
- **FEAT-3.2: Manual Rotation Assignment**
  - *Story*: As an Admin Prodi, I want to assign a student to a hospital.
  - *AC*: Drag-and-drop UI; system validates hard constraints (no overlap, no overflow).
- **FEAT-3.3: Swap Requests**
  - *Story*: As a student, I want to request a schedule swap.
  - *AC*: Student selects target; workflow triggers Admin approval; atomic schedule update.

## Epic 4: Clinical Logbook
**Goal**: Digitize student activity tracking.

### Features:
- **FEAT-4.1: Logbook Entry**
  - *Story*: As a student, I want to log a patient case.
  - *AC*: Form captures date, diagnosis, procedure; allows PDF/image upload.
- **FEAT-4.2: Preceptor Sign-off**
  - *Story*: As a Dodiknis, I want to review and approve student logbooks.
  - *AC*: Dashboard shows pending items; single-click approve or reject with comments.

## Epic 5: Assessment & Grading
**Goal**: Digital evaluation forms and grade aggregation.

### Features:
- **FEAT-5.1: Mini-CEX Form**
  - *Story*: As a Dodiknis, I want to assess a student via Mini-CEX.
  - *AC*: Form renders 1-9 scale for 7 competencies; requires narrative feedback.
- **FEAT-5.2: Grade Calculation & Approval**
  - *Story*: As a Kaprodi, I want to approve final stase grades.
  - *AC*: System aggregates Mini-CEX + DOPS; Kaprodi approves; student notified.

---
*Note: Phase 2 and Phase 3 Epics (Examinations, Finance, Analytics) will be fleshed out post-MVP.*
