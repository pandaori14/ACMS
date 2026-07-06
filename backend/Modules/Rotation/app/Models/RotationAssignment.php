<?php

namespace Modules\Rotation\Models;

use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Academic\Models\Stase;
use Modules\Academic\Models\Student;

class RotationAssignment extends Model
{
    use Auditable, HasUuids, SoftDeletes;

    /** Audited as rotation.assignment.created / .updated / .deleted */
    protected string $auditActionPrefix = 'rotation.assignment';

    protected $fillable = [
        'rotation_period_id',
        'student_id',
        'stase_id',
        'hospital_id',
        'preceptor_id',
        'status',
        'attempt_number',
        'final_score',
        'final_grade',
    ];

    protected static function booted(): void
    {
        // Tracking remedial: attempt_number otomatis = jumlah penempatan
        // sebelumnya (mahasiswa × stase) + 1, di SEMUA jalur pembuatan.
        static::creating(function (self $assignment) {
            if (! $assignment->attempt_number || $assignment->attempt_number === 1) {
                $assignment->attempt_number = static::where('student_id', $assignment->student_id)
                    ->where('stase_id', $assignment->stase_id)
                    ->count() + 1;
            }
        });
    }

    public function rotationPeriod(): BelongsTo
    {
        return $this->belongsTo(RotationPeriod::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function stase(): BelongsTo
    {
        return $this->belongsTo(Stase::class);
    }

    public function hospital(): BelongsTo
    {
        return $this->belongsTo(Hospital::class);
    }

    public function preceptor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'preceptor_id');
    }
}
