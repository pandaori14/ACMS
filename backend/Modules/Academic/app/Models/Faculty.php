<?php

namespace Modules\Academic\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Faculty extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'name',
    ];

    public function programs(): HasMany
    {
        return $this->hasMany(Program::class);
    }
}
