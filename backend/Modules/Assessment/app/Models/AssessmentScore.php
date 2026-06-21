<?php

namespace Modules\Assessment\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AssessmentScore extends Model
{
    use HasUuids;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'clinical_assessment_id',
        'rubric_key',
        'score',
        'notes',
    ];

    protected $casts = [
        'score' => 'decimal:2',
    ];

    public function assessment()
    {
        return $this->belongsTo(ClinicalAssessment::class, 'clinical_assessment_id');
    }

    // protected static function newFactory(): AssessmentScoreFactory
    // {
    //     // return AssessmentScoreFactory::new();
    // }
}
