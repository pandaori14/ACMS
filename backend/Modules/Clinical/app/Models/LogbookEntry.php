<?php

namespace Modules\Clinical\Models;

use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Academic\Models\Competency;
use Modules\Academic\Models\Student;
use Modules\Rotation\Models\RotationAssignment;

class LogbookEntry extends Model
{
    use Auditable, HasUuids, SoftDeletes;

    protected $table = 'logbook_entries';

    /** Audit events recorded as clinical.logbook.created / .updated / .deleted / .restored */
    protected string $auditActionPrefix = 'clinical.logbook';

    protected $fillable = [
        'rotation_assignment_id',
        'student_id',
        'preceptor_id',
        'activity_date',
        'activity_type',
        'description',
        'patient_initials',
        'medical_record_no',
        'diagnosis_id',
        'procedure_id',
        'competency_id',
        'competency_level',
        'preceptor_feedback',
        'status',
        'is_late',
        'late_days',
        'attachment_path',
        'submitted_at',
        'verified_at',
    ];

    protected $casts = [
        'activity_date' => 'date',
        'submitted_at' => 'datetime',
        'verified_at' => 'datetime',
        'is_late' => 'boolean',
    ];

    // --- Relationships ---

    public function rotationAssignment(): BelongsTo
    {
        return $this->belongsTo(RotationAssignment::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function preceptor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'preceptor_id');
    }

    public function diagnosis(): BelongsTo
    {
        return $this->belongsTo(Diagnosis::class);
    }

    public function procedure(): BelongsTo
    {
        return $this->belongsTo(Procedure::class);
    }

    public function competency(): BelongsTo
    {
        return $this->belongsTo(Competency::class);
    }
}
