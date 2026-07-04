<?php

namespace Modules\Evaluation\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
// use Modules\Evaluation\Database\Factories\EvaluationQuestionFactory;

use Illuminate\Database\Eloquent\Model;

class EvaluationQuestion extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'target_type',
        'question_text',
        'is_active',
    ];

    public function submissions()
    {
        return $this->hasMany(EvaluationSubmission::class, 'evaluation_question_id');
    }

    // protected static function newFactory(): EvaluationQuestionFactory
    // {
    //     // return EvaluationQuestionFactory::new();
    // }
}
