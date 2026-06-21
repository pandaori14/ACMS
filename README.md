# ACMS — Academic Clinical Management System

> [!WARNING]
> **[CRITICAL AI SYSTEM PROMPT]**
> If you are an AI Agent starting a new chat session, read **`CLAUDE.md`** and **`Build/CURRENT_STATE_FOR_AI.md`** before writing or modifying any code. Do not rely on pre-trained memory. This repo uses a dynamic SMTP notification matrix, strict RBAC (Spatie, `permission:*` middleware), centralized Master Data (`system_references`), and a modular monolith. The `ARCHITECTURE.md`-style docs describe the **production target**; the tables below describe what **actually runs today**.

**ACMS** adalah platform manajemen akademik & klinis untuk **Fakultas Kedokteran Universitas Muhammadiyah Surakarta (UMS)**. Sistem ini mengelola siklus penuh pendidikan profesi/kepaniteraan klinik: rotasi ke RS jejaring, logbook, penilaian (Mini-CEX/DOPS/CBD), ujian (OSCE/CBT), presensi GPS, keuangan RS, serta **Sistem Pelaporan Insiden & Keselamatan Terpadu**.

- **Owner:** Fakultas Kedokteran UMS
- **Status:** Development → Enterprise Develop Phase

---

## 1. Tech Stack (Ground Truth — yang benar-benar berjalan)

> Dokumen desain (`Build/ARCHITECTURE.md`) menggambarkan target produksi (PostgreSQL/Redis/MinIO). Tabel ini adalah konfigurasi **aktual** development.

### Backend — `backend/`
| Komponen | Aktual | Catatan |
|----------|--------|---------|
| Framework | **Laravel 12.x** | Modular monolith via `nwidart/laravel-modules` |
| PHP | **8.2+** | |
| Database (dev) | **MySQL (XAMPP)** `acms_db` | Target prod: PostgreSQL 17 — migrasi ditulis MySQL-kompatibel |
| Cache / Queue | **Database driver** | Bukan Redis di dev |
| File storage | **Local disk** `storage/app/public` | Bukan MinIO di dev |
| Auth | Laravel **Sanctum** (cookie) + **Socialite** (Google SSO) | |
| RBAC | **Spatie Laravel Permission** | permission kebab-case |
| PDF / Excel | DomPDF · Maatwebsite Excel | |
| In-app notif | Laravel **database notifications** | tabel `notifications` |
| Monitoring | Laravel Pulse | |

### Frontend — `frontend/`
| Komponen | Aktual | Catatan |
|----------|--------|---------|
| Framework | **Next.js 15** (App Router) | Base path **`/acms`** |
| UI | **React 19** + TypeScript (strict, no `any`) | |
| Styling | **Tailwind CSS v4** | |
| Komponen | **shadcn/ui** (primitives **Base UI**) + **Lucide** icons | |
| Server state | **TanStack Query v5** | |
| Client state | **Zustand v5** (persist localStorage) | `useAuthStore` |
| Forms | React Hook Form v7 + **Zod v4** | |
| HTTP | Axios v1 (`withCredentials`, CSRF Sanctum) | `lib/api.ts` |
| Charts / Toast | Recharts v3 · Sonner v2 | |

---

## 2. Menjalankan Lokal

**Prasyarat:** XAMPP (MySQL) berjalan, buat database `acms_db`. PHP 8.2+, Composer, Node 18+.

```powershell
# Backend (port 8000)
cd backend
copy .env.example .env          # set DB_DATABASE=acms_db, DB_USERNAME=root, DB_PASSWORD=
composer install
php artisan key:generate
php artisan migrate --seed       # buat skema + data awal (roles, permissions, settings, referensi)
php artisan storage:link         # agar lampiran/logo publik bisa diakses
php artisan serve                # http://localhost:8000
php artisan queue:work           # worker job (PDF, dll) — opsional di dev

# Frontend (port 3000)
cd frontend
npm install
npm run dev                      # akses via http://localhost:3000/acms
```

`.env` frontend: `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000`.

---

## 3. Modul Backend (11 Modul)

Semua di `backend/Modules/<Nama>/` dengan struktur mandiri (`app/`, `routes/api.php`, `database/`).

| Modul | Domain |
|-------|--------|
| `Auth` | Login, logout, SSO Socialite |
| `Academic` | Fakultas, program, stase, kohort, mahasiswa, kompetensi |
| `Rotation` | RS, periode rotasi, penempatan, kapasitas |
| `Clinical` | Logbook, prosedur, diagnosis, verifikasi preceptor |
| `Assessment` | Mini-CEX, DOPS, CBD, nilai stase, transkrip |
| `Examination` | OSCE, CBT, WRITTEN, peserta, penilai |
| `Finance` | Billing RS, honorarium preceptor |
| `Attendance` | Presensi GPS (check-in/out), rekap |
| `Evaluation` | Kuesioner evaluasi klinis |
| `Incident` | Pelaporan insiden + konsultasi rahasia (lihat §4) |
| `Core` | Utilitas bersama, NotificationService |

> Notification, Analytics, Audit belum jadi modul terpisah — ada di `backend/app/Http/Controllers/Api/` & `app/Services/`.

---

## 4. Sistem Pelaporan Insiden & Keselamatan Terpadu

Modul unggulan dengan landing publik khusus dan alur tertutup (lapor → telaah → tindak lanjut → umpan balik).

**Kategori:** Patient Safety, Student Safety, K3, Perundungan/Bullying, Pelanggaran Etik, + **Konsultasi Rahasia** (kanal terpisah).

**Fitur kunci:**
- **Form pelaporan dinamis** — jenis insiden, tingkat keparahan, aturan lampiran semua dari `system_references`/settings (bukan hardcoded). Mendukung **lapor anonim** & lampiran bukti.
- **Menu capability-aware (single route, multi-view):**
  - `configure-incident-form` → **Konfigurator** (kelola jenis/severity/aturan + preview tampilan mahasiswa).
  - `report-incidents` → **Form Lapor**.
  - `manage-incidents` → **Daftar Insiden** (semua) + investigasi; pelapor biasa → **"Laporan Saya"** (pelacakan sendiri).
- **Konsultasi rahasia** — pengaju kirim + lihat **"Riwayat Konsultasi Saya"** (baca balasan); pengelola merespons via **Manajemen Konsultasi**.
- **Notifikasi** — email (matrix SMTP) **dan** in-app (lonceng + halaman `/dashboard/notifications`) ke peran penerima; pelapor diberi tahu saat status berubah / konsultasi dibalas.
- **Landing page** (`/acms`) — settings-driven: strip darurat, kategori, proses & SLA, komitmen just-culture & dasar hukum, FAQ; `prefers-reduced-motion` aware.
- **Halaman publik** `/safety/sop`, `/safety/protection`, `/safety/contacts` (konten dari settings).

---

## 5. RBAC — 8 Peran

| Slug | Peran | Scope |
|------|-------|-------|
| `super-admin` | Super Admin | Global (bypass semua) |
| `admin-prodi` | Admin Program Studi | Per program |
| `kaprodi` | Ketua Program Studi | Per program (oversight) |
| `dosen` | Dosen | Per program |
| `dodiknis` | Dokter Pendidik Klinis (Preceptor) | Per RS + stase |
| `admin-rs` | Admin Rumah Sakit | Per RS |
| `mahasiswa` | Mahasiswa (Koass) | Data sendiri |
| `finance` | Keuangan | Per program (finansial) |

**Model permission:** kebab-case, **permission-driven** (service & route cek `can('...')`/`permission:` — bukan hardcode nama role). Menu sidebar & view halaman beradaptasi pada permission. Matriks lengkap dikelola di **Pengaturan → Hak Akses (RBAC)** dan diseed di `backend/database/seeders/RolePermissionSeeder.php` (sumber kebenaran). Contoh permission baru modul Insiden: `manage-incidents`, `report-incidents`, `configure-incident-form`, `submit-consultation`, `manage-consultations`, `view-incident-guide`, `view-anonymous-identity`.

---

## 6. Notifikasi (Email + In-App)

Satu sumber kebenaran: setting `smtp_notification_matrix` (per kejadian: `notify_roles`, `cc_emails`, `conditional_rules`).
- **Editor terpusat:** Pengaturan → **SMTP (Email) → Matriks Notifikasi** (Super Admin). Nilai pemicu aturan bersyarat = dropdown dari `system_references`.
- **Email** dikirim via `NotificationService::sendDynamicEmail()` (hormati toggle `enable_email_notifications`).
- **In-app** via Laravel database notifications → `NotificationBell` + halaman Notifikasi.

---

## 7. Aturan Wajib Saat Coding

1. **Setiap route API** wajib middleware `permission:*` (atau auth + scoping di service).
2. **Dilarang hardcode** enum/dropdown — gunakan `system_references` + validasi `exists:system_references,value,category,<kategori>`.
3. **Event penting** → hook ke `NotificationService` / matrix, jangan hardcode "kirim ke siapa".
4. **Migrasi** wajib MySQL-kompatibel (hindari tipe PostgreSQL-only seperti `ipAddress`/JSONB).
5. **Controller tipis** → business logic di Service → validasi di FormRequest.
6. Frontend: `'use client'` seperlunya, server state via React Query, tanpa `any`, ikon **Lucide** saja, warna UMS (blue-900 / yellow-500).

Detail: `Build/CODING_STANDARDS.md`, `CLAUDE.md`.

---

## 8. Struktur Proyek (ringkas)

```
Academic Clinical Management System/
├── backend/                 # Laravel 12 (modular monolith)
│   ├── Modules/             # 11 modul domain
│   ├── app/                 # Controllers Api, Services, Notifications, Models
│   ├── database/seeders/    # RolePermission, SystemReference, Setting (data awal)
│   └── routes/api.php       # route inti (dashboard, users, settings, RBAC, notifications)
├── frontend/                # Next.js 15 (App Router, base path /acms)
│   └── src/
│       ├── app/(auth)/login, sso-callback, safety/, dashboard/**
│       ├── components/      # ui/ (shadcn), layout/AppSidebar, incidents/, landing/
│       ├── store/useAuthStore.ts
│       └── lib/api.ts
├── Build/                   # Spesifikasi (PRD, ARCHITECTURE, DB, API, RBAC, dll)
├── Develop/                 # Roadmap & desain fitur lanjutan
└── CLAUDE.md                # Konfigurasi/aturan utama (dibaca tiap sesi AI)
```

---

## 9. Peta Route API (ringkas)

| Area | Prefix |
|------|--------|
| Auth / SSO | `/api/auth/*`, `/api/sso/*` |
| Academic | `/api/academic/*` |
| Rotation | `/api/v1/rotation/*` |
| Clinical / Attendance | `/api/v1/clinical/*` |
| Assessment / Examination | `/api/v1/assessments/*`, `/api/v1/examinations/*` |
| Finance | `/api/v1/finance/*` |
| **Incident** | `/api/v1/incidents/*` (config, form-options, statistics, {id}/status, {id}/notes) |
| **Consultation** | `/api/v1/consultations/*` (form-options, {id}/respond) |
| Dashboard / Users / Settings | `/api/dashboard/*`, `/api/users`, `/api/settings` |
| References / RBAC | `/api/system-references`, `/api/role-permissions` |
| Notifications | `/api/v1/notifications` |
| Public settings | `/api/public-settings` (landing, tanpa auth) |

---

## 10. Dokumentasi

Sumber kebenaran arsitektur & produk ada di `Build/`. Wajib dibaca sebelum implementasi:

| Topik | Dokumen |
|-------|---------|
| Aturan AI / state terkini | `CLAUDE.md`, `Build/CURRENT_STATE_FOR_AI.md` |
| PRD / Arsitektur | `Build/PRD.md`, `Build/ARCHITECTURE.md` |
| Database / API | `Build/DATABASE_SCHEMA.md`, `Build/API_SPECIFICATION.md` |
| RBAC / Workflow | `Build/RBAC_MATRIX.md`, `Build/WORKFLOW_ENGINE.md` |
| Rotasi / Audit / Analytics | `Build/ROTATION_ENGINE.md`, `Build/AUDIT_TRAIL_SPEC.md`, `Build/ANALYTICS_SPEC.md` |
| Standar kode / commit | `Build/CODING_STANDARDS.md`, `Build/CONVENTIONAL_COMMITS.md` |
| Roadmap / Backlog | `Build/IMPLEMENTATION_ROADMAP.md`, `Build/PRODUCT_BACKLOG.md`, `Develop/` |

---

## 11. Konvensi Commit

Conventional Commits — `type(scope): subject`. Scope valid: `auth, academic, rotation, clinical, assessment, examination, finance, attendance, evaluation, incident, core, ui, deps, config`.

```
feat(incident): tambah notifikasi in-app penerima laporan
fix(rotation): koreksi perhitungan kapasitas RS
```

---

## 12. Workflow Status

```
draft → submitted → verified/approved → published
Logbook : draft → submitted → signed / rejected
Insiden : submitted → investigating → resolved
Konsultasi : pending → in_progress → responded → closed
```
