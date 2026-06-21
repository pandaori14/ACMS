# API Conventions — ACMS

> Standar kontrak API ACMS. Setiap endpoint baru WAJIB mengikuti dokumen ini.
> Status adopsi & rencana migrasi ada di bagian akhir.

---

## 1. Versioning Prefix

Aturan: **modul domain** berada di bawah `/api/v1/{modul}`; **endpoint platform/otentikasi** boleh tanpa versi.

| Lapisan | Prefix | Contoh |
|---------|--------|--------|
| Domain (bisnis) | `/api/v1/{modul}` | `/api/v1/incidents`, `/api/v1/clinical`, `/api/v1/academic` |
| Otentikasi | `/api/auth`, `/api/sso` | `/api/auth/login` — konvensi umum di luar versi |
| Platform/Admin | `/api/{resource}` | `/api/users`, `/api/settings`, `/api/system-references`, `/api/dashboard`, `/api/analytics` |

**Catatan:** `Academic` distandarkan dari `/api/academic` → **`/api/v1/academic`** (2026-06-21).
Prefix lama `/api/academic/*` dipertahankan sebagai **alias DEPRECATED** (lihat
`Modules/Academic/routes/api.php`) agar pemanggil lama tidak putus; hapus setelah
semua klien bermigrasi. Semua pemanggilan frontend sudah memakai `/api/v1/academic`.

---

## 2. Success Envelope

Konsisten di seluruh endpoint:

| Kasus | Bentuk | Contoh |
|-------|--------|--------|
| Item tunggal | `{ "data": { ... } }` | `GET /incidents/{id}` |
| Daftar (paginasi) | `{ "data": [ ... ], "meta": { current_page, last_page, per_page, total } }` | `GET /incidents` |
| Mutasi (create/update) | `{ "message": "...", "data": { ... } }` | `POST /incidents/report` |
| Unduhan file | binary stream (`response()->download`) | lampiran |

`meta` paginasi minimal memuat `current_page`, `last_page`, `per_page`, `total`.

---

## 3. Error Envelope

Ditangani **global** di `backend/bootstrap/app.php` (`shouldRenderJsonWhen`):
respons error untuk `api/*` atau `expectsJson()` selalu JSON terstruktur
(`message`, dan `errors` untuk 422). Jangan membentuk error JSON manual yang
berbeda format di controller.

- `401` belum terotentikasi · `403` tanpa izin (RBAC) · `404` tidak ditemukan
- `422` validasi (`{ message, errors: { field: [...] } }`) · `429` rate-limit (lihat `AuthController`)

---

## 4. API Resources (Lapisan Presentasi)

Bentuk payload **harus** lewat API Resource (`Illuminate\Http\Resources\Json\JsonResource`),
bukan dirakit manual dari model. Manfaat: kontrak terpusat, decoupling dari kolom DB,
dan penegakan penyembunyian data sensitif di satu tempat.

**Referensi (pola baku):** modul Insiden —
`Modules/Incident/app/Http/Resources/IncidentReportResource.php` &
`ConsultationResource.php`.

Contoh di controller (mempertahankan envelope di atas):

```php
// daftar
'data' => IncidentReportResource::collection(collect($paginated->items()))->resolve($request),
// tunggal / mutasi
'data' => (new IncidentReportResource($report))->resolve($request),
```

`IncidentReportResource` menegakkan **masking identitas pelapor anonim** untuk
pengguna tanpa izin `view-anonymous-identity` (pertahanan berlapis — berlaku apa pun
pemanggilnya). Dikunci oleh tes `IncidentTest::test_anonymous_identity_is_masked_in_response_without_permission`.

---

## 5. Status Adopsi & Migrasi

| Aspek | Status |
|-------|--------|
| Versioning domain (`/api/v1`) | ✅ Konsisten (Academic sudah distandarkan) |
| Success/Error envelope | ✅ Terdefinisi; Insiden/Konsultasi sebagai acuan |
| API Resource | 🔄 Insiden/Konsultasi **selesai** sebagai pola; modul lain **dicicil per-modul** |

**Migrasi Resource bertahap (aman):** konversi modul lain dilakukan **per modul**
disertai verifikasi konsumen frontend-nya, bukan sekaligus, karena tiap modul
punya kopling bentuk payload tersendiri. Urutan menyusul prioritas di
`PLAN`/roadmap enterprise.
