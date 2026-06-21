# Protokol Agen Pengembangan (AI Agent Guidelines)

Dokumen ini berisi standar instruksi (*System Prompt*) yang diwajibkan bagi Agen AI (seperti model arsitektur pemrograman) ketika ditugaskan mengeksekusi cetak biru dari folder `Develop`.

## 1. Identitas Global
- **Framework Sasaran:** Laravel **12** (Backend), Next.js **15** App Router dengan React **19** (Frontend), Tailwind CSS v4 (Styling).
- **Runtime:** PHP **8.2+**, TypeScript 5 (strict mode), Zod **v4** (bukan v3).
- **Database (Dev):** MySQL via XAMPP. **Database (Prod Target):** PostgreSQL 17. Tulis migrasi yang kompatibel dengan MySQL.
- **Filsafat Kode:** Mengikuti standar *Clean Architecture* dan *SOLID principles*.
- **Kendali Super Admin:** Seluruh sistem berbasis *dropdown* yang dibangun HARUS mengambil data dari `SystemReference` API, bukan nilai *hardcoded*.
- **Penamaan Permission:** Gunakan format kebab-case (contoh: `view-logbook`, `manage-settings`), BUKAN dot notation. Lihat `backend/database/seeders/RolePermissionSeeder.php` untuk daftar lengkap.

## 2. Agen Pembuat Dasbor Analitik (`EXECUTIVE_ANALYTICS_DESIGN.md`)
Jika Anda dipanggil untuk membangun modul *Analitik*:
1. DILARANG menghitung jumlah baris (*count()*) pada *looping*. Gunakan kueri Agregat bawaan SQL/Eloquent (`DB::raw('COUNT(*)')`).
2. HARUS menerapkan skema *TanStack Query* (`@tanstack/react-query`) di Frontend dengan fitur `staleTime` agar tidak mengebom *database* dengan permintaan data grafik yang sama berkali-kali setiap *user* mengganti halaman.
3. HARUS menggunakan palet warna standar dari desain sistem sebelumnya. Jangan gunakan warna *default* *browser* yang memecah konsistensi desain UI (*Rich Aesthetics*).

## 3. Agen Pembuat Sistem QR Presensi (`SMART_ATTENDANCE_SYSTEM.md`)
Jika Anda dipanggil untuk membangun modul *Attendance*:
1. Pastikan Anda mengimpor paket enkripsi TOTP (atau membuat sistem validasi token berbasis `Cache::put`) yang berumur singkat (maks. 60 detik).
2. Tulis penanganan gagal (*graceful error handling*) di sisi klien (*Frontend*) jika pengguna menolak memberikan akses lokasi (`navigator.geolocation.getCurrentPosition`).
3. Algoritma Haversine (penghitung jarak latitude/longitude dalam meter) harus ditempatkan secara eksklusif di dalam *Service Layer* Backend (`AttendanceService.php`), BUKAN di *Controller*.

## 4. Agen Pembuat Generator Yudisium (`YUDISIUM_DOCUMENT_GENERATOR.md`)
Jika Anda dipanggil untuk membangun pembuatan PDF:
1. HARUS memisahkan proses *rendering* PDF menggunakan sistem `Jobs` Laravel (`php artisan make:job GenerateTranscriptPDF`). DILARANG membuat *endpoint* merender langsung yang menahan *thread server*.
2. Gunakan *Blade Component* untuk mendesain cetakan HTML yang rapi (menyamai kertas A4) sebelum dilempar ke `dompdf`.
3. Buatkan komponen UI pemantauan latar belakang (misal: "Dokumen sedang disiapkan (45%)") di halaman mahasiswa.
