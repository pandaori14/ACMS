<?php

namespace Modules\Examination\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Academic\Models\Stase;

/**
 * Soal di bank soal reusable — dipakai dengan MENYALIN ke exam_questions
 * (ujian tetap punya snapshot sendiri; edit bank tidak mengubah ujian lama).
 */
class QuestionBankItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'stase_id',
        'topic',
        'difficulty',
        'question_text',
        'options',
        'points',
        'created_by',
    ];

    protected $casts = [
        'options' => 'array',
    ];

    public function stase(): BelongsTo
    {
        return $this->belongsTo(Stase::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
