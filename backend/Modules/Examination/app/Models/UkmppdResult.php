<?php

namespace Modules\Examination\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Hasil UKMPPD per percobaan. student_id = users.id (domain ujian). */
class UkmppdResult extends Model
{
    use HasUuids;

    protected $fillable = [
        'student_id',
        'attempt_number',
        'exam_date',
        'cbt_score',
        'osce_score',
        'status',
        'notes',
    ];

    protected $casts = [
        'exam_date' => 'date',
        'cbt_score' => 'decimal:2',
        'osce_score' => 'decimal:2',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
