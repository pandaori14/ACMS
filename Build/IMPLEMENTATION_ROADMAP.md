# ACMS — Implementation Roadmap

**Phase**: 5 — Implementation Planning  
**Date**: 2026-06-08  
**Document ID**: ACMS-ROADMAP-001

---

## 1. Project Timeline & Delivery Phasing

The implementation is structured into 3 distinct phases to ensure continuous delivery of value. The total estimated timeline for MVP is **6 Months**.

### 1.1 Phase 1: Foundation & MVP (Months 1–3)
**Goal**: Core infrastructure, authentication, academic data setup, and basic clinical rotation scheduling.

| Sprint | Focus Area | Deliverables |
|--------|------------|--------------|
| Sprint 1 | Infrastructure & Core | Docker setup, CI/CD pipeline, Base Laravel & Next.js scaffolding, DB Migrations for Users/Roles |
| Sprint 2 | Auth & Academic | UMS SSO Integration, Spatie RBAC, Program/Faculty/Stase CRUD |
| Sprint 3 | Enrollment | Student/Cohort import, Hospital Capacity management |
| Sprint 4 | Rotation Engine (Core) | Rotation Periods, Manual drag-and-drop scheduling, Schedule Conflict detection |
| Sprint 5 | Clinical Foundation | Logbook schemas, File upload via MinIO, Procedure catalogs |
| Sprint 6 | MVP Release | UAT, Bug fixing, Deployment to Staging |

### 1.2 Phase 2: Assessment & Automation (Months 4–6)
**Goal**: Digital assessments, automated scheduling, and advanced workflows.

| Sprint | Focus Area | Deliverables |
|--------|------------|--------------|
| Sprint 7 | Rotation Engine (Advanced)| Auto-assign algorithm (CSP), Swap requests |
| Sprint 8 | Assessments | Mini-CEX, DOPS, CBD forms and scoring |
| Sprint 9 | Grade Approval | Approval workflows, Grade calculation engine |
| Sprint 10| Dashboards | Role-specific dashboards (Kaprodi, Dodiknis, Student) |
| Sprint 11| Notifications | Email/In-app notification system, Audit trail query UI |
| Sprint 12| Phase 2 Release | Production deployment, User Training |

### 1.3 Phase 3: Enterprise & Finance (Months 7–9)
**Goal**: Financial operations, examinations, analytics, and external integrations.

| Sprint | Focus Area | Deliverables |
|--------|------------|--------------|
| Sprint 13| Examinations | OSCE scheduling and scoring, UKMPPD tracking |
| Sprint 14| Finance | Student billing, Preceptor honorarium calculation |
| Sprint 15| Analytics | Advanced reporting, LAM-PTKes export formats |
| Sprint 16| Integrations | SIA/SIAKAD data sync, PDDIKTI batch export |

---

## 2. Resource Requirements

| Role | Count | Allocation |
|------|-------|------------|
| Lead Backend Engineer | 1 | 100% |
| Backend Developer | 1 | 100% |
| Lead Frontend Engineer | 1 | 100% |
| Frontend / UI/UX | 1 | 100% |
| DevOps / Infrastructure | 1 | 50% |
| QA Engineer | 1 | 100% |
| Product Owner | 1 | 50% (UMS Rep) |

---

## 3. Critical Dependencies

1. **UMS IT Infrastructure**: Production servers (Linux/Docker) must be provisioned by Month 2.
2. **SSO Integration**: OIDC credentials from UMS IT required by Sprint 2.
3. **Domain Experts**: Availability of Kaprodi and Admin Prodi for User Acceptance Testing (UAT) at the end of every sprint.
4. **Historical Data**: Existing student records and hospital capacities must be provided in CSV format by Sprint 3 for seeding.

---

## 4. Risk Mitigation Strategy

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Auto-schedule algorithm is too slow | Medium | High | Implement manual drag-and-drop first (Sprint 4); optimize auto-algorithm in background. |
| Dodiknis low digital adoption | High | High | Mobile-first, simplified PWA UI for Dodiknis. Single-click approvals. |
| Scope creep in assessment forms | High | Medium | Lock assessment templates to KKI/SNPK standards. Custom forms deferred to Phase 3. |
