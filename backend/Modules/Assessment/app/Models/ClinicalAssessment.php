<?php

namespace Modules\Assessment\Models;

use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClinicalAssessment extends Model
{
    use Auditable, HasUuids, SoftDeletes;

    /** Audited as assessment.clinical.created / .updated (mini-CEX/DOPS/CBD lifecycle) */
    protected string $auditActionPrefix = 'assessment.clinical';

    protected $fillable = [
        'rotation_assignment_id',
        'assessment_template_id',
        'student_id',
        'preceptor_id',
        'assessment_date',
        'total_score',
        'feedback_notes',
        'status',
        'acknowledged_at',
    ];

    protected $casts = [
        'assessment_date' => 'date',
        'total_score' => 'decimal:2',
        'acknowledged_at' => 'datetime',
    ];

    public function template()
    {
        return $this->belongsTo(AssessmentTemplate::class, 'assessment_template_id');
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function preceptor()
    {
        return $this->belongsTo(User::class, 'preceptor_id');
    }

    public function scores()
    {
        return $this->hasMany(AssessmentScore::class);
    }

    // protected static function newFactory(): ClinicalAssessmentFactory
    // {
    //     // return ClinicalAssessmentFactory::new();
    // }
}
