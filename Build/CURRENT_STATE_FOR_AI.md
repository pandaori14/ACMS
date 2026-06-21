# [CRITICAL] AI CONTEXT SYNCHRONIZATION FILE

**ATTENTION ALL AI AGENTS:** 
If you are reading this file at the start of a new session, **DO NOT rely on your pre-trained assumptions** about typical Laravel/Next.js setups. This repository has custom architectural constraints and a highly developed enterprise foundation. 

You must align your context with the rules below before writing any code.

---

## 1. Current System Status (As of June 2026)
- **Frameworks:** Laravel **12.x** (Backend API), Next.js **15** App Router with React **19** (Frontend).
- **Runtime:** PHP **8.2+**, Node.js 22+, TypeScript 5 strict mode.
- **Core State:** The foundation (Authentication, Role-Based Access Control, Settings Matrix, Master Data) is **100% COMPLETE AND LOCKED**.
- **Current Phase:** Moving from foundational Build to Enterprise `Develop` phase.

## 2. Mandatory Architectural Constraints

### A. Role-Based Access Control (RBAC) Strictness
- We use `spatie/laravel-permission`.
- **8 active roles:** `super-admin`, `admin-prodi`, `kaprodi`, `dosen`, `dodiknis`, `admin-rs`, `mahasiswa`, `finance`.
- **DO NOT** leave any API endpoint unprotected. If you create a new endpoint, it **MUST** have the appropriate middleware in `api.php`.
- Example: `Route::middleware('permission:manage-settings')->group(...)`.
- **Permission naming in code:** kebab-case strings (e.g., `view-dashboard`, `verify-logbook`, `manage-settings`). **NOT** dot notation. See seeder at `backend/database/seeders/RolePermissionSeeder.php` for the full list.
- **Frontend Protection:** Sidebar items and route layouts in Next.js utilize `useAuthStore` to conditionally hide menus based on permissions.

### B. NO Hardcoded Enums / Dropdowns
- **Rule:** Never write hardcoded arrays for dropdowns (e.g., `['student_safety', 'bullying']`) in the code.
- **Implementation:** All system reference data is stored in the `system_references` table (managed via `SystemReferenceController` and accessed in UI via `ReferencesClient.tsx`).
- **Validation:** Always validate incoming API requests against this table using the `exists` rule: `'field' => 'exists:system_references,value,category,your_category_name'`.

### C. Advanced Conditional Notification Hook (SMTP Matrix)
- **Concept:** We have an advanced routing engine stored as a JSON object in the `settings` table (`smtp_notification_matrix`). 
- **Action:** If you build a feature that generates an event (e.g., a grade is published, a rotation is assigned), you **MUST** hook into this engine using `NotificationService::sendDynamicEmail()`. 
- Super Admins configure the conditional logic (e.g., "If grade is E, send CC to Dekan") from the frontend UI. **DO NOT hardcode email routing logic in the controllers.**

## 3. Directory Navigation Guide
If you need to understand specific mechanics, refer to the following:
- **Master Index of ALL docs:** `Build/CONTEXT_INDEX.md` — peta navigasi semua dokumen, diorganisir per fitur/modul
- **Project config for Claude Code:** `CLAUDE.md` (root) — tech stack aktual, cara run, aturan, pola kode
- **Master Data UI:** `frontend/src/app/dashboard/settings/references/`
- **Dynamic SMTP Hook Logic:** `backend/app/Services/NotificationService.php`
- **SMTP Hook Mapping:** `Develop/GLOBAL_NOTIFICATION_HOOKS.md`
- **Protected Routes:** `backend/routes/api.php`
- **Permission Seeder (source of truth):** `backend/database/seeders/RolePermissionSeeder.php`
- **Future Enterprise Blueprints:** Read ALL files inside the `Develop/` directory at the project root to understand the roadmap before proposing new features.

## 4. Actual Tech Stack vs Design Documents

> **IMPORTANT:** `ARCHITECTURE.md` and `DATABASE_SCHEMA.md` describe the **TARGET production architecture**. The current development environment differs in several areas. Use this section as the ground truth for what is ACTUALLY running.

### 4.1 Database (Development vs Production Target)
| | Development (XAMPP, NOW) | Production Target (ARCHITECTURE.md) |
|--|--------------------------|--------------------------------------|
| **Engine** | **MySQL** (via XAMPP) | PostgreSQL 17 |
| **Storage** | Local disk (`storage/app/`) | MinIO (S3-compatible) |
| **Cache/Queue** | Database driver | Redis 7 |
| **JSON columns** | `JSON` type | `JSONB` type |

> When writing migrations, use MySQL-compatible syntax. PostgreSQL-specific features (INET type, JSONB operators, Row-Level Security) are NOT available in the current dev environment.

### 4.2 Implemented Modules (Actual — 11 modules in `backend/Modules/`)
The design docs list 10 modules. **3 additional modules exist in the actual codebase:**

| Module | Status |
|--------|--------|
| `Auth` | ✅ Implemented |
| `Academic` | ✅ Implemented |
| `Rotation` | ✅ Implemented |
| `Clinical` | ✅ Implemented |
| `Assessment` | ✅ Implemented |
| `Examination` | ✅ Implemented |
| `Finance` | ✅ Implemented |
| `Attendance` | ✅ Implemented (not in ARCHITECTURE.md diagram) |
| `Evaluation` | ✅ Implemented (not in ARCHITECTURE.md diagram) |
| `Incident` | ✅ Implemented (not in ARCHITECTURE.md diagram) |
| `Core` | ✅ Implemented (shared utilities, replaces planned standalone Notification/Analytics/Audit modules) |

### 4.3 Frontend Structure (Actual vs ARCHITECTURE.md)
- **Actual:** Pages use `"use client"` with inline logic. State management via `store/useAuthStore.ts` (singular, not `stores/`).
- **Design doc:** Describes `src/features/` domain folders, `src/types/`, `src/config/` — these **do not exist yet**.
- **Zod version:** Actual is **v4.4.3** (not 3.x as listed in ARCHITECTURE.md). Zod 4 has breaking API changes vs v3.

### 4.4 API Route Versioning (Actual State)
Routes are **NOT consistently versioned**. Current mix:
- `/api/auth/*` (no version prefix)
- `/api/academic/*` (no version prefix)  
- `/api/v1/clinical/*` (versioned)
- `/api/v1/rotation/*` (versioned)
- `/api/dashboard/stats` (no version prefix)

> Do NOT assume all routes are under `/api/v1/`. Check `backend/routes/api.php` and each module's `routes/api.php`.

---
**AI ACKNOWLEDGEMENT:**
By reading this document, you are now synchronized with the current timeline. Proceed with executing user commands in accordance with these constraints.
