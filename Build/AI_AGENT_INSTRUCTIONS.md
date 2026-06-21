# ACMS — AI Agent Instructions

**Document ID**: ACMS-AI-001  
**Version**: 1.0.0  
**Context**: This document acts as the core "System Prompt" for any LLM or AI Agent assisting in the development of the ACMS (Academic Clinical Management System).

---

## 🛑 1. PRIME DIRECTIVES (NEVER VIOLATE)

1. **NO HALLUCINATIONS ON SCHEMA**: Never invent new database columns or tables. You MUST refer to `DATABASE_SCHEMA.md`. If a feature requires a new column, you must ask the human to update `DATABASE_SCHEMA.md` first.
2. **NO SPAGHETTI CODE**: For the Backend, strictly follow the Clean Architecture / Modular Monolith pattern (`app/Modules/{Domain}/`). Controllers MUST NOT contain business logic. Business logic MUST live in `Services`.
3. **TYPE SAFETY ABSOLUTISM**: For the Frontend (Next.js), `any` types are strictly forbidden. Always define explicit interfaces/types for API responses and component props.
4. **NO DESTRUCTIVE ASSUMPTIONS**: If a user prompt is ambiguous regarding security, permissions, or data deletion, STOP and ask for clarification. Do not default to insecure implementations.
5. **DB CONSISTENCY**: The database is **MySQL 8**. Do not use PostgreSQL-specific syntax (e.g., `JSONB`, though Laravel abstracts most of this, be mindful of raw queries).

---

## 🛠 2. BACKEND RULES (Laravel 12 / PHP 8.4)

### 2.1 File Placement & Namespaces
- **Module Structure**: Place all domain-specific code inside `app/Modules/{DomainName}/`.
  - Example: `app/Modules/Rotation/Http/Controllers/RotationController.php`
  - Namespace: `namespace App\Modules\Rotation\Http\Controllers;`
- **Avoid Global `app/`**: Do not place business logic in the default `app/Models` or `app/Http/Controllers` unless it's a globally shared utility.

### 2.2 Eloquent & Database
- **UUID Primary Keys**: Always use the `HasUuid` trait for models.
- **Soft Deletes**: Always apply the `SoftDeletes` trait.
- **Transactions**: Any operation modifying multiple tables MUST be wrapped in `DB::transaction()`.
- **Mass Assignment**: Always explicitly define `protected $fillable = [...];`. Do not use `$guarded = [];`.

### 2.3 API Responses & Requests
- **Validation**: Always use `FormRequest` classes. Never validate inside the Controller.
- **Resources**: Always return data via Eloquent API Resources (`JsonResource`).

---

## 🎨 3. FRONTEND RULES (Next.js 15 / React 19)

### 3.1 Component Architecture
- **Server vs Client**: Default to React Server Components (RSC). Only use `"use client"` directive when the component requires React hooks (`useState`, `useEffect`) or DOM event listeners.
- **Hooks Extraction**: Complex logic inside a component must be extracted into a custom hook in `src/hooks/`.

### 3.2 State Management & Fetching
- **Server State (API)**: Always use `@tanstack/react-query` (TanStack Query) for fetching, caching, and updating asynchronous data.
- **Global UI State**: Always use `zustand` (e.g., sidebar toggles, theme settings).

### 3.3 UI & Styling
- **Design System**: Strictly adhere to `UI_DESIGN_SYSTEM.md`.
- **Tailwind**: Use Tailwind CSS for all styling. Avoid custom CSS files unless absolutely necessary.
- **Components**: Use `shadcn/ui` components for base elements (Buttons, Inputs, Dialogs).

---

## 🔒 4. SECURITY & PERMISSIONS

- **Role Checks**: Reference `RBAC_MATRIX.md`. Use Spatie Laravel Permission middleware (`middleware(['role:Admin Prodi'])`) or Policies.
- **Tenant Isolation**: Always scope queries by `program_id` if the model belongs to a tenant context. Do not leak data across programs.
- **Audit Trails**: Critical operations MUST dispatch an event to be caught by the Audit Trail system (reference `AUDIT_TRAIL_SPEC.md`).
