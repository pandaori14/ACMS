# Smart Attendance System (Sistem Presensi Pintar Berbasis QR)

## 1. Visi Modul
Menggantikan tanda tangan fisik mahasiswa kedokteran pada selembar kertas selama stase klinis. Modul ini menjamin bahwa mahasiswa benar-benar hadir secara fisik di lokasi stase pada waktu yang tepat.

## 2. Mekanisme Kerja (Alur Pengguna)

### Sudut Pandang Dosen / Clinical Instructor (CI)
1. CI membuka modul **Jadwal Jaga / Rotasi** di *smartphone* atau komputer.
2. Memilih shift yang sedang berlangsung (misal: Jaga IGD Pagi).
3. Menekan tombol **"Buka Sesi Presensi"**.
4. Sistem akan menampilkan kode QR berukuran besar di layar perangkat CI.
5. *Keamanan:* Kode QR ini bersifat statis selama sesi dibuka, TETAPI memiliki token waktu (TOTP-*like*) yang akan diperbarui di latar belakang (mencegah mahasiswa memfoto kode QR dan mengirimkannya ke teman di rumah kos).

### Sudut Pandang Mahasiswa (Koass)
1. Mahasiswa membuka aplikasi web ACMS dari *smartphone* mereka.
2. Mengakses menu **Pindai Kehadiran (Scan QR)**.
3. Kamera akan terbuka, dan mahasiswa mengarahkan kamera ke layar milik CI.
4. *Verifikasi Geolokasi:* Saat kode QR berhasil terpindai, aplikasi browser akan meminta akses GPS (`navigator.geolocation`).
5. *Payload* yang dikirim ke *server*: `[QR_Token, Mahasiswa_ID, Latitude, Longitude]`.

## 3. Protokol Keamanan Tingkat Tinggi
Untuk mencegah segala jenis manipulasi (titip absen/joki), arsitektur berikut harus diterapkan:

### 3.1. Validasi Token Kadaluwarsa
Token di dalam QR code memiliki atribut `created_at`. Jika token tersebut sudah berusia lebih dari 60 detik dari waktu *server*, *backend* akan menolak presensi. Ini mematikan celah penyebaran foto QR.

### 3.2. Radius Geolokasi (Geofencing)
Tabel referensi `hospitals` harus ditambahkan kolom `latitude` dan `longitude` beserta `radius_tolerance_meters` (misal: 100 meter). 
Jika mahasiswa *check-in* namun koordinat GPS mereka terpaut 2 kilometer dari RS yang dijadwalkan, status kehadiran akan ditandai **"Invalid / Out of Range"**.

### 3.3. Pencegahan GPS Palsu (Spoofing)
Meski sulit dicegah secara 100% pada aplikasi berbasis web, kita dapat mendeteksi "perubahan lokasi ekstrim" (misal: dalam 5 menit, GPS mahasiswa berpindah 10km). Sistem dapat memberikan *flag* merah pada data presensi tersebut untuk ditinjau oleh Admin.

## 4. Arsitektur Database
**Tabel `attendance_sessions`**
- `id`, `rotation_id`, `instructor_id`, `shift_type` (pagi, sore, malam), `opened_at`, `closed_at`, `active_token`.

**Tabel `attendance_records`**
- `id`, `session_id`, `student_id`, `scanned_at`, `status` (present, late, out_of_range), `latitude`, `longitude`, `device_info`.

## 5. Implementasi Frontend
- **Library QR Scanner:** Menggunakan `html5-qrcode` untuk membaca kamera secara *cross-browser* dengan cepat.
- **Library QR Generator:** Menggunakan `qrcode.react` untuk merender tampilan QR di sisi Dosen.
- **Peringatan Izin:** Antarmuka (UI) yang jelas untuk membimbing mahasiswa mengizinkan (*allow*) kamera dan lokasi pada *browser* Safari/Chrome mereka.
