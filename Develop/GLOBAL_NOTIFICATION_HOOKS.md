# Peta Integrasi Notifikasi Global (SMTP Matrix Hooks)

## 1. Konteks Skala Enterprise
Kita telah berhasil membangun mesin *Conditional SMTP Notification* (Matriks SMTP Dinamis). Saat ini, mesin tersebut menggerakkan modul *Logbook* dan *Incident*. Untuk mencapai level *Enterprise*, kita harus memastikan seluruh pergerakan status di modul manapun selalu terhubung (*hooked*) ke mesin komunikasi ini.

## 2. Pemetaan Modul & Key Referensi

Setiap aksi kritis pada aplikasi harus mendaftarkan kunci (*matrix_key*) unik di tabel *Settings* agar Super Admin dapat mengonfigurasinya. Berikut adalah spesifikasi pemetaannya:

| Modul Asal | Aksi/Trigger (Event) | Matrix Key Target | Context Data yang Harus Dikirim |
|---|---|---|---|
| **Assessment** | Penerbitan nilai akhir stase oleh Kaprodi | `grade_published` | `['student_name', 'stase_name', 'grade_value']` |
| **Rotation** | Diterbitkannya SK Pemetaan Rotasi baru | `rotation_assigned` | `['batch_year', 'hospital_name']` |
| **Finance** | Tagihan *Billing* diterbitkan untuk RS | `invoice_issued` | `['invoice_amount', 'due_date', 'hospital_name']` |
| **Finance** | Mahasiswa terlambat membayar SPP Klinis | `tuition_overdue` | `['student_name', 'overdue_days']` |
| **Academic** | Jadwal Ujian OSCE rilis | `exam_schedule_released` | `['exam_date', 'location']` |

## 3. Protokol Pemrograman (Implementation Hook)

Ketika seorang *Developer* (atau *AI Agent*) membangun fungsi baru, ia **diwajibkan** untuk menaruh kode *hook* berikut pada setiap titik akhir (*endpoint*) keberhasilan:

```php
// Contoh pada GradeController@publish
NotificationService::sendDynamicEmail(
    $studentEmail, // Ke email mahasiswa bersangkutan
    "Pemberitahuan Nilai Akhir: " . $staseName,
    "email_template_grade", 
    "grade_published", // Matrix Key yang harus ada di SettingSeeder
    [
        'name' => $studentName,
        'grade' => $gradeValue,
        'stase' => $staseName
    ],
    [
        // Context untuk evaluasi Aturan Kondisional (Conditional Rules)
        // Misal: Jika grade_value == 'E', Super Admin bisa menyetel aturan otomatis CC ke Dosen Pembimbing
        'grade_value' => $gradeValue 
    ]
);
```

## 4. Antisipasi Antrean (Queue System)
Pemanggilan email massal pada saat "Penerbitan SK Rotasi" berpotensi menembakkan 200+ email sekaligus. 
Untuk mencegah *timeout* (koneksi terputus dari *browser* kaprodi), `NotificationService` harus dikonfigurasi menggunakan antrean asinkron (Laravel Queues - Redis/Database) khusus untuk metode yang meledak secara massal.
