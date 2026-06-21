# CLAUDE.md — Academic Clinical Management System (ACMS)

> Ini adalah file konfigurasi Claude Code yang dibaca otomatis di setiap sesi. Baca seluruh dokumen ini sebelum menulis kode apapun.

---

## 1. Identitas Project

**ACMS** adalah sistem manajemen akademik dan klinis untuk **Fakultas Kedokteran Universitas Muhammadiyah Surakarta (UMS)**. Sistem ini mengelola rotasi klinik mahasiswa (koass) ke rumah sakit mitra, logbook kegiatan klinis, penilaian mini-CEX/DOPS/CBD, ujian OSCE/CBT, absensi GPS, keuangan RS, dan pelaporan insiden.

**Owner:** Fakultas Kedokteran UMS  
**Status:** Development Phase → Enterprise Develop Phase

---

## 2. Tech Stack Aktual (Ground Truth)

> ⚠️ Dokumen desain seperti `ARCHITECTURE.md` menggambarkan target produksi. Tabel di bawah ini adalah yang BENAR-BENAR berjalan.

### Backend (`backend/`)
| Komponen | Versi Aktual | Catatan |
|----------|-------------|---------|
| Framework | **Laravel 12.x** | Bukan 11.x |
| PHP | **8.2+** | Bukan 8.4 |
| Database (Dev) | **MySQL via XAMPP** | Bukan PostgreSQL |
| Database (Prod Target) | PostgreSQL 17 | Gunakan syntax MySQL-kompatibel untuk migrasi |
| Cache/Queue | Database driver | Bukan Redis (dev) |
| File Storage | Local disk `storage/app/` | Bukan MinIO (dev) |
| Auth | Laravel Sanctum + SSO Socialite | |
| RBAC | Spatie Laravel Permission | |
| PDF | DomPDF (`barryvdh/laravel-dompdf`) | |
| Excel | Maatwebsite Excel | |
| Monitoring | Laravel Pulse | |

### Frontend (`frontend/`)
| Komponen | Versi Aktual | Catatan |
|----------|-------------|---------|
| Framework | **Next.js 15** | App Router. Bukan Next.js 14 |
| React | **19.x** | |
| TypeScript | 5.x strict mode | `"any"` dilarang keras |
| CSS | Tailwind CSS v4 | PostCSS config |
| UI Components | shadcn/ui | Copy-paste, bukan dependency |
| State (server) | TanStack Query v5 | |
| State (client) | Zustand v5 | Persist ke localStorage |
| Forms | React Hook Form v7 + Zod **v4** | Zod v4 ≠ Zod v3 (ada breaking changes) |
| HTTP | Axios v1 | withCredentials: true (cookie Sanctum) |
| Charts | Recharts v3 | |
| Toast | Sonner v2 | |
| Base path | `/acms` | Semua route prefix `/acms` |

---

## 3. Menjalankan Project Lokal

### Backend
```powershell
cd "d:\xampp\htdocs\Academic Clinical Management System\backend"
php artisan serve          # Jalan di port 8000
php artisan migrate --seed # Setup database (jalankan sekali)
php artisan queue:work     # Worker untuk jobs (PDF generation, dll)
```

### Frontend
```powershell
cd "d:\xampp\htdocs\Academic Clinical Management System\frontend"
npm run dev               # Jalan di port 3000, akses via localhost:3000/acms
```

### Database
- Buat database `acms_db` di MySQL XAMPP sebelum migrate
- File `.env` backend: `DB_CONNECTION=mysql`, `DB_DATABASE=acms_db`, `DB_USERNAME=root`, `DB_PASSWORD=`

---

## 4. 🚨 ATURAN WAJIB — Baca Sebelum Menulis Kode

### Aturan A: Setiap Endpoint API WAJIB Dilindungi RBAC

Setiap route baru di `api.php` HARUS punya middleware permission:

```php
// ✅ BENAR
Route::middleware(['auth:sanctum', 'permission:manage-settings'])
    ->group(function () { ... });

// ❌ SALAH — endpoint terbuka tanpa proteksi
Route::post('/grades/approve', [GradeController::class, 'approve']);
```

Penamaan permission menggunakan **kebab-case** (sesuai seeder aktual):
`view-dashboard`, `verify-logbook`, `create-assessments`, `manage-settings`, dll.
Lihat daftar lengkap: `backend/database/seeders/RolePermissionSeeder.php`

### Aturan B: DILARANG Hardcode Enum / Dropdown

```php
// ❌ SALAH — hardcoded
$types = ['student_safety', 'bullying', 'patient_safety'];

// ✅ BENAR — ambil dari system_references
$types = SystemReference::where('category', 'incident_types')
    ->where('is_active', true)->get();

// ✅ Validasi request selalu pakai exists:
'incident_type' => 'required|exists:system_references,value,category,incident_types'
```

Semua data referensi/dropdown disimpan di tabel `system_references`.  
UI management: `frontend/src/app/dashboard/settings/references/`

### Aturan C: Setiap Event Penting WAJIB Hook ke SMTP Matrix

Jika Anda membuat fitur yang mengubah state penting (nilai diterbitkan, rotasi ditugaskan, tagihan diterbitkan), **WAJIB** panggil:

```php
NotificationService::sendDynamicEmail(
    $recipientEmail,
    "Subject Notifikasi",
    "template_key",    // key template di settings
    "matrix_key",      // key di smtp_notification_matrix (contoh: 'grade_published')
    ['name' => ..., 'value' => ...],  // variabel template
    ['grade_value' => 'E']            // context untuk conditional rules
);
```

**JANGAN** hardcode logika "kirim email ke siapa" di controller. Super Admin yang konfigurasi melalui UI Settings.  
Implementasi: `backend/app/Services/NotificationService.php`

### Aturan D: Migrasi Database WAJIB Kompatibel MySQL

Target produksi adalah PostgreSQL, tapi development menggunakan MySQL. Tulis migrasi yang bisa jalan di keduanya:

```php
// ✅ Kompatibel MySQL & PostgreSQL
$table->string('status')->default('draft');
$table->json('metadata')->nullable();
$table->decimal('amount', 15, 2);

// ❌ PostgreSQL-only, gagal di MySQL dev
$table->ipAddress('ip_address');  // INET type tidak ada di MySQL
```

---

## 5. Peta Modul Backend (11 Modul)

Semua modul ada di `backend/Modules/`. Setiap modul punya struktur mandiri.

| Modul | Path | Domain | Status |
|-------|------|--------|--------|
| `Auth` | `Modules/Auth/` | Login, logout, SSO Socialite | ✅ Done |
| `Academic` | `Modules/Academic/` | Fakultas, program, stase, kohort, mahasiswa, kompetensi | ✅ Done |
| `Rotation` | `Modules/Rotation/` | RS, periode rotasi, penempatan mahasiswa, kapasitas | ✅ Done |
| `Clinical` | `Modules/Clinical/` | Logbook, prosedur, diagnosis, verifikasi preceptor | ✅ Done |
| `Assessment` | `Modules/Assessment/` | Mini-CEX, DOPS, CBD, nilai stase, transkrip | ✅ Done |
| `Examination` | `Modules/Examination/` | OSCE, CBT, WRITTEN, peserta, penilai | ✅ Done |
| `Finance` | `Modules/Finance/` | Billing RS, honorarium preceptor | ✅ Done |
| `Attendance` | `Modules/Attendance/` | Absensi GPS (check-in/out) | ✅ Done |
| `Evaluation` | `Modules/Evaluation/` | Kuesioner evaluasi klinis | ✅ Done |
| `Incident` | `Modules/Incident/` | Pelaporan insiden (anonim) | ✅ Done |
| `Core` | `Modules/Core/` | Shared utilities, notification service | ✅ Done |

> Notification, Analytics, Audit **BELUM menjadi modul terpisah**. Mereka ada di `backend/app/Http/Controllers/Api/` dan `backend/app/Services/`.

---

## 6. RBAC — 8 Peran & Permission

### 8 Peran Sistem

| Kode | Role Slug | Nama | Scope |
|------|-----------|------|-------|
| SA | `super-admin` | Super Admin | Global — bypass semua scope |
| AP | `admin-prodi` | Admin Program Studi | Per program |
| KP | `kaprodi` | Ketua Program Studi | Per program (oversight) |
| DO | `dosen` | Dosen / Lecturer | Per program + stase assigned |
| DK | `dodiknis` | Dokter Pendidik Klinis (Preceptor) | Per hospital + stase |
| AR | `admin-rs` | Admin Rumah Sakit | Per hospital |
| MH | `mahasiswa` | Mahasiswa (Koass) | Own records only |
| FN | `finance` | Finance / Keuangan | Per program (finansial) |

### Permission Naming Format

**Kebab-case** — contoh: `view-dashboard`, `manage-users`, `verify-logbook`.  
Lihat daftar lengkap permission di `backend/database/seeders/RolePermissionSeeder.php`.  
Untuk detail matriks siapa boleh apa: `Build/RBAC_MATRIX.md`.

### Cek Permission di Kode

```php
// Middleware route
Route::middleware('permission:verify-logbook')->...

// Dalam controller
$this->authorize('update', $logbookEntry); // via Policy

// Di Frontend (TypeScript)
const { permissions } = useAuthStore();
if (permissions.includes('manage-grades')) { ... }
```

---

## 7. Struktur Frontend — Lokasi File Aktual

```
frontend/src/
├── app/
│   ├── (auth)/login/               # Halaman login
│   ├── sso-callback/               # Google SSO callback
│   ├── dashboard/                  # Semua halaman terproteksi
│   │   ├── page.tsx                # Dashboard utama
│   │   ├── layout.tsx              # Layout dengan sidebar
│   │   ├── academic/               # Stase, kompetensi, fakultas
│   │   ├── clinical/               # Logbook, absensi, evaluasi, verifikasi
│   │   ├── rotation/ & rotations/  # RS, periode, penempatan
│   │   ├── assessments/            # Penilaian
│   │   ├── examinations/           # Ujian & OSCE
│   │   ├── finance/                # Billing & honorarium
│   │   ├── grades/                 # Nilai & transkrip
│   │   ├── incidents/              # Insiden
│   │   ├── preceptor/              # View khusus Dodiknis
│   │   ├── examiner/               # View khusus penilai OSCE
│   │   ├── settings/               # Pengaturan sistem & RBAC
│   │   └── users/                  # Manajemen pengguna
│   └── safety/                     # Halaman publik (SOP, kontak)
├── components/
│   ├── ui/                         # 20+ shadcn/ui components
│   ├── layout/AppSidebar.tsx       # Navigasi sidebar (permission-based)
│   ├── layout/BottomNav.tsx        # Navigasi mobile
│   └── NotificationBell.tsx        # Notifikasi dropdown
├── store/useAuthStore.ts            # Auth state (Zustand, persist localStorage)
└── lib/api.ts                       # Axios instance (CSRF + interceptor 401)
```

> ⚠️ Tidak ada folder `src/features/` atau `src/types/` — ini hanya ada di design doc, belum diimplementasi.

---

## 8. UI/Design Rules (UMS Branding)

```
Warna Primer (UMS Blue):   bg-blue-900 (#1E3A8A) — tombol utama, sidebar aktif
Warna Aksen (UMS Gold):    bg-yellow-500 (#EAB308) — highlight, aksi primer
Warna Teks Utama:          text-gray-900 / text-gray-800
Warna Background:          bg-white / bg-gray-50
Dark mode:                 Didukung via CSS variables (.dark class)
Border radius:             rounded-md (default shadcn)
Card style:                Gunakan class .clean-card (custom utility di globals.css)
```

- **Jangan** mengubah palet warna tanpa persetujuan — ini adalah identitas UMS
- Gunakan komponen shadcn/ui yang sudah ada di `src/components/ui/`
- Charts: gunakan **Recharts** dengan warna dari CSS variable `--chart-1` hingga `--chart-5`
- Icons: **Lucide React** saja — jangan install icon library lain
- Detail lengkap: `Build/UI_DESIGN_SYSTEM.md`

---

## 9. Pola Kode Wajib

### Backend (Laravel)

```php
// ✅ THIN Controller — hanya HTTP, tidak ada business logic
class LogbookController extends Controller {
    public function store(StoreLogbookRequest $request, LogbookService $service) {
        $entry = $service->createEntry($request->validated(), auth()->user());
        return new LogbookResource($entry);
    }
}

// ✅ Business logic di Service layer
class LogbookService {
    public function createEntry(array $data, User $user): LogbookEntry { ... }
}

// ✅ Validasi di Form Request (bukan di controller)
class StoreLogbookRequest extends FormRequest {
    public function rules(): array {
        return [
            'activity_type' => 'required|exists:system_references,value,category,activity_types',
        ];
    }
}

// ✅ Return via API Resource
return new LogbookResource($entry);        // single
return LogbookCollection::make($entries);  // collection
```

### Frontend (Next.js/TypeScript)

```tsx
// ✅ 'use client' hanya saat perlu state/event
'use client';

// ✅ Server state via React Query
const { data, isLoading } = useQuery({
  queryKey: ['logbooks', filters],
  queryFn: () => api.get('/api/v1/clinical/logbooks', { params: filters }),
  staleTime: 5 * 60 * 1000, // 5 menit — jangan spam API
});

// ✅ Form dengan React Hook Form + Zod v4
const schema = z.object({ description: z.string().min(10) });
const form = useForm({ resolver: zodResolver(schema) });

// ✅ Tidak ada 'any' — define types
interface LogbookEntry {
  id: string;
  status: 'draft' | 'submitted' | 'signed' | 'rejected';
}
```

---

## 10. API Route — Status Aktual

Routes **belum sepenuhnya konsisten** dalam versioning. Gunakan ini sebagai referensi:

| Route Area | Prefix | File |
|------------|--------|------|
| Auth | `/api/auth/*` | `Modules/Auth/routes/api.php` |
| SSO | `/api/sso/*` | `Modules/Auth/routes/api.php` |
| Academic | `/api/academic/*` | `Modules/Academic/routes/api.php` |
| Rotation | `/api/v1/rotation/*` | `Modules/Rotation/routes/api.php` |
| Clinical | `/api/v1/clinical/*` | `Modules/Clinical/routes/api.php` |
| Assessment | `/api/v1/assessments/*` | `Modules/Assessment/routes/api.php` |
| Examination | `/api/v1/examinations/*` | `Modules/Examination/routes/api.php` |
| Finance | `/api/v1/finance/*` | `Modules/Finance/routes/api.php` |
| Attendance | `/api/v1/clinical/attendance/*` | `Modules/Attendance/routes/api.php` |
| Dashboard | `/api/dashboard/*` | `backend/routes/api.php` |
| Users | `/api/users` | `backend/routes/api.php` |
| Settings | `/api/settings` | `backend/routes/api.php` |
| References | `/api/system-references` | `backend/routes/api.php` |
| Notifications | `/api/v1/notifications` | `backend/routes/api.php` |
| Analytics | `/api/analytics` | `backend/routes/api.php` |
| Export | `/api/export/*` | `backend/routes/api.php` |

> Untuk route baru — ikuti pola modul yang bersangkutan. Jangan buat route di file yang salah.

---

## 11. Workflow Status Universal

Semua entitas mengikuti workflow ini:

```
draft → submitted → verified/approved → published
```

Khusus Logbook:
```
draft → submitted → signed (approved) / rejected (kembali ke draft)
```

---

## 12. Git Commit Format

Wajib mengikuti Conventional Commits. Format:
```
<type>(<scope>): <subject>

feat(clinical): tambah endpoint verifikasi logbook batch
fix(rotation): koreksi perhitungan kapasitas RS saat konflik jadwal
chore(deps): update zod ke v4.4.3
```

Scope yang valid: `auth`, `academic`, `rotation`, `clinical`, `assessment`, `examination`, `finance`, `attendance`, `evaluation`, `incident`, `core`, `ui`, `deps`, `config`

Detail lengkap: `Build/CONVENTIONAL_COMMITS.md`

---

## 13. Navigasi Dokumen Referensi

| Butuh Info Tentang | Baca File |
|-------------------|-----------|
| Semua aturan wajib AI | `Build/CURRENT_STATE_FOR_AI.md` |
| Index semua dokumen | `Build/CONTEXT_INDEX.md` |
| Arsitektur sistem | `Build/ARCHITECTURE.md` |
| Skema database lengkap | `Build/DATABASE_SCHEMA.md` |
| Spesifikasi API | `Build/API_SPECIFICATION.md` |
| RBAC detail (siapa boleh apa) | `Build/RBAC_MATRIX.md` |
| Alur kerja (workflow states) | `Build/WORKFLOW_ENGINE.md` |
| Algoritma penjadwalan rotasi | `Build/ROTATION_ENGINE.md` |
| Audit trail spec | `Build/AUDIT_TRAIL_SPEC.md` |
| Analytics dashboard | `Build/ANALYTICS_SPEC.md` + `Develop/EXECUTIVE_ANALYTICS_DESIGN.md` |
| UI/Design system | `Build/UI_DESIGN_SYSTEM.md` |
| Standar kode | `Build/CODING_STANDARDS.md` |
| Standar commit | `Build/CONVENTIONAL_COMMITS.md` |
| Backlog fitur | `Build/PRODUCT_BACKLOG.md` |
| Roadmap implementasi | `Build/IMPLEMENTATION_ROADMAP.md` |
| Sprint plan (Develop phase) | `Develop/UPGRADE_ROADMAP.md` |
| Sistem absensi QR | `Develop/SMART_ATTENDANCE_SYSTEM.md` |
| Analytics eksekutif | `Develop/EXECUTIVE_ANALYTICS_DESIGN.md` |
| Generator PDF yudisium | `Develop/YUDISIUM_DOCUMENT_GENERATOR.md` |
| Notifikasi SMTP matrix | `Develop/GLOBAL_NOTIFICATION_HOOKS.md` |
| Protokol AI agent | `Develop/DEVELOPMENT_AGENTS.md` |
