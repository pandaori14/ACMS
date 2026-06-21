<?php

namespace Modules\Assessment\Models;

use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Rotation\Models\RotationAssignment;

class StaseGrade extends Model
{
    use Auditable, HasUuids, SoftDeletes;

    /** Audited as grade.stase.created / .updated (captures status draft->approved->published) */
    protected string $auditActionPrefix = 'grade.stase';

    protected $fillable = [
        'rotation_assignment_id',
        'student_id',
        'logbook_score',
        'minicex_score',
        'dops_score',
        'cbd_score',
        'final_score',
        'letter_grade',
        'status',
    ];

    protected $casts = [
        'logbook_score' => 'decimal:2',
        'minicex_score' => 'decimal:2',
        'dops_score' => 'decimal:2',
        'cbd_score' => 'decimal:2',
        'final_score' => 'decimal:2',
    ];

    public function rotationAssignment()
    {
        return $this->belongsTo(RotationAssignment::class, 'rotation_assignment_id');
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    // protected static function newFactory(): StaseGradeFactory
    // {
    //     // return StaseGradeFactory::new();
    // }
}
