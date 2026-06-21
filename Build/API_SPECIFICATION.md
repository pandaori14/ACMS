# ACMS — API Specification

**Version**: 2.0  
**Date**: 2026-06-08  
**Status**: Draft  
**Document ID**: ACMS-API-001

---

## 1. Global API Standards

### 1.1 Base URL & Versioning
- **Base URL**: `https://api.acms.ums.ac.id/api/v1`
- **Versioning**: Handled in the URI path (`/v1/`).

### 1.2 Authentication & Authorization
- **Method**: Bearer Token (JWT) provided in `Authorization` header OR via HttpOnly Secure cookies.
- **Tenant Scope**: Tenant context (`program_id`, `hospital_id`) is inferred from the authenticated user's session/token. Cross-tenant access requires Super Admin privileges.

### 1.3 Content Types
- All requests must include: `Accept: application/json`
- POST/PUT requests with bodies must include: `Content-Type: application/json`

### 1.4 Standard Response Envelope

**Success (Collection)**
```json
{
  "data": [ ... ],
  "meta": {
    "pagination": {
      "total": 100,
      "per_page": 20,
      "current_page": 1,
      "last_page": 5
    }
  }
}
```

**Success (Single Item)**
```json
{
  "data": { ... },
  "message": "Resource updated successfully"
}
```

**Error Response** (RFC 7807 Problem Details)
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The provided data is invalid.",
    "details": {
      "end_date": ["End date must be after start date."]
    }
  }
}
```

### 1.5 Pagination, Sorting & Filtering
- **Pagination**: `?page=1&per_page=20`
- **Sorting**: `?sort=created_at&order=desc`
- **Filtering**: `?filter[status]=active&filter[hospital_id]=uuid`

---

## 2. API Endpoints by Domain

### 2.1 Auth Domain

#### `POST /auth/login`
- Redirects to UMS SSO provider (OAuth2/OIDC).

#### `POST /auth/logout`
- Invalidates the current JWT token and session.

#### `GET /auth/me`
- **Response**: Returns the current user profile, active roles, permissions, and tenant scope.

---

### 2.2 Academic Domain

#### `GET /academic/programs`
- **Query**: `?include=faculties`
- **Response**: List of active study programs.

#### `GET /academic/stase`
- **Query**: `?program_id=uuid`
- **Response**: List of clinical departments (stase).

#### `GET /academic/students`
- **Query**: `?cohort_id=uuid&status=active`
- **Response**: Paginated list of students.

#### `POST /academic/students/enroll`
- **Body**: Array of student data (NIM, name, cohort_id).
- **Response**: 201 Created with enrollment results.

---

### 2.3 Rotation Domain

#### `GET /rotations/periods`
- **Query**: `?status=published`
- **Response**: Paginated list of rotation periods.

#### `POST /rotations/periods`
- **Body**: `name`, `start_date`, `end_date`, `stase_ids`.
- **Response**: 201 Created, Returns new `RotationPeriod`.

#### `GET /rotations/assignments`
- **Query**: `?period_id=uuid&student_id=uuid`
- **Response**: List of student rotation assignments.

#### `POST /rotations/assignments/auto-assign`
- **Body**: `period_id`, `cohort_id`
- **Response**: Triggers background scheduling job. Returns `job_id` for polling.

#### `POST /rotations/swaps`
- **Body**: `rotation_assignment_id`, `target_assignment_id`, `reason`
- **Response**: 201 Created, returns `SwapRequest`.

---

### 2.4 Clinical Domain

#### `GET /clinical/logbooks`
- **Query**: `?assignment_id=uuid&status=submitted`
- **Response**: Paginated logbook entries.

#### `POST /clinical/logbooks`
- **Body**: `activity_date`, `activity_type`, `description`, `patient_initials`
- **Response**: 201 Created.

#### `PATCH /clinical/logbooks/{id}/sign-off`
- **Role Requirement**: Dodiknis
- **Body**: `feedback`, `status` (signed/rejected)
- **Response**: 200 OK.

---

### 2.5 Assessment Domain

#### `POST /assessments/mini-cex`
- **Role Requirement**: Dodiknis / Dosen
- **Body**: `student_id`, `assignment_id`, `scores` (JSON), `feedback`
- **Response**: 201 Created.

#### `GET /assessments/grades`
- **Query**: `?student_id=uuid`
- **Response**: List of aggregated stase grades.

#### `POST /assessments/grades/{id}/approve`
- **Role Requirement**: Kaprodi
- **Response**: 200 OK, grade published.

---

### 2.6 Finance Domain

#### `GET /finance/honorariums`
- **Query**: `?period_id=uuid&status=draft`
- **Response**: Calculated honorarium per preceptor.

#### `POST /finance/honorariums/{id}/disburse`
- **Role Requirement**: Finance (after Kaprodi approval)
- **Response**: 200 OK, status updated to disbursed.

---

## 3. HTTP Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET, PUT, PATCH, DELETE |
| 201 | Created | Successful POST creating a resource |
| 202 | Accepted | Async operation queued (e.g., auto-assign) |
| 204 | No Content | Successful DELETE (alternative to 200) |
| 400 | Bad Request | Malformed request body |
| 401 | Unauthorized | Missing or invalid JWT |
| 403 | Forbidden | Valid JWT, but lacking role/permission |
| 404 | Not Found | Resource or route does not exist |
| 409 | Conflict | State conflict (e.g., student double-booked) |
| 422 | Unprocessable Entity | Validation failure |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unhandled backend exception |
