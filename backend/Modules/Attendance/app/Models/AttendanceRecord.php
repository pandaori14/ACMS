<?php

namespace Modules\Attendance\Models;

use App\Models\User;
use App\Traits\Auditable;
// use Modules\Attendance\Database\Factories\AttendanceRecordFactory;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Rotation\Models\RotationAssignment;

class AttendanceRecord extends Model
{
    use Auditable, HasFactory, HasUuids, SoftDeletes;

    /** Audited as clinical.attendance.created (check-in) / .updated (check-out) */
    protected string $auditActionPrefix = 'clinical.attendance';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'student_id',
        'rotation_assignment_id',
        'date',
        'check_in_time',
        'check_out_time',
        'check_in_lat',
        'check_in_lng',
        'check_out_lat',
        'check_out_lng',
        'check_in_distance',
        'check_out_distance',
        'status',
        'is_flagged',
        'flag_reason',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
        'is_flagged' => 'boolean',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function rotationAssignment()
    {
        return $this->belongsTo(RotationAssignment::class, 'rotation_assignment_id');
    }

    // protected static function newFactory(): AttendanceRecordFactory
    // {
    //     // return AttendanceRecordFactory::new();
    // }
}
