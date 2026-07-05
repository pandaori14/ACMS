<?php

namespace Modules\Examination\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamAnswer extends Model
{
    use HasUuids;

    protected $fillable = [
        'exam_participant_id',
        'exam_question_id',
        'exam_question_option_id',
    ];

    public function participant(): BelongsTo
    {
        return $this->belongsTo(ExamParticipant::class, 'exam_participant_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(ExamQuestion::class, 'exam_question_id');
    }

    public function option(): BelongsTo
    {
        return $this->belongsTo(ExamQuestionOption::class, 'exam_question_option_id');
    }
}
