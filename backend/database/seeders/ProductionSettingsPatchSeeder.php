<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

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
            ['key' => 'email_template_honorarium_paid', 'group' => 'smtp', 'value' => 'Halo {name},\n\nHonorarium Anda untuk periode {period} sebesar {amount} telah dibayarkan. Terima kasih atas dedikasi Anda.', 'type' => 'text', 'description' => 'Template Email Honorarium Dibayar'],
            ['key' => 'email_template_rotation_assigned', 'group' => 'smtp', 'value' => 'Halo {name},\n\nAnda ditempatkan pada stase {stase} di {hospital} untuk periode {period}. Silakan cek jadwal rotasi Anda di sistem ACMS.', 'type' => 'text', 'description' => 'Template Email Penempatan Rotasi'],
            ['key' => 'email_template_grade_published', 'group' => 'smtp', 'value' => 'Halo {name},\n\nNilai stase {stase} Anda telah terbit: {grade} ({score}). Silakan cek transkrip Anda di sistem ACMS.', 'type' => 'text', 'description' => 'Template Email Nilai Terbit'],
            ['key' => 'email_template_logbook_verified', 'group' => 'smtp', 'value' => 'Halo {name},\n\nLogbook Anda pada stase {stase} tanggal {date} telah diverifikasi ({status}).', 'type' => 'text', 'description' => 'Template Email Logbook Diverifikasi'],
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

        $this->command?->info('Patch settings produksi selesai (idempotent).');
    }
}
