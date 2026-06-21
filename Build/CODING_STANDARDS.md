# ACMS — Coding Standards & Guidelines

**Version**: 2.0  
**Date**: 2026-06-08  
**Status**: Draft  
**Document ID**: ACMS-CODE-001

---

## 1. General Principles

- **SOLID**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.
- **DRY** (Don't Repeat Yourself): Abstract shared logic into core modules, hooks, or traits.
- **KISS** (Keep It Simple, Stupid): Avoid premature optimization and over-engineering.
- **Clean Architecture**: Domain > Use Cases > Interfaces > Frameworks. Isolate business logic from HTTP and DB.
- **DDD** (Domain-Driven Design): Code should reflect the ubiquitous language of the medical education domain.

---

## 2. PHP / Laravel Standards (Backend)

### 2.1 Code Style
- **PSR-12**: Strictly follow PSR-12 coding standards.
- Enforce via PHP CS Fixer in the CI pipeline.

### 2.2 Naming Conventions
- **Classes**: `PascalCase` (e.g., `RotationAssignmentService`).
- **Methods/Variables**: `camelCase` (e.g., `calculateGrade()`).
- **Interfaces**: End with `Interface` (e.g., `AssessmentRepositoryInterface`).
- **Traits**: Named as adjectives (e.g., `Auditable`, `BelongsToTenant`).
- **Controllers**: `{Resource}Controller` (e.g., `StudentController`).
- **Models**: Singular `PascalCase` (e.g., `Stase`, `LogbookEntry`).

### 2.3 Architecture & Layering
- **Thin Controllers**: Controllers must ONLY handle HTTP requests, input mapping, and response formatting. NO business logic.
- **Fat Services**: Business logic lives in the Service layer (`app/Modules/{Domain}/Services/`).
- **Repositories**: Data access logic must be abstracted into Repositories (`app/Modules/{Domain}/Repositories/`). Controllers and Services rely on Repository interfaces, not Eloquent directly.

### 2.4 Eloquent Models
- **Mass Assignment**: Explicitly define `$fillable` (avoid `$guarded`).
- **Type Casting**: Always use `$casts` for dates, booleans, and JSON attributes.
- **UUIDs**: Use `HasUuid` trait.
- **Soft Deletes**: Use `SoftDeletes` trait for all domain entities.

### 2.5 Validation & Requests
- **Never validate in Controllers**. Always use Form Request classes (`app/Modules/{Domain}/Http/Requests/`).
- Return custom domain exception messages instead of raw DB errors.

### 2.6 API Responses
- Always use API Resources (`JsonResource` / `ResourceCollection`) for transforming models into JSON. Never return Eloquent collections directly from controllers.

---

## 3. TypeScript / React / Next.js Standards (Frontend)

### 3.1 Code Style & Types
- **Strict Mode**: TypeScript `strict: true` must be enabled.
- **No `any`**: The use of `any` is strictly prohibited. Use `unknown` or define proper interfaces.

### 3.2 Naming Conventions
- **Components**: `PascalCase` (e.g., `RotationCalendar.tsx`).
- **Hooks**: `camelCase`, prefixed with `use` (e.g., `useAuth.ts`).
- **Types/Interfaces**: `PascalCase` (e.g., `StudentProfile`).
- **Files/Folders**: `kebab-case` (e.g., `student-dashboard.tsx`).

### 3.3 Component Architecture
- **Functional Components**: Use functional components with hooks.
- **Separation of Concerns**: Extract business logic into custom hooks. Keep components focused on UI rendering.
- **Server vs Client**: Default to React Server Components (RSC). Only use `'use client'` when state, effects, or DOM events are needed.

### 3.4 State Management
- **Server State**: Use `TanStack Query` (React Query) for fetching, caching, and updating asynchronous data.
- **Client/UI State**: Use `Zustand` for global UI state (e.g., sidebar toggles, theme).
- **Form State**: Use `React Hook Form` combined with `Zod` for schema validation.

### 3.5 Styling (Tailwind CSS)
- Use Tailwind utility classes.
- Abstract complex, repeating styles into design tokens or components using `cva` (Class Variance Authority) via Shadcn/UI.

---

## 4. Git & Version Control

- **Branch Naming**: 
  - `feature/{module}/{description}` (e.g., `feature/rotation/auto-assign`)
  - `bugfix/{module}/{description}` (e.g., `bugfix/auth/sso-redirect`)
  - `hotfix/{description}` (urgent production fixes)
- **Commits**: Follow `CONVENTIONAL_COMMITS.md`.
- **Pull Requests**: Require at least 1 code review approval, passing CI tests, and no merge conflicts.

---

## 5. Testing Standards

### 5.1 Backend (PHPUnit)
- **Unit Tests**: Test Services and specific business logic classes in isolation.
- **Feature Tests**: 100% coverage required for all API endpoints (testing auth, validation, DB writes, and JSON structure).
- **Factories**: Use Laravel Factories for test data generation.

### 5.2 Frontend (Vitest / Jest)
- **Component Tests**: Test complex UI logic and conditional rendering.
- **Hook Tests**: Test custom hooks handling state/logic.
- **E2E Tests** (Phase 2): Playwright for critical paths (Login, Rotation Assignment, Grade Approval).

---

## 6. Documentation Standards
- **PHPDoc / TSDoc**: Required for complex business logic, public methods, and utility functions.
- **README**: Each major module in `app/Modules/` must contain a `README.md` explaining its bounded context and responsibilities.
