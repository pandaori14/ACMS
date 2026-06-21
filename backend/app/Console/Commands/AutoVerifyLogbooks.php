<?php

namespace App\Console\Commands;

use App\Models\Setting;
use Illuminate\Console\Command;
use Modules\Clinical\Models\LogbookEntry;

class AutoVerifyLogbooks extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'logbook:auto-verify';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Otomatis validasi logbook mahasiswa jika sudah melewati batas hari verifikasi oleh dosen';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $autoVerifyDays = Setting::getValue('auto_verify_logbook_days', 14);

        if ($autoVerifyDays <= 0) {
            $this->info('Fitur auto-verify dimatikan.');

            return;
        }

        $cutoffDate = now()->subDays($autoVerifyDays);

        $logbooks = LogbookEntry::where('status', 'submitted')
            ->whereNotNull('submitted_at')
            ->where('submitted_at', '<', $cutoffDate)
            ->get();

        $count = 0;
        foreach ($logbooks as $logbook) {
            $logbook->update([
                'status' => 'verified',
                'preceptor_feedback' => 'Divalidasi otomatis oleh sistem karena melewati batas waktu '.$autoVerifyDays.' hari.',
            ]);
            $count++;
        }

        $this->info("Berhasil memvalidasi otomatis {$count} logbook.");
    }
}
