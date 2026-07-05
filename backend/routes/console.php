<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('logbook:auto-verify')->daily();

// Retensi PII: anonimkan laporan insiden selesai yang melewati masa retensi
Schedule::command('incidents:prune-pii')->monthly();

// Verify the audit hash chain nightly (AUDIT_TRAIL_SPEC.md §5.2 — 02:00 WIB off-peak)
Schedule::command('audit:verify-chain')
    ->dailyAt('02:00')
    ->onFailure(function () {
        Log::critical('Audit chain integrity verification FAILED — possible tampering of audit_logs.');
    });
