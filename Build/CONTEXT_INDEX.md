# ACMS — AI Context Index

**Document ID**: ACMS-IDX-001  
**Last Updated**: 2026-06-20  
**Purpose**: Peta navigasi seluruh dokumen referensi ACMS. Gunakan index ini untuk menemukan file yang tepat sebelum mengerjakan fitur apapun.

> **Start Here:** Sebelum mengerjakan task apapun, baca `CLAUDE.md` di root project dan `Build/CURRENT_STATE_FOR_AI.md`. Kemudian gunakan index ini untuk navigasi ke dokumen spesifik.

---

## 1. Dokumen Fondasi (Selalu Baca Pertama)

| Prioritas | File | Isi | Kapan Dibaca |
|-----------|------|-----|--------------|
| 🔴 P0 | `CLAUDE.md` | Aturan wajib, tech stack aktual, cara menjalankan project, pola kode | **Setiap sesi baru** |
| 🔴 P0 | `Build/CURRENT_STATE_FOR_AI.md` | Status sistem terkini, constraints wajib, perbedaan desain vs implementasi aktual | **Setiap sesi baru** |
| 🟡 P1 | `Build/ARCHITECTURE.md` | Arsitektur sistem lengkap (20 section), diagram C4, event-driven design, multi-tenancy | Saat merancang fitur baru atau memahami sistem |
| 🟡 P1 | `Build/RBAC_MATRIX.md` | Matriks lengkap siapa boleh apa (8 peran × 11 kategori resource) + dynamic permissions | Saat ada endpoint/halaman baru yang perlu proteksi |
| 🟡 P1 | `Build/DATABASE_SCHEMA.md` | Skema tabel, ERD, konvensi kolom, desain relasi antar domain | Saat membuat migration atau query kompleks |

---

## 2. Index Berdasarkan Modul / Fitur

### 🔐 Auth & User Management
| File | Relevansi |
|------|-----------|
| `Build/RBAC_MATRIX.md` §2, §3, §9 | Definisi 8 peran, action codes, endpoint authorization map |
| `Build/RBAC_MATRIX.md` §5 | Row-Level Security rules — siapa lihat data siapa |
| `Build/RBAC_MATRIX.md` §7 | Delegation rules (KP bisa delegate ke AP) |
| `Build/RBAC_MATRIX.md` §8 | Dynamic permissions (berubah berdasarkan state resource) |
| `Build/ARCHITECTURE.md` §9 | Auth flow diagram (SSO OIDC, JWT, Sanctum cookies) |
| `Build/DATABASE_SCHEMA.md` §3.1 | Tabel `users`, `roles`, `permissions`, Spatie schema |
| `Build/CODING_STANDARDS.md` §2 | Laravel backend standards (thin controller, form request) |

---

### 🎓 Akademik (Academic)
| File | Relevansi |
|------|-----------|
| `Build/DATABASE_SCHEMA.md` §3.2 | Tabel `programs`, `stase`, `students`, `cohorts` |
| `Build/API_SPECIFICATION.md` §2.2 | Endpoint akademik (programs, stase, students, enroll) |
| `Build/RBAC_MATRIX.md` §4.2 | Siapa yang bisa CRUD curriculum, stase, enrollment |
| `Build/WORKFLOW_ENGINE.md` | Alur enrollment mahasiswa, perubahan status |
| `Build/PRODUCT_BACKLOG.md` Epic 2 | Backlog fitur enrollment & student management |

---

### 🏥 Rotasi Klinik (Rotation)
| File | Relevansi |
|------|-----------|
| `Build/ROTATION_ENGINE.md` | Algoritma penjadwalan rotasi, constraint satisfaction, conflict detection |
| `Build/DATABASE_SCHEMA.md` §3.3 | Tabel `hospitals`, `rotation_periods`, `rotation_assignments`, `hospital_capacities` |
| `Build/API_SPECIFICATION.md` §2.3 | Endpoint rotation (periods, assignments, auto-assign, swaps) |
| `Build/RBAC_MATRIX.md` §4.3 | Permission rotasi: siapa create/approve/swap |
| `Build/WORKFLOW_ENGINE.md` WF-001, WF-002, WF-003 | Lifecycle rotation period, assignment, swap request |
| `Build/PRODUCT_BACKLOG.md` Epic 3 | Backlog rotation scheduling features |
| `Develop/UPGRADE_ROADMAP.md` | Sprint plan untuk fitur rotasi lanjutan |

---

### 📋 Logbook Klinis (Clinical)
| File | Relevansi |
|------|-----------|
| `Build/DATABASE_SCHEMA.md` §3.4 | Tabel `logbook_entries`, `procedures`, `diagnoses` |
| `Build/API_SPECIFICATION.md` §2.4 | Endpoint logbook (create, sign-off, reject) |
| `Build/RBAC_MATRIX.md` §4.4 | Permission logbook: MH create, DO/DK sign-off |
| `Build/WORKFLOW_ENGINE.md` WF-004 | Logbook entry lifecycle (draft → submitted → signed/rejected) |
| `Build/AUDIT_TRAIL_SPEC.md` | Audit logging untuk setiap aksi logbook |
| `Develop/GLOBAL_NOTIFICATION_HOOKS.md` | SMTP hooks untuk notifikasi logbook |
| `Build/PRODUCT_BACKLOG.md` Epic 4 | Backlog fitur logbook |

---

### ⭐ Penilaian / Assessment
| File | Relevansi |
|------|-----------|
| `Build/DATABASE_SCHEMA.md` §3.5 | Tabel `assessments` (Mini-CEX/DOPS/CBD), `stase_grades` |
| `Build/API_SPECIFICATION.md` §2.5 | Endpoint assessment (create, grades, approve) |
| `Build/RBAC_MATRIX.md` §4.5 | Permission: DO/DK create, KP approve, MH view-own |
| `Build/WORKFLOW_ENGINE.md` WF-005, WF-006 | Assessment lifecycle, grade approval workflow |
| `Develop/GLOBAL_NOTIFICATION_HOOKS.md` | Hook `grade_published` untuk notifikasi nilai |
| `Develop/YUDISIUM_DOCUMENT_GENERATOR.md` | Cara generate transkrip dari data assessment |

---

### 📝 Ujian / Examination (OSCE, CBT, Written)
| File | Relevansi |
|------|-----------|
| `Build/DATABASE_SCHEMA.md` | Tabel `exams`, `exam_stations`, `exam_participants`, `exam_scores` |
| `Build/API_SPECIFICATION.md` | Endpoint examinations |
| `Build/RBAC_MATRIX.md` §4.6 | Permission ujian: AP create, DO score, KP publish, MH take |
| `Build/WORKFLOW_ENGINE.md` WF-010 | OSCE session lifecycle |
| `Develop/GLOBAL_NOTIFICATION_HOOKS.md` | Hook `exam_schedule_released` |
| `Build/PRODUCT_BACKLOG.md` Epic setelah MVP | Backlog fitur ujian |

---

### 📍 Absensi GPS (Attendance)
| File | Relevansi |
|------|-----------|
| `Develop/SMART_ATTENDANCE_SYSTEM.md` | **Blueprint lengkap** sistem QR + Geofencing |
| `Develop/DEVELOPMENT_AGENTS.md` §3 | Rules untuk AI agent yang membangun modul ini |
| `Develop/UPGRADE_ROADMAP.md` Sprint 1 | Sprint plan implementasi attendance |

**Tabel yang dibutuhkan (belum dibuat, sesuai blueprint):**
- `attendance_sessions` — sesi presensi yang dibuka oleh CI/instructor
- `attendance_records` (sudah ada sebagian) — catatan check-in mahasiswa

**Algoritma kunci:** Haversine distance → harus ada di `AttendanceService.php`, bukan controller.

---

### 💰 Keuangan (Finance)
| File | Relevansi |
|------|-----------|
| `Build/DATABASE_SCHEMA.md` §3.6 | Tabel `billings`, `honorariums` |
| `Build/API_SPECIFICATION.md` §2.6 | Endpoint finance (honorariums, disburse, billings) |
| `Build/RBAC_MATRIX.md` §4.7 | Permission keuangan: FN manage, KP approve |
| `Build/WORKFLOW_ENGINE.md` WF-007, WF-009 | Honorarium processing, invoice lifecycle |
| `Develop/GLOBAL_NOTIFICATION_HOOKS.md` | Hook `invoice_issued`, `tuition_overdue` |

---

### 🚨 Insiden (Incident)
| File | Relevansi |
|------|-----------|
| `Build/DATABASE_SCHEMA.md` §5 | Tabel `incident_reports` |
| `Build/RBAC_MATRIX.md` | Permission insiden |
| `Build/CURRENT_STATE_FOR_AI.md` §B | Aturan: tipe insiden dari system_references, bukan hardcoded |

---

### 📊 Analytics & Dashboard
| File | Relevansi |
|------|-----------|
| `Develop/EXECUTIVE_ANALYTICS_DESIGN.md` | **Blueprint lengkap** dashboard eksekutif (KPI, layout, endpoint) |
| `Develop/DEVELOPMENT_AGENTS.md` §2 | Rules untuk AI agent analytics (no count() dalam loop, staleTime) |
| `Build/ANALYTICS_SPEC.md` | Spesifikasi KPI, definisi metrics, report types |
| `Develop/UPGRADE_ROADMAP.md` Sprint 2 | Sprint plan analytics |

**Endpoint target:** `GET /api/v1/analytics/executive`  
**Controller target:** `ExecutiveAnalyticsController`  
**Wajib:** TanStack Query `staleTime` untuk caching chart data

---

### 🔔 Notifikasi & SMTP
| File | Relevansi |
|------|-----------|
| `Develop/GLOBAL_NOTIFICATION_HOOKS.md` | **Peta lengkap** semua event yang harus di-hook ke SMTP matrix |
| `Build/CURRENT_STATE_FOR_AI.md` §C | Aturan wajib: JANGAN hardcode email routing |
| `Build/ARCHITECTURE.md` §14 | Arsitektur notification (Notification Router, channels) |

**Service implementasi:** `backend/app/Services/NotificationService.php`  
**Matrix config:** Tabel `settings` key `smtp_notification_matrix`

---

### 📄 Yudisium & Transkrip PDF
| File | Relevansi |
|------|-----------|
| `Develop/YUDISIUM_DOCUMENT_GENERATOR.md` | **Blueprint lengkap** generate transkrip PDF, watermark QR |
| `Develop/DEVELOPMENT_AGENTS.md` §4 | Rules: WAJIB pakai Queue/Job, Blade component, background progress UI |
| `Develop/UPGRADE_ROADMAP.md` Sprint 3 | Sprint plan yudisium |

**Endpoint target:**
- `POST /api/v1/yudisium/generate-transcript` → trigger background job
- `GET /api/v1/yudisium/my-documents` → status job
- `GET /api/public/verify/{hash}` → halaman publik verifikasi

**Arsitektur wajib:** Laravel Queue Job (jangan render PDF sync di controller)

---

### 🔍 Audit Trail
| File | Relevansi |
|------|-----------|
| `Build/AUDIT_TRAIL_SPEC.md` | Spesifikasi lengkap audit trail: schema, hash chaining, event catalog |
| `Build/DATABASE_SCHEMA.md` §3.7 | Tabel `audit_logs` (append-only, immutable) |
| `Build/RBAC_MATRIX.md` §4.10 | Siapa boleh melihat audit logs |

**Status:** Belum diimplementasi. Tabel `audit_logs` belum dibuat. Prioritas tinggi sebelum go-live.

---

## 3. Index Berdasarkan Jenis Dokumen

### 📐 Spesifikasi Teknis (Build/)
| File | Deskripsi Singkat | Status |
|------|-------------------|--------|
| `CURRENT_STATE_FOR_AI.md` | Versi aktual, aturan wajib, gap desain vs implementasi | ✅ Updated |
| `CONTEXT_INDEX.md` | **File ini** — peta navigasi semua dokumen | ✅ New |
| `ARCHITECTURE.md` | Arsitektur sistem, 20 section, Mermaid diagrams | ✅ Draft |
| `DATABASE_SCHEMA.md` | Skema lengkap semua tabel per domain | ✅ Draft |
| `API_SPECIFICATION.md` | Standard response, endpoint list per domain | ✅ Draft |
| `RBAC_MATRIX.md` | Matriks permission lengkap 8×11, dynamic permissions | ✅ Draft |
| `WORKFLOW_ENGINE.md` | 10 workflow definitions dengan state machines | ✅ Approved |
| `ROTATION_ENGINE.md` | Algoritma penjadwalan rotasi, conflict detection | ✅ Draft |
| `AUDIT_TRAIL_SPEC.md` | Audit trail spec, hash chaining, event catalog | ✅ Approved |
| `ANALYTICS_SPEC.md` | KPI definitions, report types, dashboard specs | ✅ Draft |
| `UI_DESIGN_SYSTEM.md` | UMS color palette, Tailwind conventions, component rules | ✅ v1.0 |
| `CODING_STANDARDS.md` | Laravel + TypeScript standards, architecture rules | ✅ Draft |
| `CONVENTIONAL_COMMITS.md` | Format commit wajib, scopes, CI enforcement | ✅ Approved |
| `PRD.md` | Product requirements, user personas, business rules | ✅ Draft |
| `PRODUCT_BACKLOG.md` | Backlog per epic (MVP s/d Phase 3) | ✅ v1.0 |
| `IMPLEMENTATION_ROADMAP.md` | Timeline 3 phase, sprint plan, resource requirements | ✅ v1.0 |
| `DEPLOYMENT.md` | Prosedur deployment, Docker config, environment setup | — |
| `REVIEW_REPORT.md` | Laporan review kualitas dokumen Build | ✅ Complete |
| `GAP_ANALYSIS.md` | Analisis gap dokumentasi enterprise (14 gap teridentifikasi) | ✅ Complete |
| `ARCHITECTURE_REVIEW.md` | Review arsitektur sistem | ✅ |
| `AI_AGENT_INSTRUCTIONS.md` | Instruksi khusus untuk AI agent | — |
| `PROMPT_LIBRARY.md` | Library prompt untuk operasi umum | — |

### 🚀 Blueprint Pengembangan (Develop/)
| File | Deskripsi Singkat | Sprint |
|------|-------------------|--------|
| `DEVELOPMENT_AGENTS.md` | Protokol AI agent untuk folder Develop, rules per modul | Semua |
| `UPGRADE_ROADMAP.md` | Sprint 1-3 timeline implementasi Develop phase | Planning |
| `SMART_ATTENDANCE_SYSTEM.md` | Sistem QR presensi + geofencing + TOTP token | Sprint 1 |
| `EXECUTIVE_ANALYTICS_DESIGN.md` | Dashboard eksekutif: KPI, layout Recharts, endpoint spec | Sprint 2 |
| `GLOBAL_NOTIFICATION_HOOKS.md` | Peta semua event → SMTP matrix hooks | Sprint 2 |
| `YUDISIUM_DOCUMENT_GENERATOR.md` | PDF generator yudisium: Queue job, Blade template, QR watermark | Sprint 3 |

---

## 4. Quick Decision Guide — Pilih File yang Tepat

### "Mau buat endpoint baru, apa yang perlu dibaca?"
1. `CLAUDE.md` §4 (Aturan A — RBAC protection)
2. `Build/RBAC_MATRIX.md` §9 (endpoint authorization map)
3. `Build/API_SPECIFICATION.md` §1 (response envelope format)
4. `Build/CODING_STANDARDS.md` §2 (thin controller, form request, API resource)

### "Mau buat migration / tabel baru, apa yang perlu dibaca?"
1. `Build/DATABASE_SCHEMA.md` §1 (konvensi UUID, soft deletes, timestamps)
2. `CLAUDE.md` §4D (aturan MySQL-compatible syntax)
3. `Build/DATABASE_SCHEMA.md` §3.x (cek apakah tabel sudah ada di domain yang relevan)

### "Mau buat halaman/komponen frontend baru, apa yang perlu dibaca?"
1. `Build/UI_DESIGN_SYSTEM.md` (warna UMS, komponen rules)
2. `Build/CODING_STANDARDS.md` §3 (TypeScript, React patterns)
3. `CLAUDE.md` §7 (struktur folder frontend aktual)
4. `Build/RBAC_MATRIX.md` (permission apa yang dibutuhkan untuk halaman ini)

### "Mau tambah notifikasi email ke fitur baru, apa yang perlu dibaca?"
1. `Develop/GLOBAL_NOTIFICATION_HOOKS.md` (mapping event → matrix key)
2. `Build/CURRENT_STATE_FOR_AI.md` §C (aturan SMTP matrix)
3. `backend/app/Services/NotificationService.php` (implementasi aktual)

### "Mau implementasi modul baru dari Develop phase, apa yang perlu dibaca?"
1. `Develop/DEVELOPMENT_AGENTS.md` (rules per modul)
2. `Develop/UPGRADE_ROADMAP.md` (sprint context)
3. File spesifik modul di Develop/ (SMART_ATTENDANCE_SYSTEM.md, dll)
4. `Build/CURRENT_STATE_FOR_AI.md` (aturan global yang tetap berlaku)

### "Mau cek apakah fitur X sudah ada di backlog, di mana?"
→ `Build/PRODUCT_BACKLOG.md` — diorganisir per Epic

### "Butuh tahu format commit yang benar?"
→ `Build/CONVENTIONAL_COMMITS.md` §2, §9 (format + examples)

---

## 5. State Implementasi — Yang Sudah Ada vs Yang Belum

### ✅ Sudah Diimplementasi (cek di kode)
- Auth (login, logout, SSO Google)
- RBAC (8 roles, Spatie permission, middleware)
- System References (master data dinamis)
- Settings + SMTP Matrix Engine
- Academic (fakultas, program, stase, kohort, mahasiswa, kompetensi)
- Rotation (RS, periode, penempatan, kapasitas)
- Clinical (logbook, prosedur, diagnosis, verifikasi)
- Assessment (Mini-CEX, DOPS, CBD, nilai stase, transkrip)
- Examination (OSCE, CBT, peserta, penilai, skor)
- Finance (billing RS, honorarium preceptor)
- Attendance (check-in/out GPS — basic, geofencing belum)
- Evaluation (kuesioner)
- Incident (pelaporan insiden)
- Notifikasi in-app (tabel `notifications`)
- Dashboard analytics (basic, `AnalyticsController`)
- Export PDF & Excel (basic, `ExportController`)
- Laravel Pulse monitoring

### 🔧 Belum Diimplementasi / Sprint Develop
| Fitur | Prioritas | Spec di |
|-------|-----------|---------|
| Audit Trail (`audit_logs` table + observer) | 🔴 Tinggi | `Build/AUDIT_TRAIL_SPEC.md` |
| GPS Geofencing absensi (Haversine) | 🔴 Tinggi | `Develop/SMART_ATTENDANCE_SYSTEM.md` |
| QR code TOTP absensi | 🔴 Tinggi | `Develop/SMART_ATTENDANCE_SYSTEM.md` |
| File upload logbook (PDF/image ke storage) | 🔴 Tinggi | `Build/PRODUCT_BACKLOG.md` FEAT-4.1 |
| Bulk import mahasiswa (CSV) | 🟡 Medium | `Build/PRODUCT_BACKLOG.md` FEAT-2.2 |
| Rotation swap request | 🟡 Medium | `Build/PRODUCT_BACKLOG.md` FEAT-3.3 |
| Executive analytics dashboard | 🟡 Medium | `Develop/EXECUTIVE_ANALYTICS_DESIGN.md` |
| SMTP hooks global (semua modul) | 🟡 Medium | `Develop/GLOBAL_NOTIFICATION_HOOKS.md` |
| Yudisium PDF generator + QR watermark | 🟢 Low | `Develop/YUDISIUM_DOCUMENT_GENERATOR.md` |
| Real-time notifikasi (SSE/WebSocket) | 🟢 Low | `Build/ARCHITECTURE.md` §14 |
| i18n Bahasa Indonesia (next-intl) | 🟢 Low | `Build/ARCHITECTURE.md` §20.4 |

---

## 6. Lokasi File Kode Kunci (Quick Reference)

```
backend/
├── app/
│   ├── Http/Controllers/Api/
│   │   ├── AnalyticsController.php     # Dashboard stats & analytics
│   │   ├── DashboardController.php     # Dashboard homepage stats
│   │   ├── ExportController.php        # PDF/Excel exports
│   │   ├── NotificationController.php  # In-app notifications
│   │   ├── RolePermissionController.php# RBAC management
│   │   ├── SettingController.php       # System settings + SMTP matrix
│   │   ├── SystemReferenceController.php# Master data / dropdowns
│   │   └── UserController.php          # User management
│   ├── Services/
│   │   └── NotificationService.php     # SMTP Matrix Engine — KRUSIAL
│   ├── Console/Commands/
│   │   ├── AggregateDashboardAnalytics.php
│   │   └── AutoVerifyLogbooks.php
│   └── Models/
│       ├── User.php                    # Core user model
│       ├── Setting.php                 # Settings model
│       ├── SystemReference.php         # Master data model
│       └── AnalyticsSummary.php
├── Modules/[ModuleName]/
│   ├── app/Http/Controllers/           # Controller module
│   ├── app/Models/                     # Eloquent models
│   ├── app/Services/                   # Business logic
│   ├── routes/api.php                  # Routes modul ini
│   └── database/migrations/            # Migrations modul ini
├── database/
│   ├── seeders/
│   │   ├── RolePermissionSeeder.php    # ⭐ Daftar roles & permissions
│   │   ├── SystemReferenceSeeder.php   # Master data awal
│   │   ├── SettingSeeder.php           # Settings + SMTP matrix config
│   │   └── DatabaseSeeder.php          # Entry point seeder
│   └── database.sqlite                 # SQLite fallback
├── routes/api.php                      # Route utama (bukan module)
└── .env                                # Konfigurasi aktual (DB, URL, dll)

frontend/src/
├── app/dashboard/                      # Semua halaman dashboard
├── components/ui/                      # shadcn/ui components
├── components/layout/AppSidebar.tsx    # Sidebar navigasi (permission-based)
├── store/useAuthStore.ts               # ⭐ Auth state (Zustand)
├── lib/api.ts                          # ⭐ Axios instance (CSRF, interceptor)
└── lib/utils.ts                        # cn() dan utility lainnya
```
