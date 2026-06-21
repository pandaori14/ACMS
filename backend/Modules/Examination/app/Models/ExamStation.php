<?php

namespace Modules\Examination\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Modules\Assessment\Models\AssessmentTemplate;

class ExamStation extends Model
{
    use HasUuids;

    protected $fillable = [
        'exam_id',
        'name',
        'description',
        'order',
        'assessment_template_id',
    ];

    public function exam()
    {
        return $this->belongsTo(Exam::class, 'exam_id');
    }

    public function assessors()
    {
        return $this->hasMany(ExamAssessor::class, 'exam_station_id');
    }

    public function assessmentTemplate()
    {
        return $this->belongsTo(AssessmentTemplate::class, 'assessment_template_id');
    }
}
