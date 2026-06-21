<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Immutable audit log record.
 *
 * Append-only: the model blocks UPDATE and DELETE at the application layer
 * (PostgreSQL table triggers from AUDIT_TRAIL_SPEC.md are not available on MySQL dev).
 * Hash chaining is computed by App\Jobs\WriteAuditLog before insert.
 */
class AuditLog extends Model
{
    use HasUuids;

    protected $table = 'audit_logs';

    /** Append-only: created_at is set explicitly by the writer, no updated_at. */
    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'old_payload' => 'array',
        'new_payload' => 'array',
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::updating(function (): void {
            throw new \RuntimeException('Audit logs are immutable and cannot be updated.');
        });

        static::deleting(function (): void {
            throw new \RuntimeException('Audit logs are immutable and cannot be deleted.');
        });
    }

    // --- Relationships ---

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /** Polymorphic relation to the audited entity (resolved when the class still exists). */
    public function target(): MorphTo
    {
        return $this->morphTo(null, 'target_type', 'target_id');
    }
}
