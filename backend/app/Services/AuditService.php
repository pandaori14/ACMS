<?php

namespace App\Services;

use App\Jobs\WriteAuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Central entry point for recording audit trail events.
 *
 * Resolves the current actor / IP / program from the request lifecycle and hands
 * a fully-scalar payload to a deferred job, so the chain-hash write never blocks
 * the HTTP response (see AUDIT_TRAIL_SPEC.md §3 "Fire-and-Forget").
 */
class AuditService
{
    /** Attributes that must never land in an audit payload. */
    private const REDACTED = ['password', 'remember_token', 'updated_at', 'created_at', 'deleted_at'];

    /**
     * Record an audit event.
     *
     * @param  string  $action  Standardized event name, e.g. 'clinical.logbook.signed'.
     * @param  Model|null  $target  The entity affected (null for system/auth events).
     * @param  array  $old  Scalar state before the change (dirty keys only).
     * @param  array  $new  Scalar state after the change (dirty keys only).
     * @param  array  $metadata  Extra context (deltas, reasons, filters, ...).
     */
    public static function log(
        string $action,
        ?Model $target = null,
        array $old = [],
        array $new = [],
        array $metadata = []
    ): void {
        $user = Auth::user();
        $request = request();

        $programId = null;
        if ($target && isset($target->program_id)) {
            $programId = $target->program_id;
        } elseif ($user && isset($user->program_id)) {
            $programId = $user->program_id;
        }

        $data = [
            'program_id' => $programId,
            'actor_id' => $user?->getKey(),
            'actor_role' => $user ? $user->getRoleNames()->first() : null,
            'action' => $action,
            'target_type' => $target ? $target::class : null,
            'target_id' => $target?->getKey(),
            'old_payload' => self::clean($old),
            'new_payload' => self::clean($new),
            'metadata' => empty($metadata) ? null : $metadata,
            'ip_address' => $request?->ip(),
            'user_agent' => $request ? substr((string) $request->userAgent(), 0, 1000) : null,
            'created_at' => now()->toDateTimeString(),
        ];

        // Runs after the response is flushed to the client — non-blocking, and works
        // on the database queue driver without a separate worker process (dev).
        // For production scale, swap to WriteAuditLog::dispatch() on a Redis queue.
        WriteAuditLog::dispatchAfterResponse($data);
    }

    private static function clean(array $payload): ?array
    {
        $payload = array_diff_key($payload, array_flip(self::REDACTED));

        return empty($payload) ? null : $payload;
    }
}
