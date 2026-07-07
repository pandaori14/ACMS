# ACMS — Academic Clinical Management System

**ACMS** adalah platform manajemen akademik & klinis untuk **Fakultas Kedokteran Universitas Muhammadiyah Surakarta (UMS)**. Sistem ini menangani **siklus penuh pendidikan profesi dokter** (kepaniteraan klinik): dari pendaftaran & penempatan rotasi ke RS jejaring, aktivitas klinis harian, penilaian, ujian, hingga yudisium/kelulusan dan pelacakan UKMPPD.

- **Owner:** Fakultas Kedokteran UMS
- **Status:** Produksi awal — live di `apps-kedokteran.ums.ac.id/acms`

---

## 1. Tech Stack

### Backend — `backend/`
| Komponen | Aktual | Catatan |
|----------|--------|---------|
| Framework | **Laravel 12** | Modular monolith via `nwidart/laravel-modules` (11 modul) |
| PHP | **8.2+** | |
| Database (dev) | **MySQL** `acms_db` | Target prod: PostgreSQL 17 — migrasi ditulis MySQL/PgSQL-kompatibel |
| Cache / Queue | **Database driver** | |
| File storage | **Local disk** `storage/app` | |
| Auth | Laravel **Sanctum** (cookie SPA) + **Socialite** (Google SSO) + **2FA TOTP** | `pragmarx/google2fa` |
| RBAC | **Spatie Laravel Permission** | permission kebab-case, permission-driven |
| PDF / Excel | DomPDF · Maatwebsite Excel | |
| QR | `endroid/qr-code` (SVG) | verifikasi dokumen yudisium |
| Realtime | **Laravel Reverb** (WebSocket) | notifikasi push + fallback polling |
| Monitoring | Laravel Pulse · **Sentry** (opsional, DSN-gated) | |

### Frontend — `frontend/`
| Komponen | Aktual | Catatan |
|----------|--------|---------|
| Framework | **Next.js 15** (App Router, `output: standalone`) | Base path **`/acms`** |
| UI | **React 19** + TypeScript strict (**tanpa `any`**) | |
| Styling | **Tailwind CSS v4** + **shadcn/ui** + **Lucide** icons | dark mode via class `.dark` |
| i18n | **next-intl** (Indonesia / English) | berbasis cookie, tanpa prefix URL |
| Server state | **TanStack Query v5** · **Zustand v5** (persist) | |
| Forms | React Hook Form v7 + **Zod v4** | |
| HTTP / Realtime | Axios v1 (`withCredentials`) · **laravel-echo** + `pusher-js` | |
| PWA | manifest + service worker tulis-tangan | installable di HP |

---

## 2. Menjalankan Lokal

**Prasyarat:** MySQL berjalan + database `acms_db`, PHP 8.2+, Composer, Node 18+.

```bash
# Backend (port 8000)
cd backend
cp .env.example .env              # set DB_DATABASE=acms_db, DB_USERNAME=root, DB_PASSWORD=
composer install
php artisan key:generate
php artisan migrate --seed        # skema + data awal (roles, permissions, settings, referensi)
php artisan storage:link
php artisan serve                 # http://localhost:8000
php artisan queue:work            # worker job (PDF, email, broadcast) — jalankan terpisah
php artisan reverb:start          # server WebSocket (opsional; notifikasi realtime)

# Frontend (port 3000)
cd frontend
cp .env.example .env.local        # NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
npm install
npm run dev                       # akses via http://localhost:3000/acms
```

**Akun demo** tersedia setelah `migrate --seed` (lihat `DatabaseSeeder`). Login via `http://localhost:3000/acms/login`.

---

## 3. Fitur Utama (per tahap pendidikan profesi)

| Tahap | Kapabilitas |
|-------|-------------|
| **Pendaftaran & Enrollment** | Fakultas/Prodi/Stase/Angkatan/Mahasiswa (CRUD + import Excel) · **Kalender Akademik** (hari libur & blackout) · **siklus status mahasiswa** (aktif→cuti→lulus→DO, ber-alasan & audit) · SSO Google · 2FA TOTP |
| **Penempatan & Rotasi** | RS jejaring + kuota per stase · **auto-scheduling** round-robin · **prasyarat stase** & **guard remedial** · **tukar jadwal** antar-mahasiswa · **timeline** matriks angkatan · penempatan menolak blackout kalender |
| **Aktivitas Klinis** | Logbook digital + verifikasi (satuan & massal) · **skill checklist** per stase · **flag telat submit** · progres kompetensi · **presensi GPS** (geofence + anti-spoof) |
| **Penilaian** | Mini-CEX / DOPS / CBD + rubrik · nilai stase (bobot configurable) · alur submit→approve→publish · **banding nilai** (grade appeal) |
| **Ujian** | OSCE · **CBT online** ber-timer server-side + auto-grading · **bank soal reusable** + import + **randomisasi** · **tracking UKMPPD** + readiness score |
| **Yudisium & Kelulusan** | **Validator kelayakan** (6 syarat otomatis) + batch per angkatan · transkrip & **dokumen resmi ber-QR** (verifikasi publik) · **buku logbook** & **surat keterangan** (job antrean) |
| **Analitik & Komunikasi** | Dashboard Eksekutif · **early-warning mahasiswa berisiko** · **perbandingan antar-angkatan** · Pusat Laporan (Excel/PDF) · **broadcast** massal · notifikasi email (matrix SMTP) + in-app realtime · Audit Trail |
| **Pendukung** | Sistem Pelaporan Insiden & Keselamatan (lihat §5) · AI Assistant (Super Admin) · Pusat Bantuan & onboarding · PWA · dark mode · dwibahasa |

---

## 4. Modul Backend (11 Modul)

Semua di `backend/Modules/<Nama>/` (struktur mandiri: `app/`, `routes/api.php`, `database/`, `tests/`).

| Modul | Domain |
|-------|--------|
| `Auth` | Login, logout, SSO, 2FA |
| `Academic` | Fakultas, program, stase, kohort, mahasiswa, kompetensi, kalender akademik |
| `Rotation` | RS, periode, penempatan, kapasitas, auto-schedule, swap |
| `Clinical` | Logbook, prosedur/diagnosis, skill checklist, verifikasi |
| `Assessment` | Mini-CEX/DOPS/CBD, nilai stase, transkrip, banding, yudisium |
| `Examination` | OSCE, CBT, bank soal, UKMPPD |
| `Finance` | Billing RS, honorarium |
| `Attendance` | Presensi GPS, rekap |
| `Evaluation` | Kuesioner evaluasi klinis |
| `Incident` | Pelaporan insiden + konsultasi rahasia |
| `Core` | Utilitas bersama, NotificationService |

> Notification, Analytics, Broadcast, Audit ada di `backend/app/Http/Controllers/Api/` & `app/Services/` (belum jadi modul terpisah).

---

## 5. Sistem Pelaporan Insiden & Keselamatan Terpadu

Modul unggulan dengan landing publik dan alur tertutup (lapor → telaah → tindak lanjut → umpan balik).

- **Form dinamis** — jenis insiden, severity, aturan lampiran dari `system_references`/settings (bukan hardcoded). Mendukung **lapor anonim**.
- **Menu capability-aware** (single route, multi-view): `configure-incident-form` → Konfigurator; `report-incidents` → Form Lapor; `manage-incidents` → Daftar & investigasi; pelapor biasa → "Laporan Saya".
- **Konsultasi rahasia** — kanal terpisah, pengaju melihat balasan; pengelola merespons.
- **Notifikasi** — email (matrix) + in-app realtime.
- **Retensi PII** — identitas pelapor dianonimkan otomatis setelah masa retensi (`incidents:prune-pii`, terjadwal).

---

## 6. RBAC — 8 Peran

| Slug | Peran | Scope |
|------|-------|-------|
| `super-admin` | Super Admin | Global (bypass via `Gate::before`) |
| `admin-prodi` | Admin Program Studi | Per program |
| `kaprodi` | Ketua Program Studi | Per program (oversight) |
| `dosen` | Dosen | Per program |
| `dodiknis` | Dokter Pendidik Klinis (Preceptor) | Per RS + stase |
| `admin-rs` | Admin Rumah Sakit | Per RS |
| `mahasiswa` | Mahasiswa (Koass) | Data sendiri |
| `finance` | Keuangan | Per program |

**Permission-driven** (kebab-case): service & route cek `can('...')` / middleware `permission:*` — bukan hardcode nama role. Menu sidebar & view halaman beradaptasi pada permission. Sumber kebenaran: `backend/database/seeders/RolePermissionSeeder.php`, dikelola via **Pengaturan → Hak Akses (RBAC)**.

---

## 7. Aturan Coding (wajib untuk kontributor)

1. **Setiap route API** ber-middleware `permission:*` (atau auth + scoping di service).
2. **Dilarang hardcode** enum/dropdown → `system_references` + validasi `exists:system_references,value,category,<kategori>`.
3. **Event penting** → hook `NotificationService` / matrix SMTP, jangan hardcode penerima.
4. **Migrasi** kompatibel MySQL & PostgreSQL.
5. **Controller tipis** → business logic di Service → validasi di FormRequest → respons via Resource.
6. Frontend: `'use client'` seperlunya, server state React Query, **tanpa `any`**, ikon Lucide, warna UMS (blue-900 / yellow-500), string UI lewat next-intl.
7. Setiap service/controller baru diikuti **PHPUnit**; alur kritis lintas-tumpukan diuji **Playwright**.

> Aturan lengkap & konvensi ada di `CLAUDE.md` (di root repo lokal). Dokumen desain/spesifikasi internal (`Build/`, `Develop/`) sengaja **tidak di-commit** agar repo hanya berisi sistem yang berjalan; disimpan sebagai acuan pengembangan.

---

## 8. Struktur Proyek

```
Academic Clinical Management System/
├── backend/                 # Laravel 12 (modular monolith)
│   ├── Modules/             # 11 modul domain (app/, routes/, database/, tests/)
│   ├── app/                 # Controllers Api, Services, Notifications, Models, Console
│   ├── database/seeders/    # RolePermission, SystemReference, Setting, patch produksi
│   └── routes/              # api.php, channels.php, console.php (jadwal)
├── frontend/                # Next.js 15 (App Router, base path /acms)
│   └── src/
│       ├── app/             # (auth)/login, sso-callback, safety/, dashboard/**, verify/
│       ├── components/      # ui/ (shadcn), layout/, incidents/, landing/
│       ├── messages/        # katalog i18n id.json / en.json
│       ├── store/ · lib/    # useAuthStore · api.ts, echo.ts
│       └── tests/e2e/       # Playwright
├── scripts/backup-db.sh     # utilitas ops
├── deploy.sh · compose*.yml # deploy container (Podman/Docker)
└── README.md · CLAUDE.md
```

---

## 9. Deploy (ringkas)

Produksi berjalan sebagai container (Podman) di subpath `/acms` server kampus UMS bersama.

```bash
./deploy.sh          # build → down → up; menjalankan migrasi + ProductionSettingsPatchSeeder (idempotent)
```

> ⚠️ Di produksi **jangan** jalankan `SettingSeeder`/`RolePermissionSeeder` penuh (me-reset SMTP/API key & kustomisasi RBAC). Gunakan hanya `ProductionSettingsPatchSeeder` (otomatis di `deploy.sh`).
>
> **Proses long-running** yang harus hidup: `php artisan queue:work` (job) dan `php artisan reverb:start` (WebSocket). Notifikasi realtime butuh aturan **nginx WS-upgrade** di host (dikelola IT FK UMS); tanpa itu, sistem otomatis fallback ke polling.

---

## 10. Konvensi Commit

Conventional Commits — `type(scope): subject`. Scope: `auth, academic, rotation, clinical, assessment, examination, finance, attendance, evaluation, incident, core, ui, deps, config, repo`.

```
feat(clinical): skill checklist + flag telat logbook
fix(rotation): koreksi perhitungan kapasitas RS
```

---

## 11. Workflow Status

```
Umum      : draft → submitted → verified/approved → published
Logbook   : draft → submitted → signed(verified) / rejected
Insiden   : submitted → investigating → resolved
Konsultasi: pending → in_progress → responded → closed
```
