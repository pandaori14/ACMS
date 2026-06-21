<?php

namespace Modules\Assessment\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AssessmentTemplate extends Model
{
    use HasUuids, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'type',
        'name',
        'rubric_schema',
        'is_active',
    ];

    protected $casts = [
        'rubric_schema' => 'array',
        'is_active' => 'boolean',
    ];

    // protected static function newFactory(): AssessmentTemplateFactory
    // {
    //     // return AssessmentTemplateFactory::new();
    // }
}
