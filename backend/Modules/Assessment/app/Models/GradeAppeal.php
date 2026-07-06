<?php

namespace Modules\Assessment\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Banding nilai stase oleh mahasiswa: submitted → accepted/rejected.
 * Satu banding per nilai; student_id = users.id (selaras stase_grades).
 */
class GradeAppeal extends Model
{
    use HasUuids;

    protected $fillable = [
        'stase_grade_id',
        'student_id',
        'reason',
        'status',
        'reviewer_id',
        'decision_note',
        'decided_at',
    ];

    protected $casts = [
        'decided_at' => 'datetime',
    ];

    public function staseGrade(): BelongsTo
    {
        return $this->belongsTo(StaseGrade::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
