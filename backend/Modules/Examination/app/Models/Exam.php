<?php

namespace Modules\Examination\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Academic\Models\Stase;

class Exam extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'name',
        'type',
        'stase_id',
        'date',
        'start_time',
        'duration_minutes',
        'passing_score',
        'status',
        'description',
    ];

    public function stase()
    {
        return $this->belongsTo(Stase::class, 'stase_id');
    }

    public function stations()
    {
        return $this->hasMany(ExamStation::class, 'exam_id');
    }

    public function participants()
    {
        return $this->hasMany(ExamParticipant::class, 'exam_id');
    }

    public function assessors()
    {
        return $this->hasMany(ExamAssessor::class, 'exam_id');
    }

    public function questions()
    {
        return $this->hasMany(ExamQuestion::class, 'exam_id')->orderBy('order');
    }

    /**
     * Ambang lulus efektif: kolom ujian → passing_grade stase → 70.
     */
    public function effectivePassingScore(): float
    {
        return (float) ($this->passing_score ?? $this->stase?->passing_grade ?? 70);
    }
}
