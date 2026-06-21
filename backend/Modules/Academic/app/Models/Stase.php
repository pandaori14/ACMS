<?php

namespace Modules\Academic\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Stase extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'program_id',
        'code',
        'name',
        'duration_weeks',
        'passing_grade',
        'is_mandatory',
        'color_code',
    ];

    protected $casts = [
        'is_mandatory' => 'boolean',
        'passing_grade' => 'decimal:2',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }
}
