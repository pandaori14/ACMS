# Generator Yudisium & Transkrip Klinis (Spesifikasi Teknis)

## 1. Konsep Modul
Dokumen PDF untuk kebutuhan Yudisium tidak boleh dirancang sekadar "bisa diekspor". Ia adalah nyawa administratif dari sebuah Fakultas Kedokteran. Modul ini mendefinisikan standar tingkat tinggi pembuatan Buku Rekap Logbook dan Transkrip Nilai Klinis berskala nasional (SNPPDI).

## 2. Fitur Kunci

### 2.1. Kompilasi Logbook Otomatis (Mega-PDF)
Selama 2 tahun kepaniteraan klinik, satu mahasiswa bisa menghasilkan lebih dari 1,000 baris entri logbook lintas stase.
- **Tantangan:** Me- *render* HTML berisi ribuan baris menjadi PDF bisa menyebabkan *Out of Memory* pada *server* (Gagal memproses).
- **Solusi Arsitektur:** Kita akan menggunakan *Queue/Job* di Laravel (pekerja latar belakang). Saat mahasiswa/admin menekan "Cetak Rekap Keseluruhan", sistem memproses pembuatan PDF di *background*. Setelah 1-2 menit, PDF dikirimkan secara asinkron ke menu "Kotak Masuk / Dokumen Saya".

### 2.2. Watermark Keaslian Dokumen (QR Signature)
Dunia medis sangat rentan terhadap pemalsuan sertifikat kompetensi.
- Setiap PDF transkrip yang keluar dari sistem ACMS akan dibubuhkan *QR Code* di sudut kanan bawah.
- Jika QR tersebut dipindai, ia akan mengarahkan ke halaman publik ACMS (contoh: `https://acms.edu/verify/doc-xyz-123`).
- Halaman publik tersebut akan menampilkan data *hash* dari *database*: "Dokumen ini ASLI, dicetak pada tanggal X, atas nama Y, dengan total IPK Klinis Z".

### 2.3. Struktur Templat (Blade ke PDF)
*Engine* yang akan digunakan adalah `dompdf` untuk laporan ringan, atau `browsershot/puppeteer` jika kita membutuhkan struktur grafis transkrip yang indah dan sarat CSS *(Enterprise Level)*.

**Kerangka Transkrip SNPPDI:**
1. **Halaman Sampul:** Foto Mahasiswa, Nomor Induk (NIM/NPM), Biodata lengkap.
2. **Halaman Daftar Stase:** Daftar tabel stase yang telah diselesaikan, diurutkan kronologis. Memuat durasi minggu dan nilai akhir tiap stase.
3. **Halaman Daftar Keterampilan Klinis:** Rekapitulasi dari seluruh pencapaian DOPS dan Mini-CEX (Kategori Keterampilan: Penyakit Dalam, Bedah, Anak, dll).

## 3. Titik Akhir (API Endpoints)
- `POST /api/v1/yudisium/generate-transcript` -> Memulai pekerjaan latar belakang (*Background Job*).
- `GET /api/v1/yudisium/my-documents` -> Mengecek status dokumen ("Processing" atau "Ready to Download").
- `GET /api/public/verify/{hash}` -> Laman publik verifikasi.

## 4. Persyaratan Data
Untuk men- *generate* transkrip paripurna, sistem membutuhkan *query JOIN* lintas modul secara masif:
- `users` & `students` (Biodata)
- `rotation_assignments` (Daftar stase & RS)
- `clinical_grades` (Nilai akhir stase)
- `examinations` (Nilai UKMPPD / Komprehensif)
