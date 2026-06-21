# Peta Jalan Pengembangan Skala Enterprise (Upgrade Roadmap)

Dokumen ini mendeskripsikan langkah peluncuran kronologis (Sprint/Tahapan) dari implementasi fase `Develop`. Mengingat skala *Enterprise* yang melibatkan intervensi langsung ke sistem inti, pengerjaan harus dilakukan secara modular agar tidak merusak fungsionalitas yang ada.

## Sprint 1: Pondasi Pengintaian & Presensi (Minggu 1-2)
**Fokus utama:** Mendapatkan visibilitas lokasi *real-time* dan tren laporan.
1. Implementasi **Smart Attendance System** (QR Geolocation).
   - *Backend:* Membuat tabel sesi, merakit logika algoritma Haversine.
   - *Frontend:* Menyiapkan QR Scanner pada perangkat mahasiswa dan meminta akses geolokasi UI.
2. Pembuatan **Database Views** khusus Analitik untuk merangkum hasil absensi dan data insiden yang telah ada di tahap pembangunan sebelumnya (Fase `Build`).

## Sprint 2: Dasbor Eksekutif & SMTP Global (Minggu 3-4)
**Fokus utama:** Menyajikan data di tingkat pimpinan dan membuka keran notifikasi.
1. Implementasi **Executive Analytics Dashboard**.
   - *Frontend:* Merakit grafik Recharts berdasarkan *Database Views* dari Sprint 1.
2. Injeksi **Global Notification Hooks**.
   - Melakukan sisipan baris kode `NotificationService::sendDynamicEmail` pada pengumuman jadwal rotasi stase dan penyelesaian *Logbook*.

## Sprint 3: Kelulusan Otomatis (Minggu 5-6)
**Fokus utama:** Proses birokrasi *paperless* total di penghujung jenjang kepaniteraan.
1. Merakit **Yudisium Document Generator** (PDF).
   - Menyiapkan infrastruktur *Queue/Redis* di server.
   - Merancang *Blade template* transkrip yang cantik dan *mobile-friendly*.
   - Mengimplementasikan sistem pembuatan *Watermark QR Signature* (halaman verifikasi publik).

## 4. Evaluasi Akhir (Production Release Prep)
- Melakukan *Load Testing* (Uji Beban) menggunakan Apache JMeter untuk melihat apakah 500 koass yang melakukan `Scan QR Absen` bersamaan di pagi hari akan membuat server *crash*.
- Verifikasi hak akses *Super Admin* terhadap Matriks SMTP pimpinan RS dan penanganan error jika GPS mahasiswa tidak terkalibrasi.
