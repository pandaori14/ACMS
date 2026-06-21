<?php

namespace Modules\Rotation\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Academic\Models\Program;

class RotationPeriod extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'program_id',
        'name',
        'start_date',
        'end_date',
        'status',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }
}
