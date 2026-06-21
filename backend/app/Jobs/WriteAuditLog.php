<?php

namespace App\Jobs;

use App\Models\AuditLog;
use Illuminate\Bus\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

/**
 * Persists a single audit log entry with tamper-evident hash chaining.
 *
 * Dispatched via AuditService::log() using dispatchAfterResponse() so the chain
 * write happens out of the request's critical path. The chain links each row to
 * its predecessor's hash (AUDIT_TRAIL_SPEC.md §5).
 */
class WriteAuditLog
{
    use Dispatchable, Queueable, SerializesModels;

    /**
     * @param  array<string,mixed>  $data  Fully-scalar audit payload built by AuditService.
     */
    public function __construct(private array $data) {}

    public function handle(): void
    {
        DB::transaction(function (): void {
            // Lock the latest row so concurrent writers chain deterministically.
            $previous = AuditLog::query()
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();

            $previousHash = $previous?->hash;

            AuditLog::create(array_merge($this->data, [
                'previous_hash' => $previousHash,
                'hash' => self::computeHash($this->data, $previousHash),
            ]));
        });
    }

    /**
     * SHA-256 over: prevHash | action | targetId | actorId | newPayload | timestamp | secret.
     * The secret salt lives outside the database so a rogue DBA cannot forge the chain.
     */
    public static function computeHash(array $data, ?string $previousHash): string
    {
        $secret = config('app.audit_salt') ?: config('app.key');

        return hash('sha256', implode('|', [
            $previousHash ?? '',
            $data['action'] ?? '',
            $data['target_id'] ?? '',
            $data['actor_id'] ?? '',
            json_encode($data['new_payload'] ?? null),
            $data['created_at'] ?? '',
            $secret,
        ]));
    }
}
