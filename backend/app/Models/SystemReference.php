<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SystemReference extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'category',
        'name',
        'value',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
