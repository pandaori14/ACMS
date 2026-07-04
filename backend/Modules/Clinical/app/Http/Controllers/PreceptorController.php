<?php

namespace Modules\Clinical\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Clinical\Models\LogbookEntry;
use Modules\Rotation\Models\RotationAssignment;

class PreceptorController extends Controller
{
    /**
     * Get statistics for the Preceptor dashboard.
     */
    public function dashboardStats(Request $request): JsonResponse
    {
        $user = $request->user();

        // Count students assigned to this preceptor
        // We find all rotation_assignments where this user is the preceptor
        $assignedStudentsCount = DB::table('rotation_assignments')
            ->where('preceptor_id', $user->id)
            ->whereNull('deleted_at')
            ->distinct('student_id')
            ->count('student_id');

        // Count pending logbooks for this preceptor
        $pendingLogbooksCount = LogbookEntry::where('preceptor_id', $user->id)
            ->where('status', 'submitted')
            ->count();

        // If preceptor_id in LogbookEntry is sometimes null before assignment,
        // they might need to see logbooks of their assigned students.
        if ($pendingLogbooksCount === 0) {
            $studentIds = DB::table('rotation_assignments')
                ->where('preceptor_id', $user->id)
                ->whereNull('deleted_at')
                ->pluck('student_id');

            $pendingLogbooksCount = LogbookEntry::whereIn('student_id', $studentIds)
                ->where('status', 'submitted')
                ->count();
        }

        // Count assessments conducted by this preceptor
        // (kolomnya preceptor_id — 'assessor_id' tidak ada → dulu SQL error)
        $assessmentsCount = DB::table('clinical_assessments')
            ->where('preceptor_id', $user->id)
            ->whereNull('deleted_at')
            ->count();

        // Roster mahasiswa bimbingan pada periode berjalan
        $activeStudents = RotationAssignment::with([
            'student.user:id,name,identity_number',
            'stase:id,name',
            'hospital:id,name',
        ])
            ->where('preceptor_id', $user->id)
            ->whereHas('rotationPeriod', function ($q) {
                $q->where('start_date', '<=', now())->where('end_date', '>=', now());
            })
            ->get();

        return response()->json([
            'data' => [
                'assigned_students' => $assignedStudentsCount,
                'pending_logbooks' => $pendingLogbooksCount,
                'total_assessments' => $assessmentsCount,
                'active_students' => $activeStudents,
            ],
        ]);
    }
}
