<?php

namespace Modules\Examination\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ExamParticipant extends Model
{
    use HasUuids;

    protected $fillable = [
        'exam_id',
        'student_id',
        'final_score',
        'status',
    ];

    public function exam()
    {
        return $this->belongsTo(Exam::class, 'exam_id');
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function scores()
    {
        return $this->hasMany(ExamScore::class, 'exam_participant_id');
    }
}
