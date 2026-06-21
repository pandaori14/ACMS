# ACMS — Analytics & Reporting Specification

**Version**: 2.0  
**Date**: 2026-06-08  
**Status**: Draft  
**Document ID**: ACMS-ANALYTICS-001

---

## 1. Overview
The ACMS Analytics Engine transforms operational data into actionable insights, providing role-specific dashboards to monitor academic performance, clinical compliance, and institutional efficiency.

## 2. KPI Definitions

### 2.1 Academic KPIs (Kaprodi, Admin Prodi)
- **Rotation Completion Rate**: Percentage of students completing assigned stase on time.
- **UKMPPD Readiness Score**: Aggregate prediction of passing the national exam based on Mini-CEX, DOPS, and OSCE scores.
- **At-Risk Index**: Number of students flagged for failing grades, incomplete logbooks, or absenteeism.

### 2.2 Operational KPIs (Admin RS, Admin Prodi)
- **Hospital Utilization Rate**: Ratio of filled student slots vs. total hospital capacity per period.
- **Schedule Conflict Rate**: Percentage of assignment overlapping errors during scheduling.
- **Preceptor Workload**: Average number of students supervised per Dodiknis per period.

### 2.3 Financial KPIs (Finance)
- **Honorarium Disbursement Timeliness**: Average days from period end to honorarium payout.
- **Outstanding Billing Rate**: Percentage of unpaid student invoices past due date.

## 3. Role-Specific Dashboards

### 3.1 Kaprodi Dashboard
- **Focus**: Strategic oversight and accreditation.
- **Widgets**:
  - Cohort UKMPPD Readiness Gauge.
  - At-Risk Student Roster (Critical Alerts).
  - Stase Average Score Distribution (Bar Chart).

### 3.2 Dodiknis Dashboard
- **Focus**: Daily clinical tasks.
- **Widgets**:
  - Pending Assessments Queue (Actionable list).
  - Unsigned Logbook Entries.
  - Current Assigned Students Roster.

### 3.3 Mahasiswa Dashboard
- **Focus**: Personal progression.
- **Widgets**:
  - Stase Progress Tracker (% complete based on logbook and assessments).
  - Upcoming Schedule (Timeline).
  - Competency Attainment Radar Chart.

## 4. Report Generation

### 4.1 Required Reports
| Report Name | Output | Access | Frequency |
|-------------|--------|--------|-----------|
| LAM-PTKes Accreditation Data | PDF, Excel | Kaprodi | On-Demand |
| Student Transcript & Progress | PDF | Kaprodi, Admin Prodi | On-Demand |
| Hospital Utilization Report | PDF | Admin RS, Admin Prodi | End of Period |
| Honorarium Recapitulation | Excel | Finance | Monthly |

### 4.2 Data Architecture for Analytics
- Heavy analytical queries MUST run against a **Read Replica** PostgreSQL instance or utilize **Materialized Views** to prevent degradation of the transactional database.
- Dashboard metric caches are updated every 15 minutes via Redis.
