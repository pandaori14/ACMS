<?php

namespace Modules\Evaluation\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
// use Modules\Evaluation\Database\Factories\EvaluationSubmissionFactory;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Modules\Rotation\Models\RotationAssignment;

class EvaluationSubmission extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'student_id',
        'rotation_assignment_id',
        'target_id',
        'target_type',
        'evaluation_question_id',
        'rating',
        'comment',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function rotationAssignment()
    {
        return $this->belongsTo(RotationAssignment::class, 'rotation_assignment_id');
    }

    public function question()
    {
        return $this->belongsTo(EvaluationQuestion::class, 'evaluation_question_id');
    }

    public function target()
    {
        return $this->morphTo();
    }

    // protected static function newFactory(): EvaluationSubmissionFactory
    // {
    //     // return EvaluationSubmissionFactory::new();
    // }
}
