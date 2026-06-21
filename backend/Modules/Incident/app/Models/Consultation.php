<?php

namespace Modules\Incident\Models;

use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Consultation extends Model
{
    use Auditable, HasUuids, SoftDeletes;

    /** Prefix aksi audit (mis. incident.consultation.updated saat dibalas). */
    protected string $auditActionPrefix = 'incident.consultation';

    protected $fillable = [
        'requester_id',
        'category',
        'topic',
        'message',
        'is_anonymous',
        'status',
        'response',
        'responded_by',
        'responded_at',
    ];

    protected $casts = [
        'is_anonymous' => 'boolean',
        'responded_at' => 'datetime',
    ];

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function responder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responded_by');
    }
}
