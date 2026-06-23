<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            // General
            ['key' => 'app_name', 'group' => 'general', 'value' => 'ACMS', 'type' => 'string', 'description' => 'Nama Singkat Aplikasi'],
            ['key' => 'app_logo', 'group' => 'general', 'value' => '', 'type' => 'string', 'description' => 'Logo Aplikasi (URL)'],
            ['key' => 'app_favicon', 'group' => 'general', 'value' => '', 'type' => 'string', 'description' => 'Favicon Aplikasi (URL)'],
            ['key' => 'primary_color', 'group' => 'general', 'value' => '#dc2626', 'type' => 'string', 'description' => 'Warna Utama (Hex)'],
            ['key' => 'maintenance_mode', 'group' => 'general', 'value' => 'false', 'type' => 'boolean', 'description' => 'Mode Perawatan (Maintenance)'],
            ['key' => 'maintenance_message', 'group' => 'general', 'value' => 'Sistem sedang dalam pemeliharaan rutin. Silakan kembali lagi nanti.', 'type' => 'string', 'description' => 'Pesan Mode Perawatan'],
            ['key' => 'support_email', 'group' => 'general', 'value' => 'support@acms.edu', 'type' => 'string', 'description' => 'Email Bantuan/Support'],
            ['key' => 'company_address', 'group' => 'general', 'value' => 'Jl. A. Yani, Pabelan, Kartasura, Surakarta 57162', 'type' => 'string', 'description' => 'Alamat Institusi'],
            ['key' => 'company_phone', 'group' => 'general', 'value' => '+62 271 717417', 'type' => 'string', 'description' => 'Nomor Telepon Institusi'],
            ['key' => 'footer_text', 'group' => 'general', 'value' => '© 2026 ACMS - Hak Cipta Dilindungi.', 'type' => 'string', 'description' => 'Teks Footer Copyright'],
            ['key' => 'footer_tagline', 'group' => 'general', 'value' => 'Platform Akademik & Klinis Terpadu', 'type' => 'string', 'description' => 'Tagline/Subjudul di Footer (di bawah nama aplikasi)'],
            [
                'key' => 'footer_links',
                'group' => 'general',
                'value' => json_encode([
                    ['label' => 'Panduan & SOP', 'url' => '/safety/sop'],
                    ['label' => 'Perlindungan Pelapor', 'url' => '/safety/protection'],
                    ['label' => 'Kontak', 'url' => '/safety/contacts'],
                ]),
                'type' => 'json_links',
                'description' => 'Tautan yang tampil di Footer Landing Page',
            ],
            ['key' => 'app_timezone', 'group' => 'general', 'value' => 'Asia/Jakarta', 'type' => 'string', 'description' => 'Zona Waktu Sistem (cth: Asia/Jakarta)'],
            ['key' => 'max_upload_size_mb', 'group' => 'general', 'value' => '5', 'type' => 'integer', 'description' => 'Ukuran Maksimal Upload File (MB)'],
            ['key' => 'items_per_page', 'group' => 'general', 'value' => '20', 'type' => 'integer', 'description' => 'Jumlah Baris per Halaman pada Tabel Data'],

            // Academic
            ['key' => 'academic_year', 'group' => 'academic', 'value' => '2026/2027', 'type' => 'string', 'description' => 'Tahun Akademik Aktif'],
            ['key' => 'semester', 'group' => 'academic', 'value' => 'Ganjil', 'type' => 'string', 'description' => 'Semester Aktif'],
            ['key' => 'allow_student_appeals', 'group' => 'academic', 'value' => 'true', 'type' => 'boolean', 'description' => 'Izinkan Mahasiswa Banding Nilai'],
            ['key' => 'evaluation_required_for_transcript', 'group' => 'academic', 'value' => 'true', 'type' => 'boolean', 'description' => 'Wajib Evaluasi Dosen sebelum Transkrip Keluar'],

            // Assessment (Penilaian) — bobot komponen & rentang nilai huruf (dipakai GradeCalculationService)
            ['key' => 'passing_grade_threshold', 'group' => 'assessment', 'value' => '70', 'type' => 'integer', 'description' => 'Batas Nilai Kelulusan Minimal (di bawah ini = E)'],
            ['key' => 'grade_weight_logbook', 'group' => 'assessment', 'value' => '10', 'type' => 'integer', 'description' => 'Bobot Logbook (%) dalam nilai akhir stase'],
            ['key' => 'grade_weight_minicex', 'group' => 'assessment', 'value' => '30', 'type' => 'integer', 'description' => 'Bobot Mini-CEX (%)'],
            ['key' => 'grade_weight_dops', 'group' => 'assessment', 'value' => '30', 'type' => 'integer', 'description' => 'Bobot DOPS (%)'],
            ['key' => 'grade_weight_cbd', 'group' => 'assessment', 'value' => '30', 'type' => 'integer', 'description' => 'Bobot CBD (%)'],
            ['key' => 'grade_band_a', 'group' => 'assessment', 'value' => '85', 'type' => 'integer', 'description' => 'Ambang Nilai Huruf A (skor >=)'],
            ['key' => 'grade_band_ab', 'group' => 'assessment', 'value' => '80', 'type' => 'integer', 'description' => 'Ambang Nilai Huruf AB (skor >=)'],
            ['key' => 'grade_band_b', 'group' => 'assessment', 'value' => '75', 'type' => 'integer', 'description' => 'Ambang Nilai Huruf B (skor >=)'],
            ['key' => 'grade_band_bc', 'group' => 'assessment', 'value' => '70', 'type' => 'integer', 'description' => 'Ambang Nilai Huruf BC (skor >=)'],
            ['key' => 'grade_band_c', 'group' => 'assessment', 'value' => '65', 'type' => 'integer', 'description' => 'Ambang Nilai Huruf C (skor >=)'],
            ['key' => 'grade_band_d', 'group' => 'assessment', 'value' => '50', 'type' => 'integer', 'description' => 'Ambang Nilai Huruf D (skor >=); di bawahnya E'],

            // Clinical
            ['key' => 'logbook_cutoff_days', 'group' => 'clinical', 'value' => '7', 'type' => 'integer', 'description' => 'Batas waktu pengisian logbook (hari) setelah stase'],
            ['key' => 'auto_verify_logbook_days', 'group' => 'clinical', 'value' => '14', 'type' => 'integer', 'description' => 'Otomatis verifikasi logbook jika dibiarkan dosen (hari)'],

            // Attendance (Presensi)
            ['key' => 'require_location_clockin', 'group' => 'attendance', 'value' => 'false', 'type' => 'boolean', 'description' => 'Wajibkan lokasi GPS saat Check-in Presensi'],
            ['key' => 'attendance_default_radius', 'group' => 'attendance', 'value' => '100', 'type' => 'integer', 'description' => 'Radius Geofence Default (meter) — dipakai bila RS belum punya radius sendiri'],
            ['key' => 'attendance_max_speed_kmh', 'group' => 'attendance', 'value' => '90', 'type' => 'integer', 'description' => 'Ambang Kecepatan Anomali GPS (km/jam) untuk menandai dugaan titip absen'],
            ['key' => 'attendance_late_threshold', 'group' => 'attendance', 'value' => '07:30', 'type' => 'string', 'description' => 'Jam Batas Terlambat (HH:MM) — check-in setelah jam ini berstatus LATE'],

            // Finance
            ['key' => 'default_honorarium_rate', 'group' => 'finance', 'value' => '100000', 'type' => 'integer', 'description' => 'Tarif Honorarium Default (Rp)'],
            ['key' => 'billing_cycle', 'group' => 'finance', 'value' => 'Monthly', 'type' => 'string', 'description' => 'Siklus Penagihan Rumah Sakit'],

            // Security
            ['key' => 'session_timeout_minutes', 'group' => 'security', 'value' => '120', 'type' => 'integer', 'description' => 'Waktu Habis Sesi (Menit)'],
            ['key' => 'enforce_2fa', 'group' => 'security', 'value' => 'false', 'type' => 'boolean', 'description' => 'Wajibkan Otentikasi Dua Faktor (2FA)'],

            // Landing Page
            ['key' => 'landing_title', 'group' => 'landing', 'value' => 'Standar Profesionalisme Klinis Medis.', 'type' => 'string', 'description' => 'Judul Utama Landing Page'],
            ['key' => 'landing_hero_badge', 'group' => 'landing', 'value' => 'Layanan Resmi Pendidikan Profesi', 'type' => 'string', 'description' => 'Teks Badge di atas Judul'],
            ['key' => 'landing_description', 'group' => 'landing', 'value' => 'Sistem manajemen terintegrasi untuk Academic Clinical Management System (ACMS). Akurat, objektif, dan dikelola oleh tenaga ahli profesional.', 'type' => 'text', 'description' => 'Deskripsi Singkat Landing Page'],
            ['key' => 'landing_hero_image', 'group' => 'landing', 'value' => '', 'type' => 'string', 'description' => 'Gambar Latar Hero (URL)'],
            ['key' => 'landing_cta_text', 'group' => 'landing', 'value' => 'Masuk Portal', 'type' => 'string', 'description' => 'Teks Tombol CTA'],
            ['key' => 'landing_cta_link', 'group' => 'landing', 'value' => '/login', 'type' => 'string', 'description' => 'Tautan Tombol CTA'],
            ['key' => 'landing_show_stats', 'group' => 'landing', 'value' => 'true', 'type' => 'boolean', 'description' => 'Tampilkan Statistik Universitas'],
            ['key' => 'landing_show_announcement', 'group' => 'landing', 'value' => 'false', 'type' => 'boolean', 'description' => 'Tampilkan Banner Pengumuman'],
            ['key' => 'landing_announcement_text', 'group' => 'landing', 'value' => 'Pendaftaran Ujian OSCE Dibuka hingga 30 Juni 2026.', 'type' => 'string', 'description' => 'Isi Banner Pengumuman'],
            ['key' => 'landing_page_template', 'group' => 'landing', 'value' => 'acms_default', 'type' => 'string', 'description' => 'Template Landing Page Utama'],
            ['key' => 'incident_title', 'group' => 'landing', 'value' => 'Sistem Pelaporan Insiden & Keselamatan Terpadu', 'type' => 'string', 'description' => 'Judul Utama Landing Page Insiden'],
            ['key' => 'incident_hero_badge', 'group' => 'landing', 'value' => 'Layanan Pengaduan Resmi', 'type' => 'string', 'description' => 'Teks Badge di atas Judul Insiden'],
            ['key' => 'incident_description', 'group' => 'landing', 'value' => 'Platform aman dan rahasia untuk melaporkan insiden Keselamatan Pasien, Keselamatan Mahasiswa, K3 (Keselamatan & Kesehatan Kerja), Perundungan/Bullying, Pelanggaran Etik, serta saluran Konsultasi Rahasia di lingkungan akademik klinis.', 'type' => 'text', 'description' => 'Deskripsi Singkat Landing Page Insiden'],
            ['key' => 'incident_cta_text', 'group' => 'landing', 'value' => 'Buat Laporan Sekarang', 'type' => 'string', 'description' => 'Teks Tombol CTA Insiden'],
            ['key' => 'incident_cta_link', 'group' => 'landing', 'value' => '/login', 'type' => 'string', 'description' => 'Tautan Tombol CTA Insiden'],
            ['key' => 'incident_show_consultation', 'group' => 'landing', 'value' => 'true', 'type' => 'boolean', 'description' => 'Tampilkan Section Konsultasi Rahasia di Landing Page'],
            ['key' => 'incident_emergency_banner', 'group' => 'landing', 'value' => 'Jika ini keadaan darurat yang sedang berlangsung dan mengancam nyawa, segera hubungi tenaga medis/keamanan setempat atau hotline darurat. Kanal pelaporan ini TIDAK untuk penanganan emergensi aktif.', 'type' => 'string', 'description' => 'Teks Strip Darurat di Atas Landing Insiden (kosongkan untuk menyembunyikan)'],
            ['key' => 'incident_sla_text', 'group' => 'landing', 'value' => 'Laporan prioritas tinggi ditindaklanjuti maksimal 2x24 jam oleh tim berwenang.', 'type' => 'string', 'description' => 'Teks Komitmen Waktu Respons (SLA) di Landing Insiden'],
            ['key' => 'incident_legal_basis', 'group' => 'landing', 'value' => 'Sistem ini berlandaskan regulasi keselamatan pasien dan pencegahan kekerasan di lingkungan pendidikan tinggi yang berlaku (antara lain Permenkes tentang Keselamatan Pasien serta Permendikbudristek tentang PPKS).', 'type' => 'text', 'description' => 'Dasar Hukum/Regulasi yang Ditampilkan di Landing Insiden'],
            ['key' => 'incident_just_culture', 'group' => 'landing', 'value' => 'Kami menganut prinsip just culture: pelaporan ditujukan untuk pembelajaran dan perbaikan sistem, bukan untuk mencari kesalahan individu. Setiap pelapor dan saksi dilindungi dari segala bentuk tindakan balasan (retaliasi).', 'type' => 'text', 'description' => 'Pernyataan Just Culture & Anti-Retaliasi di Landing Insiden'],
            [
                'key' => 'incident_categories',
                'group' => 'landing',
                'value' => json_encode([
                    ['title' => 'Patient Safety', 'description' => 'Kejadian Nyaris Cedera (KNC), Kejadian Tidak Diharapkan (KTD), atau Sentinel Event yang melibatkan pasien.'],
                    ['title' => 'Student Safety', 'description' => 'Insiden yang mengancam keselamatan fisik atau psikologis mahasiswa selama rotasi klinis (Kepaniteraan Klinik).'],
                    ['title' => 'K3', 'description' => 'Keselamatan & Kesehatan Kerja di lingkungan rumah sakit pendidikan: kepatuhan APD, bahaya fisik-kimia-biologis.'],
                    ['title' => 'Perundungan & Etik', 'description' => 'Perundungan, kekerasan verbal/non-verbal, pelecehan, atau pelanggaran kode etik profesional oleh pihak manapun.'],
                ]),
                'type' => 'json_cards',
                'description' => 'Kartu Kategori Pelaporan di Landing Insiden',
            ],
            [
                'key' => 'incident_faq',
                'group' => 'landing',
                'value' => json_encode([
                    ['question' => 'Apakah identitas saya aman?', 'answer' => 'Ya. Anda dapat memilih opsi Lapor Anonim sehingga identitas Anda tidak direkam sama sekali. Tanpa anonim pun, laporan ditangani secara rahasia dan hanya dapat diakses oleh tim berwenang.'],
                    ['question' => 'Bolehkah saya melaporkan dosen, senior, atau konsulen?', 'answer' => 'Boleh. Pelaporan dapat ditujukan kepada pihak manapun. Institusi menjamin perlindungan pelapor dari segala bentuk tindakan balasan.'],
                    ['question' => 'Bagaimana jika saya tidak yakin apakah ini termasuk insiden?', 'answer' => 'Tetap laporkan, atau gunakan kanal Konsultasi Rahasia. Lebih baik melaporkan kejadian yang ternyata bukan insiden daripada membiarkan potensi bahaya tidak tertangani.'],
                    ['question' => 'Apa yang terjadi setelah saya melapor?', 'answer' => 'Laporan ditelaah oleh tim berwenang, diinvestigasi sesuai SOP, lalu ditindaklanjuti. Laporan prioritas tinggi ditangani lebih cepat sesuai batas waktu yang ditetapkan.'],
                ]),
                'type' => 'json_faq',
                'description' => 'Daftar Pertanyaan Umum (FAQ) di Landing Insiden',
            ],
            ['key' => 'incident_sop_content', 'group' => 'landing', 'value' => "### SOP Pelaporan Insiden\n\n1. **Kerahasiaan Identitas**: Setiap pelapor berhak memilih untuk merahasiakan identitasnya (Anonymous) saat mengirim laporan melalui sistem ini.\n2. **Tindak Lanjut Cepat**: Laporan yang dikategorikan *High Priority* (seperti kekerasan fisik atau perundungan berat) akan ditindaklanjuti maksimal 2x24 jam oleh Komite Etik.\n3. **Verifikasi Bukti**: Pelapor disarankan menyertakan bukti fisik, foto, atau dokumen pendukung untuk mempercepat proses investigasi.", 'type' => 'text', 'description' => 'Isi Dokumen SOP Pelaporan (Markdown)'],
            ['key' => 'incident_witness_protection_content', 'group' => 'landing', 'value' => "### Kebijakan Perlindungan Saksi & Pelapor (Whistleblower Policy)\n\nFakultas Kedokteran dan Rumah Sakit Jejaring menjamin perlindungan penuh terhadap pelapor insiden atau saksi mata dari segala bentuk intimidasi, ancaman, atau tindakan balasan administratif (seperti pengurangan nilai atau hambatan kelulusan).\n\nJika pelapor atau saksi mengalami ancaman pasca-pelaporan, harap segera menghubungi **Satgas Perlindungan Khusus** di kontak darurat yang tersedia.", 'type' => 'text', 'description' => 'Isi Dokumen Perlindungan Saksi (Markdown)'],
            [
                'key' => 'incident_emergency_contacts',
                'group' => 'landing',
                'value' => json_encode([
                    ['name' => 'Hotline Satgas Etik FK', 'role' => 'Call Center 24/7', 'phone' => '119', 'email' => 'satgas.etik@acms.edu', 'link' => 'https://wa.me/628111111111'],
                    ['name' => 'Pusat Bantuan Psikologi (Counseling)', 'role' => 'Dukungan Mental Mahasiswa', 'phone' => '+62 812 3456 7890', 'email' => 'counseling@acms.edu', 'link' => ''],
                    ['name' => 'Komite Keselamatan Pasien RS Utama', 'role' => 'Pelaporan Medis Kritis', 'phone' => '+62 271 777777', 'email' => 'kprs@hospital.acms.edu', 'link' => ''],
                ]),
                'type' => 'json_contacts',
                'description' => 'Daftar Kontak Darurat (JSON)',
            ],

            // Incident Guides per Role
            ['key' => 'incident_guide_super_admin', 'group' => 'guide', 'value' => "### Panduan Super Admin\n\nSebagai Super Admin, Anda memiliki akses penuh...", 'type' => 'text', 'description' => 'Panduan Insiden untuk Super Admin'],
            ['key' => 'incident_guide_admin_prodi', 'group' => 'guide', 'value' => "### Panduan Admin Prodi\n\nSebagai Admin Prodi, Anda bertugas mengelola...", 'type' => 'text', 'description' => 'Panduan Insiden untuk Admin Prodi'],
            ['key' => 'incident_guide_kaprodi', 'group' => 'guide', 'value' => "### Panduan Kaprodi\n\nSebagai Kaprodi, Anda bertugas memonitor insiden...", 'type' => 'text', 'description' => 'Panduan Insiden untuk Kaprodi'],
            ['key' => 'incident_guide_dosen', 'group' => 'guide', 'value' => "### Panduan Dosen\n\nSebagai Dosen, Anda dapat melaporkan insiden...", 'type' => 'text', 'description' => 'Panduan Insiden untuk Dosen'],
            ['key' => 'incident_guide_dodiknis', 'group' => 'guide', 'value' => "### Panduan Dodiknis\n\nSebagai Dodiknis, panduan pelaporan Anda adalah...", 'type' => 'text', 'description' => 'Panduan Insiden untuk Dodiknis'],
            ['key' => 'incident_guide_admin_rs', 'group' => 'guide', 'value' => "### Panduan Admin RS\n\nSebagai Admin RS, panduan pelaporan Anda adalah...", 'type' => 'text', 'description' => 'Panduan Insiden untuk Admin RS'],
            ['key' => 'incident_guide_mahasiswa', 'group' => 'guide', 'value' => "### Panduan Mahasiswa\n\nSebagai Mahasiswa, Anda diwajibkan melaporkan insiden...", 'type' => 'text', 'description' => 'Panduan Insiden untuk Mahasiswa'],
            ['key' => 'incident_guide_finance', 'group' => 'guide', 'value' => "### Panduan Finance\n\nSebagai Keuangan, panduan pelaporan Anda adalah...", 'type' => 'text', 'description' => 'Panduan Insiden untuk Finance'],

            // Incident (Pelaporan Insiden & Keselamatan)
            ['key' => 'incident_max_attachment_size_mb', 'group' => 'incident', 'value' => '10', 'type' => 'integer', 'description' => 'Ukuran Maksimal Lampiran Bukti Insiden (MB)'],
            ['key' => 'incident_allowed_attachment_types', 'group' => 'incident', 'value' => 'jpg,jpeg,png,pdf,doc,docx', 'type' => 'string', 'description' => 'Jenis File Lampiran yang Diizinkan (pisahkan koma, tanpa spasi)'],
            ['key' => 'incident_auto_notify_critical', 'group' => 'incident', 'value' => 'true', 'type' => 'boolean', 'description' => 'Kirim Notifikasi Darurat Otomatis untuk Insiden Kritis (Critical)'],
            ['key' => 'incident_response_deadline_hours', 'group' => 'incident', 'value' => '48', 'type' => 'integer', 'description' => 'Batas Waktu Respons Investigasi (jam) — untuk pengingat otomatis'],

            // SMTP (Mail)
            ['key' => 'smtp_host', 'group' => 'smtp', 'value' => 'smtp.mailtrap.io', 'type' => 'string', 'description' => 'SMTP Host'],
            ['key' => 'smtp_port', 'group' => 'smtp', 'value' => '2525', 'type' => 'integer', 'description' => 'SMTP Port'],
            ['key' => 'smtp_username', 'group' => 'smtp', 'value' => '', 'type' => 'string', 'description' => 'SMTP Username'],
            ['key' => 'smtp_password', 'group' => 'smtp', 'value' => '', 'type' => 'password', 'description' => 'SMTP Password'],
            ['key' => 'smtp_encryption', 'group' => 'smtp', 'value' => 'tls', 'type' => 'string', 'description' => 'SMTP Encryption (tls/ssl)'],
            ['key' => 'smtp_from_address', 'group' => 'smtp', 'value' => 'no-reply@acms.edu', 'type' => 'string', 'description' => 'Email Pengirim (From Address)'],
            ['key' => 'smtp_from_name', 'group' => 'smtp', 'value' => 'ACMS System', 'type' => 'string', 'description' => 'Nama Pengirim (From Name)'],
            ['key' => 'enable_email_notifications', 'group' => 'smtp', 'value' => 'true', 'type' => 'boolean', 'description' => 'Aktifkan Notifikasi Email Sistem'],
            ['key' => 'enable_email_broadcasts', 'group' => 'smtp', 'value' => 'true', 'type' => 'boolean', 'description' => 'Aktifkan Pengiriman Email Broadcast'],
            [
                'key' => 'smtp_notification_matrix',
                'group' => 'smtp',
                'value' => json_encode([
                    'new_account' => ['enabled' => true, 'cc_emails' => '', 'notify_roles' => [], 'conditional_rules' => []],
                    'reset_password' => ['enabled' => true, 'cc_emails' => '', 'notify_roles' => [], 'conditional_rules' => []],
                    'logbook_verified' => ['enabled' => false, 'cc_emails' => '', 'notify_roles' => [], 'conditional_rules' => []],
                    'rotation_assigned' => ['enabled' => true, 'cc_emails' => '', 'notify_roles' => [], 'conditional_rules' => []],
                    'grade_published' => ['enabled' => false, 'cc_emails' => '', 'notify_roles' => [], 'conditional_rules' => []],
                    'finance_billing' => ['enabled' => false, 'cc_emails' => '', 'notify_roles' => [], 'conditional_rules' => []],
                    'consultation_submitted' => [
                        'enabled' => true,
                        'cc_emails' => '',
                        'notify_roles' => ['Admin Prodi', 'Kaprodi'],
                        'conditional_rules' => [],
                    ],
                    'consultation_responded' => [
                        'enabled' => true,
                        'cc_emails' => '',
                        'notify_roles' => [],
                        'conditional_rules' => [],
                    ],
                    'incident_status_updated' => [
                        'enabled' => true,
                        'cc_emails' => '',
                        'notify_roles' => [],
                        'conditional_rules' => [],
                    ],
                    'incident_reported' => [
                        'enabled' => true,
                        'cc_emails' => '',
                        'notify_roles' => ['Super Admin', 'Kaprodi'],
                        'conditional_rules' => [
                            [
                                'trigger_field' => 'incident_type',
                                'trigger_value' => 'bullying',
                                'additional_cc' => 'satgas@acms.edu',
                                'additional_roles' => ['Super Admin'],
                            ],
                        ],
                    ],
                ]),
                'type' => 'matrix',
                'description' => 'Matriks Ceklis Notifikasi Email Otomatis',
            ],
            ['key' => 'email_template_welcome', 'group' => 'smtp', 'value' => 'Halo {name},\n\nSelamat datang di sistem ACMS. Akun Anda telah berhasil dibuat.', 'type' => 'text', 'description' => 'Template Email Selamat Datang'],
            ['key' => 'email_template_reset', 'group' => 'smtp', 'value' => 'Halo {name},\n\nKlik tautan berikut untuk mereset kata sandi Anda: {link}', 'type' => 'text', 'description' => 'Template Email Reset Password'],

            // OAuth (SSO)
            ['key' => 'enable_google_sso', 'group' => 'oauth', 'value' => 'true', 'type' => 'boolean', 'description' => 'Aktifkan Login dengan Google (SSO)'],
            ['key' => 'sso_allowed_domains', 'group' => 'oauth', 'value' => '', 'type' => 'string', 'description' => 'Domain yang Diizinkan (opsional, pisahkan dengan koma)'],
            ['key' => 'google_client_id', 'group' => 'oauth', 'value' => '', 'type' => 'string', 'description' => 'Google Client ID'],
            ['key' => 'google_client_secret', 'group' => 'oauth', 'value' => '', 'type' => 'password', 'description' => 'Google Client Secret'],
            ['key' => 'google_redirect_url', 'group' => 'oauth', 'value' => 'http://localhost:3000/sso-callback', 'type' => 'string', 'description' => 'Google Redirect URL (Frontend)'],

            // AI Assistant (Super Admin) — OpenAI-compatible (NVIDIA NIM / Ollama)
            ['key' => 'ai_enabled', 'group' => 'ai_assistant', 'value' => 'false', 'type' => 'boolean', 'description' => 'Aktifkan AI Assistant di panel Super Admin'],
            ['key' => 'ai_base_url', 'group' => 'ai_assistant', 'value' => 'https://integrate.api.nvidia.com/v1', 'type' => 'string', 'description' => 'Base URL endpoint OpenAI-compatible (NVIDIA NIM: https://integrate.api.nvidia.com/v1 · Ollama: http://localhost:11434/v1)'],
            ['key' => 'ai_model', 'group' => 'ai_assistant', 'value' => 'meta/llama-3.1-8b-instruct', 'type' => 'string', 'description' => 'Nama model (cth: meta/llama-3.1-8b-instruct · Ollama: llama3.1)'],
            ['key' => 'ai_api_key', 'group' => 'ai_assistant', 'value' => '', 'type' => 'secret', 'description' => 'API Key (mis. nvapi-... dari NVIDIA). Tersimpan terenkripsi & tidak pernah ditampilkan kembali.'],
            ['key' => 'ai_system_prompt', 'group' => 'ai_assistant', 'value' => '', 'type' => 'text', 'description' => 'Persona/instruksi tambahan untuk AI (opsional). Aturan dasar anti-mengarang, gaya bahasa, & pemakaian tool sudah ditanam di sistem; isi ini hanya pelengkap.'],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(['key' => $setting['key']], $setting);
        }
    }
}
