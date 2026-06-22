<?php

namespace Modules\Incident\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Incident\Models\Consultation;
use Modules\Incident\Models\IncidentNote;
use Modules\Incident\Models\IncidentReport;

class IncidentDummySeeder extends Seeder
{
    /**
     * Seed dummy data for the Incident module:
     * - 25 Incident Reports (berbagai tipe, severity, status)
     * - Investigation notes untuk insiden yang sedang/sudah ditangani
     * - 15 Consultations (berbagai kategori dan status)
     */
    public function run(): void
    {
        // ── User IDs dari database ────────────────────────────
        // Mahasiswa (koass) — pelapor insiden
        $students = [
            '019eb6a8-f170-71c3-9bbf-e7e389660217', // koass1 - Opung Jarwadi Januar
            '019eb6a8-f22f-7087-8dea-1fe9bdf617aa', // koass2 - Danang Narpati
            '019eb6a8-f2ed-7218-a0ec-f02034bfbe62', // koass3 - Queen Karimah Widiastuti
            '019eb6a8-f3b1-735f-8bad-8cbbd3369b15', // koass4 - Fitriani Purwanti
            '019eb6a8-f472-707a-9309-a7ee5b3e423d', // koass5 - Vanesa Mardhiyah
            '019eb6a8-f531-72d3-89db-f6187f3197cd', // koass6 - Manah Aslijan Prasasta
            '019eb6a8-f5f4-727e-8f20-bfc29779775d', // koass7 - Yani Pertiwi
            '019eb6a8-fbf1-7092-b64b-30e5b2036ccc', // koass15
            '019eb6a8-fcb6-726e-be1f-cd421e2da955', // koass16
            '019eb6a8-fd7a-7237-b6f5-c778e1ef262f', // koass17
        ];

        // Super Admin & Admin Prodi — pengelola insiden
        $superAdminId = '019eb6a8-eb40-7350-926e-1bf737f729e0';
        $adminProdiId = '019eb6a8-ec04-7335-982b-6b90a7fb772e';
        $kaprodiId = '019eb6a8-ecc3-7155-b79d-fd4e9295cc1b';
        $dosenId = '019eb6a8-ed7f-7112-83db-6e48025fba4b';

        // ── Lokasi realistis di rumah sakit & kampus ──────────
        $locations = [
            'RSUD Pendidikan Utama Provinsi - IGD Lantai 1',
            'RSUD Pendidikan Utama Provinsi - Ruang Bedah Lt. 3',
            'RSUD Pendidikan Utama Provinsi - Poliklinik Anak',
            'RSUD Pendidikan Utama Provinsi - ICU',
            'RSUD Pendidikan Utama Provinsi - Ruang Operasi',
            'RS Jejaring Daerah Bekasi - IGD',
            'RS Jejaring Daerah Bekasi - Bangsal Dalam',
            'RS Jejaring Daerah Padang - Poliklinik Umum',
            'RS Jejaring Daerah Mataram - Ruang Neonatus',
            'RS Jejaring Daerah Banjarmasin - Ruang Bersalin',
            'Kampus FK UMS - Laboratorium Keterampilan Klinis',
            'Kampus FK UMS - Ruang Tutorial Gedung A',
            'Kampus FK UMS - Koridor Lantai 2',
        ];

        // ── Incident Types & Severity dari system_references ──
        $incidentTypes = [
            'student_safety', 'patient_safety', 'bullying',
            'ethical_violation', 'sexual_harassment', 'k3', 'other',
        ];
        $severities = ['critical', 'high', 'medium', 'low'];
        $statuses = ['submitted', 'investigating', 'resolved'];

        // ══════════════════════════════════════════════════════
        // 1. INCIDENT REPORTS (25 laporan)
        // ══════════════════════════════════════════════════════

        $incidents = [
            // ── SUBMITTED (belum ditangani) ──────────────────
            [
                'incident_type' => 'student_safety',
                'incident_date' => '2026-06-20',
                'location' => $locations[0],
                'description' => 'Mahasiswa terpeleset di lantai IGD yang basah saat shift malam. Lantai baru dipel namun tidak ada tanda peringatan "Wet Floor". Mahasiswa mengalami lecet di lutut kanan.',
                'involved_parties' => 'Koass An. Opung Jarwadi, Petugas kebersihan shift malam',
                'is_anonymous' => false,
                'status' => 'submitted',
                'severity' => 'medium',
                'reporter_id' => $students[0],
            ],
            [
                'incident_type' => 'patient_safety',
                'incident_date' => '2026-06-19',
                'location' => $locations[3],
                'description' => 'Koass salah membaca dosis obat pada resep dokter jaga. Dosis tertulis Amiodaron 150mg, koass membaca 1500mg. Kesalahan terdeteksi oleh perawat senior sebelum obat diberikan ke pasien.',
                'involved_parties' => 'Koass An. Danang Narpati, Perawat Sr. Siti Aminah, Pasien Tn. Budi (MR: 2026-0045)',
                'is_anonymous' => false,
                'status' => 'submitted',
                'severity' => 'high',
                'reporter_id' => $students[1],
            ],
            [
                'incident_type' => 'bullying',
                'incident_date' => '2026-06-18',
                'location' => $locations[5],
                'description' => 'Residen senior secara berulang membentak dan merendahkan koass di depan perawat dan pasien saat morning report. Koass merasa tertekan dan tidak berani bertanya selama sisa shift.',
                'involved_parties' => null,
                'is_anonymous' => true,
                'status' => 'submitted',
                'severity' => 'high',
                'reporter_id' => null,
            ],
            [
                'incident_type' => 'k3',
                'incident_date' => '2026-06-21',
                'location' => $locations[4],
                'description' => 'Jarum suntik bekas terletak di atas meja kerja tanpa penutup saat koass sedang menulis di rekam medis. Jarum nyaris menusuk tangan koass. Safety box di ruangan penuh dan belum diganti.',
                'involved_parties' => 'Koass An. Queen Karimah, Perawat pelaksana ruangan',
                'is_anonymous' => false,
                'status' => 'submitted',
                'severity' => 'critical',
                'reporter_id' => $students[2],
            ],
            [
                'incident_type' => 'ethical_violation',
                'incident_date' => '2026-06-17',
                'location' => $locations[7],
                'description' => 'Ditemukan koass yang memotret rekam medis pasien menggunakan HP pribadi tanpa izin. Foto termasuk data identitas lengkap pasien (nama, alamat, nomor KTP).',
                'involved_parties' => null,
                'is_anonymous' => true,
                'status' => 'submitted',
                'severity' => 'high',
                'reporter_id' => null,
            ],
            [
                'incident_type' => 'other',
                'incident_date' => '2026-06-16',
                'location' => $locations[11],
                'description' => 'AC ruang tutorial mati selama 3 hari berturut-turut, suhu ruangan mencapai 35°C. Beberapa mahasiswa mengalami dehidrasi ringan saat sesi tutorial panjang.',
                'involved_parties' => 'Kelompok Tutorial B2, Fasilitator dr. Pratiwi',
                'is_anonymous' => false,
                'status' => 'submitted',
                'severity' => 'low',
                'reporter_id' => $students[3],
            ],

            // ── INVESTIGATING (sedang ditangani) ─────────────
            [
                'incident_type' => 'patient_safety',
                'incident_date' => '2026-06-14',
                'location' => $locations[8],
                'description' => 'Koass secara tidak sengaja memberikan susu formula ke neonatus yang seharusnya ASI eksklusif. Perawat segera menghentikan pemberian dan menghubungi dokter jaga. Bayi dipantau dan tidak menunjukkan reaksi alergi.',
                'involved_parties' => 'Koass An. Vanesa Mardhiyah, Perawat Neonatus Dewi, Dr. Jaga Sp.A',
                'is_anonymous' => false,
                'status' => 'investigating',
                'severity' => 'high',
                'reporter_id' => $students[4],
            ],
            [
                'incident_type' => 'bullying',
                'incident_date' => '2026-06-13',
                'location' => $locations[9],
                'description' => 'Dokter pembimbing klinis memberikan tugas berlebihan kepada satu koass tertentu (3x lebih banyak dari koass lain) dan menyebutnya sebagai "hukuman" karena koass tersebut terlambat 5 menit pada hari sebelumnya.',
                'involved_parties' => null,
                'is_anonymous' => true,
                'status' => 'investigating',
                'severity' => 'medium',
                'reporter_id' => null,
            ],
            [
                'incident_type' => 'sexual_harassment',
                'incident_date' => '2026-06-12',
                'location' => $locations[6],
                'description' => 'Koass perempuan menerima pesan WhatsApp dengan konten tidak pantas dari tenaga kesehatan di RS tempat rotasi. Pesan berisi ajakan personal di luar konteks klinis dan komentar tentang penampilan fisik.',
                'involved_parties' => null,
                'is_anonymous' => true,
                'status' => 'investigating',
                'severity' => 'critical',
                'reporter_id' => null,
            ],
            [
                'incident_type' => 'k3',
                'incident_date' => '2026-06-11',
                'location' => $locations[1],
                'description' => 'Koass tidak mendapat APD lengkap (masker N95 dan face shield) saat membantu operasi pasien TB paru. Koass hanya menggunakan masker bedah biasa selama 2 jam di ruang operasi.',
                'involved_parties' => 'Koass An. Manah Aslijan Prasasta, Tim Bedah dr. Gunawan Sp.B',
                'is_anonymous' => false,
                'status' => 'investigating',
                'severity' => 'critical',
                'reporter_id' => $students[5],
            ],
            [
                'incident_type' => 'student_safety',
                'incident_date' => '2026-06-10',
                'location' => $locations[12],
                'description' => 'Lampu koridor lantai 2 mati total di malam hari. Koass shift malam terjatuh di tangga karena tidak bisa melihat anak tangga. Mengalami bengkak di pergelangan kaki.',
                'involved_parties' => 'Koass An. Yani Pertiwi, Security malam',
                'is_anonymous' => false,
                'status' => 'investigating',
                'severity' => 'medium',
                'reporter_id' => $students[6],
            ],
            [
                'incident_type' => 'ethical_violation',
                'incident_date' => '2026-06-09',
                'location' => $locations[2],
                'description' => 'Koass menceritakan detail kasus klinis pasien anak (termasuk nama dan diagnosis) di akun media sosial pribadi (Instagram story). Postingan dilihat oleh sesama koass dan dilaporkan.',
                'involved_parties' => null,
                'is_anonymous' => true,
                'status' => 'investigating',
                'severity' => 'high',
                'reporter_id' => null,
            ],

            // ── RESOLVED (sudah selesai) ─────────────────────
            [
                'incident_type' => 'student_safety',
                'incident_date' => '2026-05-28',
                'location' => $locations[0],
                'description' => 'Koass mengalami needle stick injury saat mengambil sampel darah pasien hepatitis B. Koass segera melapor ke K3RS dan mendapat PEP sesuai protokol.',
                'involved_parties' => 'Koass An. Opung Jarwadi Januar, Tim K3RS RSUD',
                'is_anonymous' => false,
                'status' => 'resolved',
                'severity' => 'critical',
                'resolution_notes' => 'Koass telah mendapat PEP dalam 24 jam pertama. Follow-up lab pada minggu ke-6 dan ke-12. Hasil lab minggu ke-6 negatif. Ditambahkan pelatihan ulang prosedur phlebotomy untuk seluruh koass batch ini.',
                'reporter_id' => $students[0],
            ],
            [
                'incident_type' => 'patient_safety',
                'incident_date' => '2026-05-25',
                'location' => $locations[3],
                'description' => 'Salah identifikasi pasien — koass memasang gelang identitas pasien A ke pasien B yang tempat tidurnya berdekatan. Kesalahan terdeteksi saat pergantian shift.',
                'involved_parties' => 'Koass An. Danang Narpati, Perawat Jaga Ratna, Pasien A (MR: 2026-0032), Pasien B (MR: 2026-0033)',
                'is_anonymous' => false,
                'status' => 'resolved',
                'severity' => 'high',
                'resolution_notes' => 'Tidak ada dampak klinis karena terdeteksi sebelum pemberian obat. Koass mendapat pembinaan oleh dosen pembimbing. Diberlakukan kebijakan double-check wajib saat pemasangan gelang identitas. SOP baru telah didistribusikan ke seluruh unit.',
                'reporter_id' => $students[1],
            ],
            [
                'incident_type' => 'bullying',
                'incident_date' => '2026-05-22',
                'location' => $locations[5],
                'description' => 'Senior koass melakukan perpeloncoan terhadap koass baru — memaksa koass baru berdiri di koridor selama 2 jam sebagai "hukuman" karena belum hafal anatomi.',
                'involved_parties' => 'Koass senior batch sebelumnya, 3 koass baru',
                'is_anonymous' => false,
                'status' => 'resolved',
                'severity' => 'high',
                'resolution_notes' => 'Koass senior telah dipanggil dan diberikan surat peringatan tertulis oleh Kaprodi. Komite Etik FK telah mengeluarkan pernyataan bahwa perpeloncoan dalam bentuk apapun tidak ditoleransi. Program mentoring peer-support telah diluncurkan.',
                'reporter_id' => $students[3],
            ],
            [
                'incident_type' => 'k3',
                'incident_date' => '2026-05-20',
                'location' => $locations[10],
                'description' => 'Tumpahan cairan formalin di laboratorium keterampilan klinis. Beberapa mahasiswa mengeluh pusing dan mual. Ruangan tidak memiliki ventilasi yang memadai.',
                'involved_parties' => 'Laboran Pak Ahmad, 12 mahasiswa kelompok praktikum',
                'is_anonymous' => false,
                'status' => 'resolved',
                'severity' => 'medium',
                'resolution_notes' => 'Ruangan dievakuasi dan dilakukan pembersihan oleh tim K3. Mahasiswa yang terdampak diperiksa di klinik kampus — tidak ada yang memerlukan rawat inap. Ventilasi lab telah diperbaiki dan exhaust fan tambahan dipasang. SOP penanganan bahan kimia diperbarui.',
                'reporter_id' => $students[7],
            ],
            [
                'incident_type' => 'other',
                'incident_date' => '2026-05-18',
                'location' => $locations[11],
                'description' => 'Sistem absensi digital (ACMS) error selama 2 hari, menyebabkan absensi 40 koass tidak tercatat. Koass khawatir dianggap mangkir.',
                'involved_parties' => 'Seluruh koass yang absensi pada 17-18 Mei 2026, Admin Prodi',
                'is_anonymous' => false,
                'status' => 'resolved',
                'severity' => 'low',
                'resolution_notes' => 'Data absensi telah dipulihkan dari log server. Admin Prodi telah memvalidasi ulang seluruh absensi. Tim IT telah memperbaiki bug pada modul attendance dan menambahkan mekanisme backup otomatis.',
                'reporter_id' => $students[8],
            ],
            [
                'incident_type' => 'sexual_harassment',
                'incident_date' => '2026-05-15',
                'location' => $locations[9],
                'description' => 'Koass perempuan dilecehkan secara verbal oleh keluarga pasien yang berkunjung. Komentar bersifat seksual dan merendahkan. Kejadian terjadi di hadapan perawat yang tidak melakukan intervensi.',
                'involved_parties' => null,
                'is_anonymous' => true,
                'status' => 'resolved',
                'severity' => 'high',
                'resolution_notes' => 'Pihak RS telah memasang CCTV tambahan di area bangsal. Perawat yang tidak mengintervensi telah diberikan pembinaan. Poster anti-pelecehan dipasang di ruang tunggu. Layanan konseling telah ditawarkan kepada korban.',
                'reporter_id' => null,
            ],
            [
                'incident_type' => 'ethical_violation',
                'incident_date' => '2026-05-12',
                'location' => $locations[7],
                'description' => 'Koass memalsukan tanda tangan preceptor pada logbook kegiatan klinis untuk 5 prosedur yang tidak pernah dilakukan. Ditemukan saat verifikasi rutin oleh admin.',
                'involved_parties' => 'Koass yang bersangkutan (identitas dirahasiakan), Admin Prodi',
                'is_anonymous' => false,
                'status' => 'resolved',
                'severity' => 'critical',
                'resolution_notes' => 'Koass telah menjalani sidang komite etik. Sanksi berupa pengulangan stase selama 2 bulan dan surat peringatan keras. Sistem verifikasi logbook digital (QR code) telah diimplementasikan untuk mencegah pemalsuan di masa depan.',
                'reporter_id' => $students[9],
            ],

            // ── Tambahan untuk variasi data statistik ────────
            [
                'incident_type' => 'patient_safety',
                'incident_date' => '2026-06-08',
                'location' => $locations[2],
                'description' => 'Koass lupa mencatat hasil pemeriksaan tanda vital pasien anak yang baru saja mengalami kejang. Informasi penting tidak terdokumentasi selama 4 jam hingga pergantian shift.',
                'involved_parties' => 'Koass jaga poliklinik, Perawat shift sore',
                'is_anonymous' => false,
                'status' => 'submitted',
                'severity' => 'medium',
                'reporter_id' => $students[4],
            ],
            [
                'incident_type' => 'student_safety',
                'incident_date' => '2026-06-05',
                'location' => $locations[6],
                'description' => 'Koass dipaksa lembur 36 jam berturut-turut tanpa istirahat yang cukup oleh residen jaga. Koass hampir pingsan saat membantu tindakan di bangsal.',
                'involved_parties' => null,
                'is_anonymous' => true,
                'status' => 'investigating',
                'severity' => 'high',
                'reporter_id' => null,
            ],
            [
                'incident_type' => 'k3',
                'incident_date' => '2026-06-03',
                'location' => $locations[1],
                'description' => 'Cairan tubuh pasien (darah) terpercik ke wajah koass yang tidak menggunakan face shield saat membantu debridement luka. Pasien diketahui memiliki riwayat Hepatitis C.',
                'involved_parties' => 'Koass An. Fitriani Purwanti, Tim Bedah',
                'is_anonymous' => false,
                'status' => 'resolved',
                'severity' => 'critical',
                'resolution_notes' => 'Koass langsung mendapat dekontaminasi dan pemeriksaan serologi baseline. PEP HCV telah dimulai dalam 48 jam. Wajib menggunakan face shield telah dijadikan mandatory di semua prosedur bedah. Follow-up lab dijadwalkan bulan ke-3 dan ke-6.',
                'reporter_id' => $students[3],
            ],
            [
                'incident_type' => 'bullying',
                'incident_date' => '2026-06-01',
                'location' => $locations[0],
                'description' => 'Perawat senior secara konsisten mengabaikan dan menyepelekan pertanyaan koass di depan pasien, menggunakan kata-kata "kamu kan cuma koass, diam saja". Terjadi berulang selama 1 minggu.',
                'involved_parties' => null,
                'is_anonymous' => true,
                'status' => 'submitted',
                'severity' => 'medium',
                'reporter_id' => null,
            ],
            [
                'incident_type' => 'other',
                'incident_date' => '2026-05-30',
                'location' => $locations[10],
                'description' => 'Manekin simulasi untuk pelatihan CPR rusak (dada tidak bisa ditekan) sudah 2 minggu dan belum diperbaiki. Mahasiswa tidak bisa berlatih resusitasi dengan baik.',
                'involved_parties' => 'Laboran Skills Lab, Koordinator Keterampilan Klinis',
                'is_anonymous' => false,
                'status' => 'resolved',
                'severity' => 'low',
                'resolution_notes' => 'Manekin telah diperbaiki dan dikalibrasi ulang. Telah dialokasikan anggaran untuk pengadaan 2 manekin CPR tambahan sebagai cadangan. Jadwal maintenance preventif bulanan telah dibuat.',
                'reporter_id' => $students[6],
            ],
            [
                'incident_type' => 'patient_safety',
                'incident_date' => '2026-05-27',
                'location' => $locations[8],
                'description' => 'Koass salah menghitung tetesan infus pada neonatus — seharusnya 8 tetes/menit tapi di-set 18 tetes/menit. Kelebihan cairan terdeteksi oleh monitor saturasi setelah 30 menit.',
                'involved_parties' => 'Koass jaga neonatus, Perawat Neonatus, dr. Sp.A jaga',
                'is_anonymous' => false,
                'status' => 'resolved',
                'severity' => 'critical',
                'resolution_notes' => 'Infus segera dihentikan dan pasien dimonitor ketat. Tidak ada edema paru. Koass mendapat pelatihan ulang kalkulasi dosis pediatrik. Wajib double-check oleh perawat sebelum memulai infus pada neonatus telah dijadikan SOP.',
                'reporter_id' => $students[1],
            ],
        ];

        $createdIncidents = [];
        foreach ($incidents as $index => $data) {
            // Spread creation dates to make trend chart meaningful
            $daysAgo = max(0, 30 - $index);
            $created = now()->subDays($daysAgo)->addHours(rand(7, 22))->addMinutes(rand(0, 59));

            $report = IncidentReport::create([
                'reporter_id' => $data['reporter_id'],
                'incident_type' => $data['incident_type'],
                'incident_date' => $data['incident_date'],
                'location' => $data['location'],
                'description' => $data['description'],
                'involved_parties' => $data['involved_parties'],
                'is_anonymous' => $data['is_anonymous'],
                'status' => $data['status'],
                'severity' => $data['severity'],
                'resolution_notes' => $data['resolution_notes'] ?? null,
                'created_at' => $created,
                'updated_at' => $data['status'] !== 'submitted' ? $created->copy()->addDays(rand(1, 3)) : $created,
            ]);

            $createdIncidents[] = $report;
        }

        // ══════════════════════════════════════════════════════
        // 2. INCIDENT NOTES (catatan investigasi)
        // ══════════════════════════════════════════════════════

        $noteTemplates = [
            // Notes untuk insiden yang sedang investigating
            [
                'notes' => [
                    ['note' => 'Laporan diterima dan telah diverifikasi. Menunggu jadwal wawancara dengan pihak terkait.', 'is_internal' => true, 'user_id' => $superAdminId],
                    ['note' => 'Telah melakukan wawancara awal dengan saksi. Kronologi kejadian sesuai dengan laporan.', 'is_internal' => true, 'user_id' => $adminProdiId],
                ],
            ],
            [
                'notes' => [
                    ['note' => 'Kasus ini ditangani dengan prioritas tinggi. Koordinasi dengan RS terkait sudah dilakukan.', 'is_internal' => true, 'user_id' => $superAdminId],
                    ['note' => 'Identitas pelapor dilindungi sesuai kebijakan pelaporan anonim.', 'is_internal' => true, 'user_id' => $adminProdiId],
                    ['note' => 'Terima kasih atas laporannya. Tim kami sedang menindaklanjuti kasus ini.', 'is_internal' => false, 'user_id' => $adminProdiId],
                ],
            ],
            [
                'notes' => [
                    ['note' => 'URGENT: Kasus pelecehan seksual. Telah dilaporkan ke Satgas PPKS Universitas.', 'is_internal' => true, 'user_id' => $superAdminId],
                    ['note' => 'Sesi konseling untuk korban telah dijadwalkan dengan psikolog kampus.', 'is_internal' => true, 'user_id' => $kaprodiId],
                    ['note' => 'Bukti digital (screenshot WA) telah diamankan oleh Satgas PPKS.', 'is_internal' => true, 'user_id' => $superAdminId],
                    ['note' => 'Kami sangat serius menangani laporan ini. Layanan konseling tersedia melalui menu Konsultasi Rahasia.', 'is_internal' => false, 'user_id' => $kaprodiId],
                ],
            ],
            [
                'notes' => [
                    ['note' => 'Telah melakukan inspeksi ketersediaan APD di ruang bedah. Stok N95 memang habis sejak 3 hari lalu.', 'is_internal' => true, 'user_id' => $adminProdiId],
                    ['note' => 'Koordinasi dengan manajemen RS untuk restock APD darurat.', 'is_internal' => true, 'user_id' => $superAdminId],
                ],
            ],
            [
                'notes' => [
                    ['note' => 'CCTV koridor telah diperiksa. Lampu memang mati total pada pukul 20:00-06:00.', 'is_internal' => true, 'user_id' => $adminProdiId],
                    ['note' => 'Laporan sudah diteruskan ke bagian maintenance kampus. Estimasi perbaikan 2 hari kerja.', 'is_internal' => true, 'user_id' => $superAdminId],
                ],
            ],
            [
                'notes' => [
                    ['note' => 'Konten media sosial telah di-screenshot sebelum dihapus oleh yang bersangkutan.', 'is_internal' => true, 'user_id' => $adminProdiId],
                    ['note' => 'Komite Etik FK akan menjadwalkan sidang etik dalam 7 hari ke depan.', 'is_internal' => true, 'user_id' => $kaprodiId],
                ],
            ],
        ];

        // Assign notes to investigating incidents
        $investigatingIncidents = array_filter($createdIncidents, fn ($r) => $r->status === 'investigating');
        $investigatingIncidents = array_values($investigatingIncidents);

        foreach ($investigatingIncidents as $idx => $incident) {
            if (isset($noteTemplates[$idx])) {
                foreach ($noteTemplates[$idx]['notes'] as $noteIdx => $noteData) {
                    IncidentNote::create([
                        'incident_report_id' => $incident->id,
                        'user_id' => $noteData['user_id'],
                        'note' => $noteData['note'],
                        'is_internal' => $noteData['is_internal'],
                        'created_at' => $incident->created_at->copy()->addHours(($noteIdx + 1) * rand(2, 8)),
                        'updated_at' => $incident->created_at->copy()->addHours(($noteIdx + 1) * rand(2, 8)),
                    ]);
                }
            }
        }

        // Add resolution notes to resolved incidents too
        $resolvedIncidents = array_filter($createdIncidents, fn ($r) => $r->status === 'resolved');
        foreach ($resolvedIncidents as $incident) {
            // Catatan proses penanganan
            IncidentNote::create([
                'incident_report_id' => $incident->id,
                'user_id' => $superAdminId,
                'note' => 'Kasus telah diinvestigasi dan tindakan korektif telah dilaksanakan. Laporan ditutup.',
                'is_internal' => true,
                'created_at' => $incident->updated_at->copy()->subHours(2),
                'updated_at' => $incident->updated_at->copy()->subHours(2),
            ]);

            // Notifikasi ke pelapor (non-internal)
            IncidentNote::create([
                'incident_report_id' => $incident->id,
                'user_id' => $adminProdiId,
                'note' => 'Laporan Anda telah selesai ditindaklanjuti. Terima kasih telah melaporkan. Jika ada hal lain, silakan buat laporan baru.',
                'is_internal' => false,
                'created_at' => $incident->updated_at,
                'updated_at' => $incident->updated_at,
            ]);
        }

        // ══════════════════════════════════════════════════════
        // 3. CONSULTATIONS (15 konsultasi rahasia)
        // ══════════════════════════════════════════════════════

        $consultations = [
            // ── PENDING (belum direspons) ────────────────────
            [
                'requester_id' => $students[0],
                'category' => 'academic',
                'topic' => 'Pertanyaan tentang perpanjangan stase',
                'message' => 'Saya sedang menjalani stase Bedah tapi merasa belum cukup kompetensi. Apakah mungkin untuk memperpanjang durasi stase ini? Apa syarat dan prosedurnya?',
                'is_anonymous' => false,
                'status' => 'pending',
            ],
            [
                'requester_id' => $students[1],
                'category' => 'psychological',
                'topic' => 'Merasa burnout selama rotasi klinik',
                'message' => 'Saya merasa sangat kelelahan dan kehilangan motivasi selama 2 bulan terakhir. Saya tidak bisa tidur nyenyak dan sering merasa cemas sebelum masuk shift. Apakah ada layanan konseling yang bisa saya akses? Saya tidak ingin ini mempengaruhi performa klinis saya.',
                'is_anonymous' => false,
                'status' => 'pending',
            ],
            [
                'requester_id' => null,
                'category' => 'bullying_consult',
                'topic' => 'Intimidasi oleh senior di RS',
                'message' => 'Saya mengalami intimidasi verbal secara berulang oleh residen senior di RS tempat rotasi. Saya takut melaporkan karena khawatir akan mempengaruhi nilai stase saya. Bagaimana cara melaporkan secara aman?',
                'is_anonymous' => true,
                'status' => 'pending',
            ],
            [
                'requester_id' => $students[2],
                'category' => 'career',
                'topic' => 'Bimbingan memilih spesialisasi',
                'message' => 'Saya tertarik dengan Kardiologi dan Neurologi. Bisa dibantu informasi tentang prospek keduanya dan bagaimana mempersiapkan diri untuk PPDS?',
                'is_anonymous' => false,
                'status' => 'pending',
            ],
            [
                'requester_id' => null,
                'category' => 'k3_consult',
                'topic' => 'Pertanyaan tentang prosedur pasca needle stick injury',
                'message' => 'Kemarin saya mengalami tertusuk jarum saat mengambil darah pasien. Saya sudah melapor ke K3RS tapi belum mendapat tindak lanjut. Apa yang harus saya lakukan selanjutnya? Saya sangat khawatir.',
                'is_anonymous' => true,
                'status' => 'pending',
            ],

            // ── RESPONDED (sudah dibalas) ────────────────────
            [
                'requester_id' => $students[3],
                'category' => 'academic',
                'topic' => 'Prosedur remidi ujian OSCE',
                'message' => 'Saya tidak lulus ujian OSCE station 3 (pemeriksaan abdomen). Bagaimana prosedur untuk mengikuti ujian remidi? Kapan jadwal terdekatnya?',
                'is_anonymous' => false,
                'status' => 'responded',
                'response' => 'Hai Fitriani, untuk remidi OSCE silakan: 1) Daftar ulang melalui portal ACMS menu Ujian → Remidi, 2) Jadwal remidi terdekat adalah 28 Juni 2026, 3) Silakan berlatih di Skills Lab yang buka setiap hari Senin-Jumat pukul 08:00-16:00. Jika butuh sesi latihan tambahan dengan fasilitator, hubungi bagian akademik. Semangat!',
                'responded_by' => $adminProdiId,
                'responded_at' => '2026-06-15 10:30:00',
            ],
            [
                'requester_id' => $students[4],
                'category' => 'psychological',
                'topic' => 'Kecemasan menghadapi pasien kritis',
                'message' => 'Sejak menyaksikan pasien meninggal di ICU bulan lalu, saya merasa sangat cemas setiap kali bertugas di ruang intensif. Tangan saya gemetar dan tidak bisa fokus. Apakah ini normal?',
                'is_anonymous' => false,
                'status' => 'responded',
                'response' => 'Vanesa, apa yang kamu alami sangat bisa dipahami dan wajar. Ini bisa jadi tanda trauma sekunder (vicarious trauma) yang umum dialami tenaga kesehatan. Saya rekomendasikan: 1) Segera jadwalkan sesi dengan psikolog kampus — dr. Sari Sp.KJ tersedia setiap Rabu pukul 09:00-12:00, 2) Gunakan teknik grounding saat cemas (5-4-3-2-1), 3) Jangan ragu minta waktu istirahat jika diperlukan. Kamu tidak sendiri dalam ini.',
                'responded_by' => $kaprodiId,
                'responded_at' => '2026-06-14 14:15:00',
            ],
            [
                'requester_id' => null,
                'category' => 'bullying_consult',
                'topic' => 'Cara melapor preceptor yang tidak profesional',
                'message' => 'Preceptor saya sering berkata kasar dan membandingkan saya dengan koass lain di depan pasien. Saya merasa ini sudah melewati batas. Bagaimana cara melaporkan tanpa identitas saya diketahui?',
                'is_anonymous' => true,
                'status' => 'responded',
                'response' => 'Terima kasih sudah berani berkonsultasi. Identitas Anda dijamin kerahasiaannya. Untuk melapor: 1) Gunakan fitur "Buat Laporan Insiden" di ACMS dengan opsi pelaporan anonim, 2) Pilih tipe insiden "Perundungan (Bullying)", 3) Deskripsikan kronologi sejelas mungkin tanpa menyebutkan nama Anda. Tim Komite Etik akan menindaklanjuti tanpa mengungkap identitas pelapor. Anda juga bisa menghubungi Satgas Anti-Bullying FK langsung.',
                'responded_by' => $superAdminId,
                'responded_at' => '2026-06-13 09:00:00',
            ],
            [
                'requester_id' => $students[5],
                'category' => 'career',
                'topic' => 'Informasi fellowship luar negeri',
                'message' => 'Apakah ada informasi tentang program fellowship atau observership di luar negeri yang bisa diikuti setelah lulus? Saya tertarik dengan bidang Bedah Saraf.',
                'is_anonymous' => false,
                'status' => 'responded',
                'response' => 'Halo Manah, untuk fellowship luar negeri di bidang Bedah Saraf: 1) FK UMS memiliki MoU dengan beberapa RS di Malaysia dan Jepang untuk program observership, 2) Silakan hubungi Kantor Urusan Internasional (KUI) UMS untuk informasi terkini, 3) Persyaratan umum: TOEFL/IELTS, surat rekomendasi dari 2 dosen, CV akademik, 4) Deadline pendaftaran biasanya bulan September. Saya akan kirimkan brosurnya via email.',
                'responded_by' => $dosenId,
                'responded_at' => '2026-06-12 16:45:00',
            ],
            [
                'requester_id' => $students[6],
                'category' => 'k3_consult',
                'topic' => 'APD tidak tersedia di RS rotasi',
                'message' => 'Di RS tempat saya rotasi, stok APD (masker N95, sarung tangan steril) sering habis. Kami terpaksa menggunakan masker bedah biasa untuk prosedur yang seharusnya membutuhkan N95. Apa yang harus kami lakukan?',
                'is_anonymous' => false,
                'status' => 'responded',
                'response' => 'Yani, ini adalah masalah serius yang harus segera ditindaklanjuti. Langkah yang harus dilakukan: 1) JANGAN melakukan prosedur jika APD yang sesuai tidak tersedia, 2) Laporkan ke kepala ruangan dan K3RS, 3) Hubungi koordinator stase atau Admin RS melalui ACMS, 4) Buat laporan insiden K3 di sistem agar tercatat resmi. Kami akan koordinasi dengan manajemen RS terkait. Keselamatan kalian adalah prioritas utama.',
                'responded_by' => $adminProdiId,
                'responded_at' => '2026-06-11 11:20:00',
            ],

            // ── CLOSED (sudah ditutup) ───────────────────────
            [
                'requester_id' => $students[7],
                'category' => 'academic',
                'topic' => 'Perpindahan kelompok rotasi',
                'message' => 'Apakah mungkin pindah dari kelompok rotasi A ke kelompok B? Saya memiliki alasan keluarga yang mengharuskan saya berada di daerah Surakarta pada bulan Juli.',
                'is_anonymous' => false,
                'status' => 'closed',
                'response' => 'Permintaan perpindahan kelompok rotasi telah diproses. Anda dipindahkan ke Kelompok B mulai periode Juli 2026. Surat keputusan perpindahan akan dikirim via email. Silakan koordinasi dengan koordinator stase baru Anda.',
                'responded_by' => $adminProdiId,
                'responded_at' => '2026-06-08 13:00:00',
            ],
            [
                'requester_id' => $students[8],
                'category' => 'psychological',
                'topic' => 'Follow-up sesi konseling',
                'message' => 'Saya ingin menjadwalkan sesi konseling lanjutan dengan psikolog kampus. Sesi pertama sangat membantu saya mengelola stress selama rotasi.',
                'is_anonymous' => false,
                'status' => 'closed',
                'response' => 'Senang mendengar sesi pertama membantu! Sesi lanjutan telah dijadwalkan untuk hari Rabu, 11 Juni 2026 pukul 10:00 dengan dr. Sari Sp.KJ di Ruang Konseling Gedung Rektorat Lt. 2. Ingat, tidak ada batasan jumlah sesi — gunakan layanan ini sebanyak yang Anda butuhkan.',
                'responded_by' => $kaprodiId,
                'responded_at' => '2026-06-07 09:30:00',
            ],
            [
                'requester_id' => null,
                'category' => 'other',
                'topic' => 'Saran peningkatan fasilitas di RS rotasi',
                'message' => 'Ruang istirahat koass di RS sangat tidak memadai — tidak ada AC, kasur sudah rusak, dan tidak ada locker untuk menyimpan barang. Apakah ada rencana perbaikan? Ini sangat mempengaruhi kualitas istirahat kami di shift malam.',
                'is_anonymous' => true,
                'status' => 'closed',
                'response' => 'Terima kasih atas masukannya. Kami telah mengkomunikasikan hal ini kepada manajemen RS dan mendapat respons positif: 1) AC akan dipasang minggu depan, 2) Kasur baru akan disediakan dalam 2 minggu, 3) Locker individu akan disediakan sebelum periode rotasi berikutnya. Kami akan terus memantau perbaikan ini.',
                'responded_by' => $superAdminId,
                'responded_at' => '2026-06-05 15:00:00',
            ],
        ];

        foreach ($consultations as $index => $data) {
            $daysAgo = max(0, 25 - ($index * 2));
            $created = now()->subDays($daysAgo)->addHours(rand(7, 20))->addMinutes(rand(0, 59));

            Consultation::create([
                'requester_id' => $data['requester_id'],
                'category' => $data['category'],
                'topic' => $data['topic'],
                'message' => $data['message'],
                'is_anonymous' => $data['is_anonymous'],
                'status' => $data['status'],
                'response' => $data['response'] ?? null,
                'responded_by' => $data['responded_by'] ?? null,
                'responded_at' => $data['responded_at'] ?? null,
                'created_at' => $created,
                'updated_at' => isset($data['responded_at']) ? $data['responded_at'] : $created,
            ]);
        }

        $this->command->info('✅ Incident dummy data seeded successfully!');
        $this->command->info('   📋 Incident Reports: '.IncidentReport::count());
        $this->command->info('   📝 Incident Notes: '.IncidentNote::count());
        $this->command->info('   💬 Consultations: '.Consultation::count());
    }
}
