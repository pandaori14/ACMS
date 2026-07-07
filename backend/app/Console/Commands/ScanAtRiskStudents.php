<?php

namespace App\Console\Commands;

use App\Services\AtRiskDetectionService;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

/**
 * Scan mingguan mahasiswa berisiko (terjadwal di routes/console.php).
 * Ringkasan dikirim via SMTP matrix `at_risk_alert` — Super Admin mengatur
 * siapa penerimanya (default Kaprodi & Admin Prodi lewat notify_roles).
 */
class ScanAtRiskStudents extends Command
{
    protected $signature = 'analytics:scan-at-risk {--dry : Tampilkan hasil tanpa mengirim notifikasi}';

    protected $description = 'Pindai mahasiswa berisiko (nilai/logbook/presensi/remedial) dan kirim ringkasan ke pengelola';

    public function handle(AtRiskDetectionService $service): int
    {
        $result = $service->scan();
        Cache::put('analytics_at_risk', $result, 600);

        $count = count($result['students']);
        $high = collect($result['students'])->where('level', 'high')->count();
        $this->info("Dipindai {$result['scanned']} mahasiswa aktif — {$count} berisiko ({$high} level tinggi).");

        if ($this->option('dry') || $count === 0) {
            return self::SUCCESS;
        }

        $top = collect($result['students'])->take(10)
            ->map(fn ($s) => "- {$s['name']} ({$s['identity_number']}): ".implode('; ', $s['signals']))
            ->implode("\n");

        // Penerima diatur via matrix notify_roles — email "to" hanya anchor
        // (matrix meneruskan ke peran yang dikonfigurasi).
        NotificationService::sendDynamicEmail(
            config('mail.from.address', 'noreply@acms.local'),
            'Peringatan Dini: Mahasiswa Berisiko',
            'email_template_at_risk_alert',
            'at_risk_alert',
            [
                'count' => (string) $count,
                'high' => (string) $high,
                'list' => $top,
            ]
        );

        return self::SUCCESS;
    }
}
