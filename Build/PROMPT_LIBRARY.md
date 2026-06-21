# ACMS — AI Prompt Library

**Document ID**: ACMS-PROMPT-001  
**Version**: 1.0.0  
**Context**: This document contains tested and standardized prompt templates that Developers and Project Managers can copy and paste when interacting with AI Coding Agents (like Cursor, GitHub Copilot, or Gemini) to ensure high-quality, architecture-compliant code generation.

---

## 1. Backend: Module Generation (Laravel)

Use this prompt when asking the AI to scaffold a new domain module in Laravel according to our Modular Monolith architecture.

**Prompt:**
```text
I need to build the `[ModuleName]` module for the ACMS backend.
Please read `Build/ARCHITECTURE.md` and `Build/AI_AGENT_INSTRUCTIONS.md` first to understand the Modular Monolith structure.

Based on the `[EntityName]` table defined in `Build/DATABASE_SCHEMA.md`:
1. Create the Laravel Migration. Use UUID for primary keys and include soft deletes.
2. Create the Eloquent Model in `app/Modules/[ModuleName]/Models/`. Include $fillable, $casts, and relationships.
3. Create the FormRequest classes for Store and Update operations in `app/Modules/[ModuleName]/Http/Requests/`.
4. Create the API Resource class in `app/Modules/[ModuleName]/Http/Resources/`.
5. Create the Service class in `app/Modules/[ModuleName]/Services/` that contains the core business logic (create, update, delete).
6. Create the API Controller in `app/Modules/[ModuleName]/Http/Controllers/` that injects the Service. Ensure it only handles HTTP requests and responses.
7. Generate the routes file `app/Modules/[ModuleName]/Routes/api.php` and map the endpoints.

Ensure strict typing in PHP 8.4 and use meaningful Exception handling.
```

## 2. Frontend: Page Generation (Next.js)

Use this prompt when generating a new page/dashboard in the Next.js frontend.

**Prompt:**
```text
I need to build the Next.js frontend page for `[PageName]` located at the route `/[route-path]`.
Please read `Build/UI_DESIGN_SYSTEM.md` and `Build/AI_AGENT_INSTRUCTIONS.md` to understand our strict UI conventions.

Requirements:
1. Create a server component (RSC) for the page layout if it doesn't require interactivity, and client components for interactive parts.
2. The page should fetch data from the `[API_ENDPOINT]` using `@tanstack/react-query`.
3. Display the data in a `shadcn/ui` DataTable (or Cards, specify here).
4. Use the UMS Blue color scheme for primary actions and ensure there is a Skeleton loading state while data is being fetched.
5. If there is a form, use `react-hook-form` + `zod` and map the fields exactly to what is expected by the backend API.
6. Do NOT use `any` types. Define explicit TypeScript interfaces for the API response.
```

## 3. Workflow / State Machine Implementation

Use this prompt when implementing complex logic from the `WORKFLOW_ENGINE.md`.

**Prompt:**
```text
Please read `Build/WORKFLOW_ENGINE.md` specifically focusing on `[Workflow ID, e.g., WF-004 Logbook Entry]`.

I need to implement this finite state machine in the Laravel backend for the `[EntityName]` model.
1. Use `spatie/laravel-model-states` (or implement a strict State pattern).
2. Create the State classes (e.g., Draft, Submitted, SignedOff).
3. Create the Transition classes that enforce the exact Guard Conditions specified in the markdown.
4. Ensure the Transition classes dispatch the domain events (e.g., `LogbookSubmitted`) and wrap the state change in a database transaction.
5. Provide a PHPUnit Feature test that proves a state transition fails if the guard condition is not met.
```

## 4. Code Review & Refactoring

Use this prompt when you have written code and want the AI to review it against ACMS standards.

**Prompt:**
```text
Please review the code in `[FilePath]`. 
Act as a Senior Principal Engineer for the ACMS project.
Evaluate this code strictly against `Build/CODING_STANDARDS.md` and `Build/ARCHITECTURE.md`.

Specifically check for:
1. Are there any N+1 query issues?
2. Is business logic leaking into the controller?
3. Is it bypassing the RBAC security matrix?
4. Suggest a refactored version that aligns perfectly with our Clean Architecture principles.
```
