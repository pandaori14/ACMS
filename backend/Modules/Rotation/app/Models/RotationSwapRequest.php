<?php

namespace Modules\Rotation\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Permintaan tukar slot rotasi: submitted → approved/rejected/cancelled. */
class RotationSwapRequest extends Model
{
    use HasUuids;

    protected $fillable = [
        'requester_assignment_id',
        'target_assignment_id',
        'reason',
        'status',
        'decided_by',
        'decision_note',
        'decided_at',
    ];

    protected $casts = [
        'decided_at' => 'datetime',
    ];

    public function requesterAssignment(): BelongsTo
    {
        return $this->belongsTo(RotationAssignment::class, 'requester_assignment_id');
    }

    public function targetAssignment(): BelongsTo
    {
        return $this->belongsTo(RotationAssignment::class, 'target_assignment_id');
    }

    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }
}
