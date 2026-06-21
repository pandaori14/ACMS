# Executive Analytics Dashboard (Desain Spesifikasi)

## 1. Pendahuluan
Dokumen ini merincikan desain, arsitektur, dan peta implementasi untuk modul **Dasbor Analitik Eksekutif**. Fitur ini dirancang secara eksklusif untuk tingkat pimpinan (Dekan, Kaprodi, Direktur RS Pendidikan) agar dapat melihat kesehatan akademik dan operasional secara *real-time*.

## 2. Metrik Utama (Key Performance Indicators)
Dasbor akan difokuskan pada 4 pilar metrik:

### 2.1. Beban Kapasitas Rumah Sakit (Hospital Load)
- **Visualisasi:** Peta Panas (*Heatmap*) atau Diagram Batang Bertumpuk (*Stacked Bar Chart*).
- **Sumber Data:** Menghitung jumlah entri mahasiswa dari tabel `rotation_assignments` berdasarkan rentang waktu aktif.
- **Tujuan:** Mengetahui jika RS A mengalami *overcapacity* (kelebihan beban mahasiswa) sedangkan RS B kekurangan mahasiswa.

### 2.2. Tren Insiden Klinis (Clinical Incident Trends)
- **Visualisasi:** Grafik Garis Waktu Seris (*Time-Series Line Chart*).
- **Sumber Data:** *Aggregation* dari tabel `incident_reports` yang dikelompokkan berdasar bulan dan `incident_type`.
- **Tujuan:** Mendeteksi adanya anomali (misal: lonjakan kasus *Bullying* atau *Patient Safety* di bulan tertentu pada stase tertentu).

### 2.3. Rasio Kelulusan OSCE & Ujian Lisan (Passing Rate)
- **Visualisasi:** Diagram Lingkaran (*Donut/Pie Chart*) dan Tabel Rincian.
- **Sumber Data:** Penggabungan tabel `examinations` dan `examination_participants` dengan status Lulus/Tidak Lulus.
- **Tujuan:** Mengukur kualitas pengajaran dan kesiapan mahasiswa.

### 2.4. Tingkat Kepatuhan Logbook (Logbook Compliance)
- **Visualisasi:** Grafik *Gauge* (Jarum Kecepatan) per Stase.
- **Sumber Data:** Rata-rata persentase pencapaian jumlah target logbook minimum (SKDI) dari seluruh populasi mahasiswa aktif.
- **Tujuan:** Mengetahui stase mana yang paling sering membuat mahasiswa tertinggal dalam memenuhi kewajiban klinis mereka.

## 3. Spesifikasi Teknis Frontend
- **Library Grafik:** `recharts` (Ringan, berbasis React, mendukung kustomisasi penuh dan *dark mode* bawaan Tailwind).
- **Tata Letak:**
  - Baris 1: 4 *Scorecards* utama (Ringkasan metrik).
  - Baris 2: *Hospital Load Heatmap* (Kiri, ukuran besar) & *Passing Rate Donut* (Kanan, ukuran sedang).
  - Baris 3: *Clinical Incident Trends* (Grafik penuh dari kiri ke kanan).
- **Filter Global:** Sebuah *sticky header* yang berisi *dropdown* Tahun Ajaran, Semester, dan Rumah Sakit. Saat filter diubah, semua komponen Recharts akan merender ulang (via *TanStack Query refetch*).

## 4. Spesifikasi Teknis Backend
- **Endpoint:** `GET /api/v1/analytics/executive`
- **Controller:** `ExecutiveAnalyticsController`
- **Optimalisasi Database:**
  Karena agregasi data jutaan baris bisa memperlambat server, kita harus:
  1. Membuat *Database Views* (misal: `view_incident_trends`).
  2. Memanfaatkan sistem *Caching* Laravel (`Cache::remember('executive_stats_2026', 3600, function() {...})`).

## 5. Pertimbangan Hak Akses (RBAC)
Hanya *Role* dengan *Permission* `view-executive-analytics` yang dapat mengakses *endpoint* ini. Super Admin dan Kaprodi akan mendapatkannya secara *default*. Mahasiswa dan Dosen biasa akan secara absolut ditolak (*403 Forbidden*).
