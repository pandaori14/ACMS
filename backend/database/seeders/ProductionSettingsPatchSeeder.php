<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Patch settings untuk server PRODUKSI yang sudah live — AMAN dijalankan
 * berulang: hanya MENAMBAH kunci yang belum ada, TIDAK menimpa nilai yang
 * sudah dikonfigurasi admin (beda dengan SettingSeeder yang updateOrCreate
 * dan akan me-reset SMTP/API key!).
 *
 * Jalankan: php artisan db:seed --class=ProductionSettingsPatchSeeder --force
 */
class ProductionSettingsPatchSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Template email baru (firstOrCreate = tidak menimpa yang sudah ada)
        $templates = [
            ['key' => 'incident_retention_months', 'group' => 'incident', 'value' => '24', 'type' => 'string', 'description' => 'Masa retensi identitas pelapor insiden (bulan). Laporan selesai yang lebih tua dianonimkan permanen oleh sistem tiap bulan.'],
            ['key' => 'email_template_honorarium_paid', 'group' => 'smtp', 'value' => 'Halo {name},\n\nHonorarium Anda untuk periode {period} sebesar {amount} telah dibayarkan. Terima kasih atas dedikasi Anda.', 'type' => 'text', 'description' => 'Template Email Honorarium Dibayar'],
            ['key' => 'email_template_rotation_assigned', 'group' => 'smtp', 'value' => 'Halo {name},\n\nAnda ditempatkan pada stase {stase} di {hospital} untuk periode {period}. Silakan cek jadwal rotasi Anda di sistem ACMS.', 'type' => 'text', 'description' => 'Template Email Penempatan Rotasi'],
            ['key' => 'email_template_grade_published', 'group' => 'smtp', 'value' => 'Halo {name},\n\nNilai stase {stase} Anda telah terbit: {grade} ({score}). Silakan cek transkrip Anda di sistem ACMS.', 'type' => 'text', 'description' => 'Template Email Nilai Terbit'],
            ['key' => 'email_template_logbook_verified', 'group' => 'smtp', 'value' => 'Halo {name},\n\nLogbook Anda pada stase {stase} tanggal {date} telah diverifikasi ({status}).', 'type' => 'text', 'description' => 'Template Email Logbook Diverifikasi'],
            ['key' => 'email_template_student_status_changed', 'group' => 'smtp', 'value' => 'Halo {name},\n\nStatus akademik Anda di sistem ACMS telah diubah menjadi: {status}.\nAlasan: {reason}\n\nHubungi admin program studi bila ada pertanyaan.', 'type' => 'text', 'description' => 'Template Email Perubahan Status Mahasiswa'],

            // Ambang kelayakan yudisium (dipakai YudisiumEligibilityService)
            ['key' => 'yudisium_min_minicex', 'group' => 'assessment', 'value' => '1', 'type' => 'integer', 'description' => 'Minimum Mini-CEX acknowledged untuk kelayakan yudisium'],
            ['key' => 'yudisium_min_dops', 'group' => 'assessment', 'value' => '1', 'type' => 'integer', 'description' => 'Minimum DOPS acknowledged untuk kelayakan yudisium'],
            ['key' => 'yudisium_min_cbd', 'group' => 'assessment', 'value' => '1', 'type' => 'integer', 'description' => 'Minimum CBD acknowledged untuk kelayakan yudisium'],

            // Banding nilai, remedial, flag telat logbook
            ['key' => 'appeal_window_days', 'group' => 'assessment', 'value' => '14', 'type' => 'integer', 'description' => 'Jendela banding nilai (hari sejak nilai terbit)'],
            ['key' => 'max_remedial_attempts', 'group' => 'academic', 'value' => '2', 'type' => 'integer', 'description' => 'Maksimal remedial (mengulang stase) sebelum butuh review akademik'],
            ['key' => 'logbook_late_days', 'group' => 'clinical', 'value' => '3', 'type' => 'integer', 'description' => 'Ambang hari kegiatan→submit sebelum logbook ditandai TERLAMBAT (compliance, tidak memblokir)'],
            ['key' => 'email_template_appeal_submitted', 'group' => 'smtp', 'value' => 'Banding nilai diajukan oleh {name} untuk stase {stase}.\n\nAlasan: {reason}\n\nSilakan tinjau di menu Banding Nilai sistem ACMS.', 'type' => 'text', 'description' => 'Template Email Banding Nilai Diajukan'],
            ['key' => 'email_template_appeal_decided', 'group' => 'smtp', 'value' => 'Halo {name},\n\nBanding nilai stase {stase} Anda telah diputuskan: {decision}.\nCatatan peninjau: {note}', 'type' => 'text', 'description' => 'Template Email Hasil Banding Nilai'],
            ['key' => 'email_template_swap_requested', 'group' => 'smtp', 'value' => 'Permintaan tukar jadwal rotasi diajukan oleh {name} (stase {stase}).\n\nAlasan: {reason}\n\nTinjau di menu Tukar Jadwal sistem ACMS.', 'type' => 'text', 'description' => 'Template Email Permintaan Tukar Jadwal'],
            ['key' => 'email_template_swap_decided', 'group' => 'smtp', 'value' => 'Halo {name},\n\nPermintaan tukar jadwal rotasi yang melibatkan Anda telah {decision}.\nCatatan: {note}\n\nCek jadwal terbaru Anda di sistem ACMS.', 'type' => 'text', 'description' => 'Template Email Hasil Tukar Jadwal'],
            ['key' => 'email_template_at_risk_alert', 'group' => 'smtp', 'value' => 'Peringatan dini akademik ACMS:\n\n{count} mahasiswa terdeteksi berisiko ({high} level tinggi).\n\n{list}\n\nDetail lengkap: Dashboard Eksekutif > Mahasiswa Berisiko.', 'type' => 'text', 'description' => 'Template Email Peringatan Mahasiswa Berisiko'],

            // Pusat Bantuan (markdown per peran — dirender di /dashboard/help)
            ['key' => 'help_center_umum', 'group' => 'help', 'value' => "## Selamat datang di ACMS\n\nACMS adalah sistem manajemen pendidikan klinik FK UMS. Beberapa hal umum:\n\n- **Profil & Password**: klik avatar di pojok kanan atas → *Profil Saya* untuk mengganti password dan mengaktifkan **2FA**.\n- **Lupa password**: gunakan tautan *Lupa password?* di halaman login.\n- **Notifikasi**: ikon lonceng menampilkan pemberitahuan penting (nilai terbit, logbook diverifikasi, penempatan rotasi).\n- **Install di HP**: buka ACMS di browser HP → menu browser → *Tambahkan ke layar utama*.", 'type' => 'text', 'description' => 'Konten bantuan UMUM (markdown) — tampil untuk semua peran'],
            ['key' => 'help_center_mahasiswa', 'group' => 'help', 'value' => "## Panduan Mahasiswa (Koass)\n\n1. **Presensi** — menu *Presensi*: check-in saat tiba di RS (GPS aktif), check-out saat pulang. Ajukan izin/sakit dari tombol di halaman yang sama.\n2. **Logbook** — isi kegiatan harian di *Logbook Klinis*, pilih *Target Kompetensi* agar dihitung ke progres, lalu **Submit** agar diverifikasi pembimbing.\n3. **Jadwal Rotasi** — lihat stase & RS penempatan Anda di *Jadwal Rotasi*.\n4. **Ujian CBT** — saat ujian dibuka, tombol **Kerjakan Ujian** muncul di menu *Ujian*. Perhatikan timer; jawaban tersimpan otomatis.\n5. **Nilai & Transkrip** — nilai terbit di *Transkrip Klinis*; dokumen resmi ber-QR di *Dokumen Resmi*.\n6. **Lapor Insiden** — gunakan *Lapor Insiden* (bisa anonim) untuk kejadian keselamatan.", 'type' => 'text', 'description' => 'Konten bantuan MAHASISWA (markdown)'],
            ['key' => 'help_center_dodiknis', 'group' => 'help', 'value' => "## Panduan Dodiknis (Preceptor)\n\n1. **Verifikasi Logbook** — menu *Verifikasi Logbook*: tinjau entri mahasiswa, verifikasi/tolak per entri, atau centang beberapa lalu **Verifikasi Massal**.\n2. **Penilaian** — isi Mini-CEX/DOPS/CBD dari *Isi Penilaian*; mahasiswa harus meng-*acknowledge* hasilnya.\n3. **Mahasiswa Bimbingan** — lihat roster aktif Anda di *Dasbor Preceptor*.\n4. **Honorarium** — riwayat pembayaran insentif ada di *Honorarium Saya*.\n5. **Rekap Presensi** — pantau kehadiran mahasiswa Anda di *Rekap Presensi*; koreksi bila perlu.", 'type' => 'text', 'description' => 'Konten bantuan DODIKNIS (markdown)'],
            ['key' => 'help_center_admin', 'group' => 'help', 'value' => "## Panduan Admin\n\n1. **Data Master** — kelola Fakultas/Prodi, Stase, Angkatan, Mahasiswa (termasuk **Import Excel**), dan RS + kuota per stase.\n2. **Rotasi** — buat periode, lalu gunakan **Jadwalkan Otomatis** (round-robin) atau drag-drop manual; sistem menolak penempatan yang melanggar kuota.\n3. **Ujian** — buat ujian, kelola peserta/penguji; untuk CBT isi **Bank Soal** lalu ubah status ke ONGOING saat mulai.\n4. **Nilai** — kalkulasi per penempatan → *Approve* (Kaprodi) → *Publish*.\n5. **Laporan** — semua unduhan ada di **Pusat Laporan**; KPI strategis di **Dashboard Eksekutif**.\n6. **Settings** — SMTP, matrix notifikasi, referensi dropdown, RBAC, dan konten halaman ini (grup *Pusat Bantuan*).", 'type' => 'text', 'description' => 'Konten bantuan ADMIN (markdown)'],
        ];

        foreach ($templates as $template) {
            Setting::firstOrCreate(['key' => $template['key']], $template);
        }

        // 2. Merge kunci matrix notifikasi yang belum ada (jaga konfigurasi admin)
        $matrixSetting = Setting::where('key', 'smtp_notification_matrix')->first();
        if ($matrixSetting) {
            $matrix = json_decode($matrixSetting->value, true);
            $matrix = is_array($matrix) ? $matrix : [];

            $defaults = [
                'honorarium_paid' => ['enabled' => true, 'cc_emails' => '', 'notify_roles' => [], 'conditional_rules' => []],
                'rotation_assigned' => ['enabled' => true, 'cc_emails' => '', 'notify_roles' => [], 'conditional_rules' => []],
                'grade_published' => ['enabled' => false, 'cc_emails' => '', 'notify_roles' => [], 'conditional_rules' => []],
                'logbook_verified' => ['enabled' => false, 'cc_emails' => '', 'notify_roles' => [], 'conditional_rules' => []],
                'student_status_changed' => ['enabled' => true, 'cc_emails' => '', 'notify_roles' => [], 'conditional_rules' => []],
                'appeal_submitted' => ['enabled' => true, 'cc_emails' => '', 'notify_roles' => ['Kaprodi', 'Admin Prodi'], 'conditional_rules' => []],
                'appeal_decided' => ['enabled' => true, 'cc_emails' => '', 'notify_roles' => [], 'conditional_rules' => []],
                'swap_requested' => ['enabled' => true, 'cc_emails' => '', 'notify_roles' => ['Admin Prodi'], 'conditional_rules' => []],
                'swap_decided' => ['enabled' => true, 'cc_emails' => '', 'notify_roles' => [], 'conditional_rules' => []],
                'at_risk_alert' => ['enabled' => true, 'cc_emails' => '', 'notify_roles' => ['Kaprodi', 'Admin Prodi'], 'conditional_rules' => []],
            ];

            $changed = false;
            foreach ($defaults as $key => $rule) {
                if (! array_key_exists($key, $matrix)) {
                    $matrix[$key] = $rule;
                    $changed = true;
                }
            }

            if ($changed) {
                $matrixSetting->update(['value' => json_encode($matrix)]);
            }
        }

        // 3. Referensi baru (student_statuses dll) — updateOrCreate per
        //    (category, value): aman, referensi tambahan admin tidak tersentuh.
        $this->call(SystemReferenceSeeder::class);

        // 4. Grant permission ADDITIVE (JANGAN syncPermissions di produksi —
        //    me-reset kustomisasi RBAC dari UI). Kaprodi wajib manage-grades
        //    agar loop approve nilai berjalan.
        $kaprodi = Role::where('name', 'Kaprodi')->first();
        if ($kaprodi && ! $kaprodi->hasPermissionTo('manage-grades')) {
            $kaprodi->givePermissionTo('manage-grades');
        }

        // Admin RS: lihat rotasi & rekap presensi (ter-scope RS-nya di controller)
        $adminRs = Role::where('name', 'Admin RS')->first();
        if ($adminRs) {
            foreach (['view-rotations', 'view-attendance-recap'] as $perm) {
                if (! $adminRs->hasPermissionTo($perm)) {
                    $adminRs->givePermissionTo($perm);
                }
            }
        }

        // Executive Analytics + Broadcast: permission baru + grant additive
        // ke Kaprodi & Admin Prodi (JANGAN syncPermissions di produksi)
        foreach (['view-executive-analytics', 'send-broadcasts'] as $permName) {
            Permission::firstOrCreate(['name' => $permName, 'guard_name' => 'web']);
            foreach (['Kaprodi', 'Admin Prodi'] as $roleName) {
                $role = Role::where('name', $roleName)->first();
                if ($role && ! $role->hasPermissionTo($permName)) {
                    $role->givePermissionTo($permName);
                }
            }
        }

        $this->command?->info('Patch settings produksi selesai (idempotent).');
    }
}
