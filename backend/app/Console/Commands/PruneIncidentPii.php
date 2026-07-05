<?php

namespace App\Console\Commands;

use App\Models\Setting;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Modules\Incident\Models\IncidentReport;

/**
 * Kebijakan retensi PII insiden: laporan yang sudah selesai
 * (resolved/closed) dan lebih tua dari masa retensi dianonimkan permanen —
 * identitas pelapor dihapus dan lampiran dimusnahkan. Data statistik
 * (jenis, tanggal, lokasi, deskripsi) tetap utuh untuk pelaporan agregat.
 */
class PruneIncidentPii extends Command
{
    protected $signature = 'incidents:prune-pii {--dry : Tampilkan jumlah kandidat tanpa mengubah data}';

    protected $description = 'Anonimisasi PII laporan insiden lama sesuai kebijakan retensi (setting incident_retention_months)';

    public function handle(): int
    {
        $months = (int) Setting::getValue('incident_retention_months', 24);
        if ($months < 1) {
            $months = 24;
        }
        $cutoff = now()->subMonths($months);

        $query = IncidentReport::whereIn('status', ['resolved', 'closed'])
            ->where('created_at', '<', $cutoff)
            ->whereNull('anonymized_at')
            ->where(function ($q) {
                $q->whereNotNull('reporter_id')->orWhereNotNull('attachment_path');
            });

        $count = $query->count();

        if ($this->option('dry')) {
            $this->info("[DRY-RUN] {$count} laporan (selesai, lebih tua dari {$months} bulan) akan dianonimkan. Tidak ada data diubah.");

            return self::SUCCESS;
        }

        $processed = 0;
        $query->orderBy('created_at')->chunkById(100, function ($reports) use (&$processed) {
            foreach ($reports as $report) {
                if ($report->attachment_path && Storage::disk('public')->exists($report->attachment_path)) {
                    Storage::disk('public')->delete($report->attachment_path);
                }

                $report->update([
                    'reporter_id' => null,
                    'attachment_path' => null,
                    'is_anonymous' => true,
                    'anonymized_at' => now(),
                ]);
                $processed++;
            }
        });

        $this->info("{$processed} laporan insiden dianonimkan (retensi {$months} bulan).");

        return self::SUCCESS;
    }
}
