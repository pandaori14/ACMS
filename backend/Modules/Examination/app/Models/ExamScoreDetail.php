<?php

namespace Modules\Examination\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ExamScoreDetail extends Model
{
    use HasUuids;

    protected $fillable = [
        'exam_score_id',
        'rubric_key',
        'score',
    ];

    public function examScore()
    {
        return $this->belongsTo(ExamScore::class, 'exam_score_id');
    }
}
