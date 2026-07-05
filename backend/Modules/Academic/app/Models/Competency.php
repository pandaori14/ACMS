<?php

namespace Modules\Academic\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Competency extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'name',
        'type',
        'category',
        'level',
        'min_cases',
        'stase_id',
        'description',
    ];

    public function stase()
    {
        return $this->belongsTo(Stase::class);
    }
}
