<?php

namespace Modules\Clinical\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Procedure extends Model
{
    use HasUuids;

    protected $fillable = [
        'code',
        'name',
        'category',
        'description',
    ];
}
