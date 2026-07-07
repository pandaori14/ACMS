# CLAUDE.md — Academic Clinical Management System (ACMS)

> File ini dibaca otomatis di **setiap** sesi. Baca seluruhnya sebelum menulis kode.
> Kualitas file ini menentukan kualitas semua pekerjaan berikutnya — perlakukan sebagai konstitusi proyek. Bila realita kode berbeda dari dokumen ini, **kode yang benar** → perbaiki dokumen ini.

---

## 0. Prime Directive

1. **Sistem SUDAH LIVE PRODUKSI** di `apps-kedokteran.ums.ac.id/acms` dengan data nyata. Perintah berdampak (deploy, seeder, migrasi destruktif) **hanya** atas instruksi eksplisit user.
2. **JANGAN deploy** tanpa perintah eksplisit. `.env` tidak pernah di-commit.
3. Ikuti pola yang sudah ada. Cari implementasi/utilitas eksisting sebelum menulis yang baru — sistem ini besar dan konsisten.
4. Verifikasi klaim ke kode, bukan ingatan. Setelah selesai, laporkan apa adanya (tes lulus/gagal, langkah dilewati).

---

## 1. ⚡ Checklist Membuat Fitur Baru (TL;DR — hafalkan)

Urutan wajib untuk setiap endpoint/fitur:

1. **Route ber-permission** di file modul yang benar (`permission:...`). Route **statis sebelum wildcard `{id}`**.
2. **Controller tipis** → business logic di **Service** → validasi di **FormRequest** (atau inline `$request->validate`).
3. Dropdown/enum → `exists:system_references,value,category,<kategori>` (Aturan B). **Tanpa hardcode.**
4. Event penting → **hook notifikasi** (`NotificationService::sendDynamicEmail` matrix + in-app Notification class). Template & matrix key baru masuk **SettingSeeder DAN ProductionSettingsPatchSeeder**.
5. Perubahan state penting → **`AuditService::log()`** atau trait `Auditable`.
6. **String UI baru → i18n** (`src/messages/id.json` + `en.json`, `useTranslations`). Jangan hardcode teks.
7. **Tes PHPUnit** Feature untuk service/controller baru.
8. **Gates sebelum commit** (semua wajib hijau):
   ```
   backend:  php vendor/bin/pint --dirty  &&  php artisan test
   frontend: npx tsc --noEmit  &&  npx eslint src  &&  npm run build
   ```
9. **Commit** Conventional Commits (§15). Push git; **jangan** jalankan deploy.

Waspadai **JEBAKAN KRITIS (§6)** — terutama **dual-ID mahasiswa**.

---

## 2. Tech Stack Aktual (Ground Truth)

> Tabel ini = yang BENAR-BENAR berjalan. (Dokumen desain `Build/` bersifat lokal-saja, lihat §17.)

### Backend (`backend/`) — Laravel 12, PHP 8.2+
| Komponen | Aktual | Catatan |
|----------|--------|---------|
| Framework | Laravel **12.x**, modular monolith `nwidart/laravel-modules` | 11 modul di `Modules/` |
| DB (dev) | **MySQL** `acms_db` | Prod target PostgreSQL 17 — migrasi wajib kompatibel keduanya (Aturan D) |
| Cache/Queue | **Database driver** | Bukan Redis |
| Storage | Local disk `storage/app` | |
| Auth | **Sanctum** (cookie SPA, `statefulApi`) + **Socialite** (Google SSO) + **2FA TOTP** (`pragmarx/google2fa`) | |
| RBAC | **Spatie Laravel Permission** | kebab-case; `Gate::before` Super Admin bypass (AppServiceProvider) |
| PDF / Excel | DomPDF (`barryvdh/laravel-dompdf`) · Maatwebsite Excel | |
| QR | `endroid/qr-code` **SvgWriter** | PHP CLI tanpa ext-gd → WAJIB SvgWriter, bukan PNG |
| Realtime | **Laravel Reverb** (WebSocket) | `BROADCAST_CONNECTION=reverb`; fallback polling di frontend |
| Monitoring | Laravel Pulse · **Sentry** (`sentry/sentry-laravel`, DSN-gated dorman) | |

### Frontend (`frontend/`) — Next.js 15, React 19
| Komponen | Aktual | Catatan |
|----------|--------|---------|
| Framework | **Next.js 15** App Router, `output: standalone`, basePath **`/acms`** | |
| Bahasa | React **19** + TypeScript strict — **`any` DILARANG** | |
| Styling | **Tailwind v4** + **shadcn/ui** (primitives `@base-ui/react`) + **Lucide** | dark mode class `.dark` (toggle ada) |
| i18n | **next-intl v4** — cookie `NEXT_LOCALE`, **TANPA prefix URL** (`/acms/...` tetap) | id/en |
| State | TanStack Query **v5** (server) · Zustand **v5** persist (`useAuthStore`) | |
| Forms | React Hook Form v7 + **Zod v4** (≠ v3) | |
| HTTP/Realtime | Axios v1 `withCredentials` (`lib/api.ts`) · **laravel-echo** + **pusher-js** (`lib/echo.ts`) | |
| Lain | Recharts v3 · Sonner v2 · **PWA** (sw.js tulis-tangan) · Sentry (`@sentry/nextjs`) | |
| E2E | **Cypress** (`npm run test:e2e`) | bukan Playwright |

---

## 3. Menjalankan Lokal

```powershell
# Backend (port 8000)
cd "d:\xampp\htdocs\Academic Clinical Management System\backend"
php artisan serve
php artisan migrate --seed        # sekali; buat DB acms_db di MySQL dulu
php artisan queue:work            # job: PDF, email, broadcast (proses terpisah)
php artisan reverb:start          # WebSocket realtime (opsional lokal)

# Frontend (port 3000 → akses http://localhost:3000/acms)
cd "d:\xampp\htdocs\Academic Clinical Management System\frontend"
npm run dev
```
`.env` backend: `DB_DATABASE=acms_db`, `DB_USERNAME=root`, `DB_PASSWORD=` (kosong).

### 🖥️ JEBAKAN MESIN DEV INI (baca sebelum menjalankan tool)
- **PHP CLI**: `D:\xampp\php\php.exe` (bukan `php` di PATH). **Tanpa ext-gd** → QR harus SvgWriter; Excel/phpspreadsheet minta gd saat `composer`.
- **Composer TIDAK di PATH**: pakai `composer.phar` (ada di scratchpad sesi). Install dep:
  `php composer.phar require <paket> --ignore-platform-req=ext-gd`.
- **MySQL TIDAK bisa distart dari shell agent** (data dir XAMPP butuh admin; error 5 hapus ibtmp1). Start via **XAMPP Control Panel**. Konsekuensi: seeder ke DB dev dijalankan user; **tes TIDAK butuh MySQL**.
- **PHPUnit**: pakai **SQLite in-memory** + **APP_KEY statis** di `phpunit.xml` → `php artisan test` jalan tanpa MySQL & tanpa `.env`. `BROADCAST_CONNECTION` di-null saat test.
- **Git di Bash tool**: `export PATH="$PATH:/c/Program Files/Git/cmd"` dulu.
- **Cypress & MySQL tidak jalan di sandbox agent** → verifikasi via `artisan test` + `tsc` + `eslint` + `npm run build`; Cypress dijalankan user di mesin lokal.
- **`.env` pernah tertimpa `.env.example`** (APP_KEY dev hilang) — nilai terenkripsi DB dev (API key AI, secret 2FA) tak bisa didekripsi; masukkan ulang bila perlu. Produksi tak terdampak.

---

## 4. 🚨 ATURAN WAJIB A–G

### A — Setiap Endpoint API Dilindungi RBAC
```php
Route::middleware(['auth:sanctum', 'permission:manage-settings'])->group(fn () => ...);  // ✅
Route::post('/grades/approve', [GradeController::class, 'approve']);                        // ❌ terbuka
```
Permission kebab-case (§9). Super Admin bypass otomatis via `Gate::before`. Cek di frontend: **`user.permissions`** (bukan state teratas):
```ts
const user = useAuthStore((s) => s.user);
if (user?.permissions?.includes('manage-grades')) { ... }
```

### B — DILARANG Hardcode Enum/Dropdown
Semua referensi dari tabel `system_references`. Validasi: `'incident_type' => 'exists:system_references,value,category,incident_types'`. UI kelola: `frontend/src/app/dashboard/settings/references/`. Endpoint baca: `GET /api/references/{category}`.

### C — Notifikasi = Matrix SMTP + In-App + Preferensi
**Email** (satu sumber kebenaran `smtp_notification_matrix`, dikelola Super Admin):
```php
NotificationService::sendDynamicEmail(
    $recipientEmail, "Subject", "email_template_key", "matrix_key",
    ['name' => ..., 'stase' => ...],   // variabel template
    ['grade_value' => 'E']             // context aturan bersyarat (opsional)
);
```
**In-app**: buat Notification class channel `database` (+ `toArray` {title,message,url,type}); realtime otomatis via Reverb (channel private `App.Models.User.{id}`) — **jangan** panggil broadcast manual. Contoh: `App\Notifications\BroadcastAnnouncement`, `Modules\Assessment\...\DocumentReadyNotification`.
**Preferensi user** dihormati `NotificationService` (opt-out per event; `CRITICAL_EVENTS` = `reset_password`,`new_account` tak bisa dimatikan).
⚠️ Template & matrix key baru **WAJIB** ditambah di `SettingSeeder` **DAN** `ProductionSettingsPatchSeeder`.

### D — Migrasi Kompatibel MySQL & PostgreSQL
```php
$table->string('status')->default('draft');  $table->json('metadata')->nullable();  // ✅
$table->ipAddress('ip');                                                             // ❌ MySQL gagal
```

### E — i18n (next-intl) untuk SEMUA String UI
Teks UI baru → key di `src/messages/id.json` + `en.json`; render `useTranslations('ns')` (client) / `getTranslations` (server). Locale dari cookie `NEXT_LOCALE` (`LanguageToggle.tsx`), default `id`, tanpa prefix URL. **Status**: chrome (sidebar/nav) + login sudah dikonversi; body halaman domain masih bertahap — **file yang Anda sentuh, ikut dikonversi**.

### F — Tes & Gates
Fitur backend → Feature test PHPUnit. Sebelum commit semua hijau: `pint --dirty`, `artisan test`, `tsc --noEmit`, `eslint src`, `next build`.

### G — Audit
Perubahan state penting (status mahasiswa, nilai, banding, broadcast, dll) → `AuditService::log($action, $model, $old, $new, $meta)` atau trait `Auditable` di model. Chain hash diverifikasi nightly (`audit:verify-chain`).

---

## 5. 🔒 Aturan Produksi & Seeder (KRITIS)

- **JANGAN PERNAH** jalankan `SettingSeeder` / `RolePermissionSeeder` **penuh** di produksi → `updateOrCreate`/`syncPermissions` me-reset **SMTP, API key AI, kustomisasi RBAC** admin.
- Produksi hanya `ProductionSettingsPatchSeeder` (**idempotent**: `firstOrCreate` + merge matrix + `givePermissionTo` additive) — dijalankan **otomatis** oleh `deploy.sh` (build → down → up).
- **Permission baru**: tambah di `RolePermissionSeeder` (untuk fresh install) **DAN** `Permission::firstOrCreate` + `givePermissionTo` additive di `ProductionSettingsPatchSeeder`.
- **Proses long-running produksi**: `queue:work` + `reverb:start` (butuh aturan nginx WS-upgrade dari IT FK UMS; tanpa itu frontend fallback polling 60 dtk).
- `.env` tak pernah di-commit; rahasia via SSH bukan FTP; password DB alfanumerik bila di-set via shell/sed.

---

## 6. ☠️ JEBAKAN KRITIS KODE (dari bug nyata — hafalkan)

**Dual-ID mahasiswa** — jebakan #1, sudah menyebabkan ≥3 bug:
| Pakai `students.id` (profil) | Pakai `users.id` |
|---|---|
| `rotation_assignments`, `logbook_entries`, `attendance_records`, `student_skill_records`, `evaluation_submissions` | `stase_grades`, `clinical_assessments`, `exam_participants`, `ukmppd_results`, `generated_documents`, `grade_appeals` |

Konversi: `$user->student?->id` (users→profil) · `$assignment->student->user_id` (profil→users). Penjaga: `StudentJourneyTest` (E2E). Pola scoping Dodiknis: `resolveTargetProfile()` di `CompetencyProgressController`/`SkillChecklistController`.

**Lainnya:**
- **Route statis SEBELUM wildcard `{id}`** (kasus `batch-verify` ketangkap `POST {id}` → 404). Contoh benar: `Clinical/routes/api.php`, `Examination/routes/api.php`.
- Controller/Service Laravel **hidup lintas request** (route cache/Octane) → **jangan memo per-instance** (kasus `blackoutMemo`).
- Channel broadcast UUID → bandingkan **string**, jangan `(int)` (kasus bocor otorisasi `channels.php`).
- **RateLimiter di controller**, bukan middleware `throttle` (tak menempel di route modul).
- **Cache daftar** (mis. `stases_list_*`) wajib `Cache::forget` saat mutasi.
- Setting `type=secret` **terenkripsi + diredaksi** jadi placeholder (`__SECRET_SET__`) — jangan kirim plaintext ke frontend.
- `INACTIVE_KEYS` di `SettingsClient.tsx` = setting yang ada tapi belum di-enforce (badge "Belum aktif"); pindahkan keluar saat fiturnya aktif.
- **Test gotchas**: request guest+session butuh header `Origin: config('app.url')` (Sanctum statefulApi); guard `auth:sanctum` menempel `shouldUse('sanctum')` antar-request → reset `$this->app['auth']->shouldUse('web')` + `forgetGuards()` sebelum panggilan guest.

---

## 7. Peta Modul Backend (11 Modul + cross-cutting)

`backend/Modules/<Nama>/` (mandiri: `app/`, `routes/api.php`, `database/`, `tests/`).

| Modul | Domain (termasuk fitur terbaru) |
|-------|--------------------------------|
| `Auth` | Login, logout, SSO Socialite, 2FA TOTP, forgot/reset/change password |
| `Academic` | Fakultas, prodi, stase (+prasyarat), kohort, mahasiswa (+import, +transisi status), kompetensi, **kalender akademik** |
| `Rotation` | RS, periode, penempatan, kapasitas, **auto-scheduler**, **swap**, **schedule-matrix (timeline)** |
| `Clinical` | Logbook (+is_late, batch-verify, export buku), prosedur/diagnosis, progres kompetensi, **skill checklist** |
| `Assessment` | Mini-CEX/DOPS/CBD, rubrik, nilai stase, transkrip, **banding nilai**, **yudisium eligibility**, surat & buku-logbook (job QR) |
| `Examination` | OSCE, **CBT online** (timer server-side, auto-grade, shuffle), **bank soal reusable**, **UKMPPD** |
| `Finance` | Billing RS (invoice PDF), honorarium |
| `Attendance` | Presensi GPS (geofence + anti-spoof), izin/sakit, koreksi, rekap |
| `Evaluation` | Kuesioner evaluasi anonim + laporan agregat |
| `Incident` | Pelaporan insiden (anonim) + konsultasi rahasia + retensi PII |
| `Core` | Utilitas bersama, NotificationService |

**Cross-cutting di `backend/app/`** (belum jadi modul): Broadcast, `AtRiskDetectionService`, ExecutiveAnalytics, Analytics, Audit, NotificationPreference, Settings, Users, SystemReference, AiAssistant.

---

## 8. Struktur Frontend (aktual)

```
frontend/src/
├── app/
│   ├── (auth)/login/ · sso-callback/ · forgot-password/ · reset-password/
│   ├── verify/[code]/                 # verifikasi dokumen publik (QR)
│   ├── safety/{sop,protection,contacts}/   # halaman publik insiden
│   └── dashboard/                     # terproteksi (layout + sidebar)
│       ├── academic/{stase,students,cohorts,calendar,competencies,faculty}
│       ├── clinical/{logbooks,verification,attendance,skills,competency-progress,evaluations}
│       ├── rotations/{,timeline,swap} · rotation/{hospitals}
│       ├── assessments/ · grades/{,appeals} · my-grades/ · transcripts/{,eligibility} · documents/
│       ├── examinations/{,[id],question-bank,ukmppd}
│       ├── finance/ · incidents/ · preceptor/ · examiner/ · hospital/students
│       ├── analytics/{,executive} · reports/ · broadcasts/ · notifications/
│       ├── settings/{,roles,references,audit-logs} · users/ · help/ · profile/ · ai-assistant/
├── components/ ui/(shadcn) · layout/{AppSidebar,BottomNav,UserMenu,TwoFactorBanner}
│              · NotificationBell · ThemeToggle · LanguageToggle · OnboardingTour · PwaRegister
├── i18n/request.ts · messages/{id,en}.json      # next-intl
├── store/useAuthStore.ts · lib/{api.ts,echo.ts}
└── cypress/e2e/{login,smoke}.cy.ts
```
Tak ada `src/features/` atau `src/types/` (types inline/`lib/types.ts`).

---

## 9. RBAC — 8 Peran & 29 Permission

| Slug | Peran | Scope |
|------|-------|-------|
| `super-admin` | Super Admin | Global (bypass `Gate::before`) |
| `admin-prodi` | Admin Prodi | Per program |
| `kaprodi` | Kaprodi | Per program (oversight, approve nilai) |
| `dosen` | Dosen | Per program |
| `dodiknis` | Dokter Pendidik Klinis (Preceptor) | Per RS + stase |
| `admin-rs` | Admin RS | Per RS (scoped di controller) |
| `mahasiswa` | Mahasiswa (Koass) | Data sendiri |
| `finance` | Keuangan | Per program (finansial) |

**Permission (kebab-case, sumber `RolePermissionSeeder`):** `view-dashboard, view-analytics, manage-stase, manage-hospitals, view-rotations, manage-rotations, view-logbook, verify-logbook, take-examinations, manage-examinations, create-assessments, view-assessments, manage-grades, view-transcripts, report-incidents, manage-incidents, manage-finance, manage-users, manage-academic-master, manage-settings, view-incident-guide, view-audit-logs, view-attendance-recap, manage-consultations, submit-consultation, configure-incident-form, view-anonymous-identity, view-executive-analytics, send-broadcasts`.

Matriks dikelola UI **Pengaturan → Hak Akses (RBAC)**.

---

## 10. Peta Route API

| Area | Prefix | File |
|------|--------|------|
| Auth / SSO / 2FA | `/api/auth/*`, `/api/sso/*` | `Modules/Auth/routes/api.php` |
| Academic (kanonik) | `/api/v1/academic/*` (calendar, students/{id}/status) | `Modules/Academic/routes/api.php` |
| ⤷ alias deprecated | `/api/academic/*` | (jangan dipakai kode baru) |
| Rotation | `/api/v1/rotation/*` (assignments, schedule/{preview,commit}, schedule-matrix, swaps, capacities) | `Modules/Rotation/` |
| Clinical | `/api/v1/clinical/*` (logbooks +export/batch-verify, skills, competency-progress) | `Modules/Clinical/` |
| Attendance | `/api/v1/clinical/attendance/*` | `Modules/Attendance/` |
| Assessment | `/api/v1/assessments/*` · `/api/v1/grades/*` (+appeals) · `/api/v1/yudisium/*` (eligibility, generate-letter, generate-logbook-book) | `Modules/Assessment/` |
| Examination | `/api/v1/examinations/*` (question-bank, ukmppd, {id}/attempt) | `Modules/Examination/` |
| Finance | `/api/v1/finance/*` | `Modules/Finance/` |
| Incident / Consultation | `/api/v1/incidents/*`, `/api/v1/consultations/*` | `Modules/Incident/` |
| Dashboard/Users/Settings/RBAC | `/api/dashboard/*`, `/api/users`, `/api/settings`, `/api/role-permissions` | `backend/routes/api.php` |
| References | `/api/system-references`, `/api/references/{category}` | `backend/routes/api.php` |
| Notifications / Preferences | `/api/v1/notifications`, `/api/v1/notification-preferences` | `backend/routes/api.php` |
| Broadcast | `/api/v1/broadcasts` (`send-broadcasts`) | `backend/routes/api.php` |
| Analytics | `/api/analytics`, `/api/v1/analytics/{executive,at-risk,cohort-comparison}` | `backend/routes/api.php` |
| Export | `/api/v1/export/*` | `backend/routes/api.php` |
| Publik (tanpa auth) | `/api/public-settings`, `/api/public-stats`, `/api/public/verify-document/{code}` | `backend/routes/api.php` |
| Realtime auth | `/broadcasting/auth` (session Sanctum) | `routes/channels.php` |

---

## 11. Pola Kode Wajib

**Backend** — controller tipis → Service → FormRequest → API Resource:
```php
public function store(StoreLogbookRequest $r, LogbookService $s) {
    return new LogbookResource($s->createEntry($r->validated(), $r->user()));
}
```
**Frontend** — `'use client'` seperlunya; server state React Query (`staleTime` ≥ menit); tanpa `any`; unduh blob:
```ts
const res = await api.get(url, { responseType: 'blob' });
const a = document.createElement('a'); a.href = URL.createObjectURL(res.data); a.download = name; a.click();
```
Scoping non-mahasiswa: pola `resolveTargetProfile` (Mahasiswa=diri; Dodiknis=RS-nya; admin=`?student_id`).

---

## 12. UI/Design (Branding UMS)

- Primer **UMS Blue** `bg-blue-900 #1E3A8A`; aksen **UMS Gold** `bg-yellow-500 #EAB308`. Teks `text-gray-900`. **Jangan** ubah palet tanpa izin.
- Dark mode: class `.dark` + CSS variables (toggle `ThemeToggle` sudah ada). Card: `.clean-card`. Radius `rounded-md`.
- Charts **Recharts** warna `--chart-1..5`; ikon **Lucide** saja; string via **i18n** (Aturan E).

---

## 13. Workflow Status (aktual — perhatikan koreksi)

```
Umum        : draft → submitted → verified/approved → published
Logbook     : draft → submitted → verified / rejected        (BUKAN "signed")
Assignment  : pending → confirmed → in_progress → completed / remedial   (+ attempt_number)
Nilai stase : draft → approved → published  (+ published_at; banding accepted → balik approved)
Banding     : submitted → accepted / rejected
Swap        : submitted → approved / rejected / cancelled
Ujian       : DRAFT → ONGOING → COMPLETED
Dokumen     : processing → ready / failed
Insiden     : submitted → investigating → resolved
Konsultasi  : pending → in_progress → responded → closed
```

---

## 14. Testing

- **PHPUnit**: SQLite in-memory, APP_KEY statis (`phpunit.xml`), `BROADCAST_CONNECTION` null. Jalankan `php artisan test` (tanpa MySQL). Gotcha guest/guard di §6.
- **Cypress** (`npm run test:e2e`): baseUrl sudah `/acms`; akun demo dari seeder. Dijalankan user lokal (tak jalan di sandbox agent).
- Penjaga penting: `StudentJourneyTest` (dual-ID E2E), regresi keamanan export nilai.

---

## 15. Git Commit (Conventional Commits)

```
feat(clinical): tambah skill checklist per stase
fix(rotation): koreksi guard kapasitas saat konflik jadwal
chore(repo): higiene gitignore dokumen desain
```
Scope: `auth, academic, rotation, clinical, assessment, examination, finance, attendance, evaluation, incident, core, ui, deps, config, repo`. Akhiri body commit dengan `Co-Authored-By:` sesuai instruksi harness.

---

## 16. Deploy (JANGAN tanpa perintah user)

Container **Podman** subpath `/acms` di server FK UMS bersama. `./deploy.sh` (build → down → up) menjalankan migrasi + `ProductionSettingsPatchSeeder` idempotent. Detail & jebakan podman ada di memory Claude (`reference_ums_server_deploy`, `project_acms_deployment`).

---

## 17. Referensi & Pengetahuan Lintas-Sesi

- **`README.md`** (tracked) — overview publik, fitur, cara jalan, deploy.
- **`Build/` & `Develop/`** — dokumen desain/spesifikasi = **LOKAL-SAJA, untracked** (sengaja di-gitignore agar repo bersih). Boleh dibaca sebagai acuan **tapi JANGAN `git add` ulang**. Berisi: PRD, ARCHITECTURE, DATABASE_SCHEMA, API_SPECIFICATION, RBAC_MATRIX, WORKFLOW_ENGINE, ROTATION_ENGINE, AUDIT_TRAIL_SPEC, UI_DESIGN_SYSTEM, CODING_STANDARDS, dll.
- **Memory Claude** (`~/.claude/.../memory/`) — pengetahuan lintas-sesi terverifikasi: `project_acms_id_mapping_trap` (dual-ID), `project_acms_module_completion` (log gelombang), `project_acms_gap_audit` (audit + eksekusi P1–P5), `project_acms_settings`, `project_acms_deployment`, `reference_ums_server_deploy`, `feedback_acms_working_style`. Baca yang relevan di awal sesi.
