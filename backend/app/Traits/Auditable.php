<?php

namespace App\Traits;

use App\Services\AuditService;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Attach to any Eloquent model to automatically record CRUD events to the audit trail.
 *
 * Usage:
 *   use App\Traits\Auditable;
 *   class LogbookEntry extends Model {
 *       use Auditable;
 *       protected string $auditActionPrefix = 'clinical.logbook'; // optional, defaults to table name
 *       protected array $auditExclude = ['some_noisy_column'];    // optional
 *   }
 *
 * Domain-specific transitions (e.g. 'clinical.logbook.signed') should still be logged
 * explicitly via AuditService::log() from the Service layer for richer payloads.
 */
trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function ($model): void {
            AuditService::log(
                $model->auditAction('created'),
                $model,
                [],
                $model->auditableAttributes($model->getAttributes())
            );
        });

        static::updated(function ($model): void {
            $changes = $model->getChanges();
            $original = array_intersect_key($model->getOriginal(), $changes);

            // Skip no-op updates (e.g. touch with no dirty columns)
            if (empty($model->auditableAttributes($changes))) {
                return;
            }

            AuditService::log(
                $model->auditAction('updated'),
                $model,
                $model->auditableAttributes($original),
                $model->auditableAttributes($changes)
            );
        });

        static::deleted(function ($model): void {
            AuditService::log(
                $model->auditAction('deleted'),
                $model,
                $model->auditableAttributes($model->getAttributes()),
                []
            );
        });

        if (in_array(SoftDeletes::class, class_uses_recursive(static::class), true)) {
            static::restored(function ($model): void {
                AuditService::log(
                    $model->auditAction('restored'),
                    $model,
                    [],
                    $model->auditableAttributes($model->getAttributes())
                );
            });
        }
    }

    protected function auditAction(string $event): string
    {
        $prefix = property_exists($this, 'auditActionPrefix')
            ? $this->auditActionPrefix
            : $this->getTable();

        return $prefix.'.'.$event;
    }

    /**
     * Strip sensitive / noisy attributes before persisting them into the audit payload.
     */
    protected function auditableAttributes(array $attributes): array
    {
        $default = ['password', 'remember_token', 'updated_at', 'created_at', 'deleted_at'];
        $exclude = property_exists($this, 'auditExclude') ? $this->auditExclude : [];

        return array_diff_key($attributes, array_flip(array_merge($default, $exclude)));
    }
}
