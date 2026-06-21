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
        'final_score',
        'final_grade',
    ];

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
