<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Modules\Academic\Models\Student;
use Modules\Assessment\Models\StaseGrade;
use Modules\Attendance\Models\AttendanceRecord;
use Modules\Clinical\Models\LogbookEntry;
use Modules\Rotation\Models\RotationAssignment;

/**
 * Early warning mahasiswa berisiko — memindai SEMUA mahasiswa aktif terhadap
 * sinyal masalah dari data nyata:
 *  - nilai stase published di bawah passing grade,
 *  - logbook menggantung (draft/submitted) menumpuk,
 *  - logbook sering telat submit,
 *  - presensi ber-flag belum diselesaikan,
 *  - remedial (mengulang stase) ≥ 2 kali.
 * Level: high (≥3 sinyal), medium (2), low (1).
 */
class AtRiskDetectionService
{
    private const PENDING_LOGBOOK_THRESHOLD = 5;

    private const LATE_LOGBOOK_THRESHOLD = 3;

    /**
     * @return array{scanned:int, students:array<int, array<string, mixed>>}
     */
    public function scan(): array
    {
        $profiles = Student::with('user:id,name,identity_number')
            ->where('status', 'active')
            ->get();
        $profileIds = $profiles->pluck('id');
        $userIds = $profiles->pluck('user_id');

        // Agregasi massal (hindari N+1 per mahasiswa)
        $failingGrades = StaseGrade::whereIn('stase_grades.student_id', $userIds)
            ->where('stase_grades.status', 'published')
            ->join('rotation_assignments', 'rotation_assignments.id', '=', 'stase_grades.rotation_assignment_id')
            ->join('stases', 'stases.id', '=', 'rotation_assignments.stase_id')
            ->whereColumn('stase_grades.final_score', '<', 'stases.passing_grade')
            ->select('stase_grades.student_id', DB::raw('count(*) as total'))
            ->groupBy('stase_grades.student_id')
            ->pluck('total', 'student_id');

        $pendingLogbooks = LogbookEntry::whereIn('student_id', $profileIds)
            ->whereIn('status', ['draft', 'submitted'])
            ->select('student_id', DB::raw('count(*) as total'))
            ->groupBy('student_id')
            ->pluck('total', 'student_id');

        $lateLogbooks = LogbookEntry::whereIn('student_id', $profileIds)
            ->where('is_late', true)
            ->select('student_id', DB::raw('count(*) as total'))
            ->groupBy('student_id')
            ->pluck('total', 'student_id');

        $flaggedAttendance = AttendanceRecord::whereIn('student_id', $profileIds)
            ->where('is_flagged', true)
            ->select('student_id', DB::raw('count(*) as total'))
            ->groupBy('student_id')
            ->pluck('total', 'student_id');

        $remedials = RotationAssignment::whereIn('student_id', $profileIds)
            ->where('attempt_number', '>=', 2)
            ->select('student_id', DB::raw('count(*) as total'))
            ->groupBy('student_id')
            ->pluck('total', 'student_id');

        $students = $profiles->map(function (Student $profile) use ($failingGrades, $pendingLogbooks, $lateLogbooks, $flaggedAttendance, $remedials) {
            $signals = [];

            if ($n = (int) ($failingGrades[$profile->user_id] ?? 0)) {
                $signals[] = "{$n} nilai stase di bawah ambang lulus";
            }
            if (($n = (int) ($pendingLogbooks[$profile->id] ?? 0)) > self::PENDING_LOGBOOK_THRESHOLD) {
                $signals[] = "{$n} logbook menggantung";
            }
            if (($n = (int) ($lateLogbooks[$profile->id] ?? 0)) > self::LATE_LOGBOOK_THRESHOLD) {
                $signals[] = "{$n} logbook telat submit";
            }
            if ($n = (int) ($flaggedAttendance[$profile->id] ?? 0)) {
                $signals[] = "{$n} presensi ber-flag";
            }
            if ($n = (int) ($remedials[$profile->id] ?? 0)) {
                $signals[] = "{$n} stase remedial";
            }

            if (empty($signals)) {
                return null;
            }

            return [
                'student_id' => $profile->id,
                'user_id' => $profile->user_id,
                'name' => $profile->user?->name,
                'identity_number' => $profile->user?->identity_number,
                'level' => count($signals) >= 3 ? 'high' : (count($signals) === 2 ? 'medium' : 'low'),
                'signals' => $signals,
            ];
        })->filter()
            ->sortByDesc(fn ($row) => count($row['signals']))
            ->values()
            ->all();

        return [
            'scanned' => $profiles->count(),
            'students' => $students,
        ];
    }
}
