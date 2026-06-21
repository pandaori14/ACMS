<?php

namespace Modules\Clinical\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Diagnosis extends Model
{
    use HasUuids;

    protected $table = 'diagnoses';

    protected $fillable = [
        'icd_code',
        'name',
        'category',
    ];
}
