<?php

namespace Modules\Rotation\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Academic\Models\Stase;

class HospitalCapacity extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'hospital_id',
        'stase_id',
        'rotation_period_id',
        'max_students',
    ];

    public function hospital(): BelongsTo
    {
        return $this->belongsTo(Hospital::class);
    }

    public function stase(): BelongsTo
    {
        return $this->belongsTo(Stase::class);
    }

    public function rotationPeriod(): BelongsTo
    {
        return $this->belongsTo(RotationPeriod::class);
    }
}
