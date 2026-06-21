<?php

namespace App\Console\Commands;

use App\Jobs\WriteAuditLog;
use App\Models\AuditLog;
use Illuminate\Console\Command;

/**
 * Recomputes the audit hash chain and reports any tampering.
 *
 * Schedule daily during off-peak hours (AUDIT_TRAIL_SPEC.md §5.2). A mismatch means
 * a row was altered or deleted directly in the database, breaking the chain from that
 * point forward.
 *
 *   php artisan audit:verify-chain
 *   php artisan audit:verify-chain --limit=5000
 */
class VerifyAuditChain extends Command
{
    protected $signature = 'audit:verify-chain {--limit=0 : Only verify the most recent N rows (0 = all)}';

    protected $description = 'Verify the tamper-evident hash chain of the audit_logs table';

    public function handle(): int
    {
        $limit = (int) $this->option('limit');

        $query = AuditLog::query()->orderBy('created_at')->orderBy('id');

        if ($limit > 0) {
            // Take the newest N, then re-sort ascending to walk the chain forward.
            $ids = AuditLog::query()->orderByDesc('created_at')->orderByDesc('id')
                ->limit($limit)->pluck('id');
            $query->whereIn('id', $ids);
        }

        $total = 0;
        $broken = [];
        $prevRow = null;

        $query->chunk(500, function ($logs) use (&$total, &$broken, &$prevRow): void {
            foreach ($logs as $log) {
                $total++;

                $expectedPrev = $prevRow?->hash;
                if ((string) $log->previous_hash !== (string) ($expectedPrev ?? '')) {
                    $broken[] = $log->id.' (broken previous_hash link)';
                }

                $expectedHash = WriteAuditLog::computeHash([
                    'action' => $log->action,
                    'target_id' => $log->target_id,
                    'actor_id' => $log->actor_id,
                    'new_payload' => $log->new_payload,
                    'created_at' => $log->created_at?->toDateTimeString(),
                ], $log->previous_hash);

                if (! hash_equals($expectedHash, (string) $log->hash)) {
                    $broken[] = $log->id.' (hash mismatch)';
                }

                $prevRow = $log;
            }
        });

        if (empty($broken)) {
            $this->info("Audit chain verified: {$total} record(s) intact.");

            return self::SUCCESS;
        }

        $this->error("Audit chain integrity FAILED. {$total} checked, ".count($broken).' compromised:');
        foreach ($broken as $entry) {
            $this->line('  - '.$entry);
        }

        return self::FAILURE;
    }
}
