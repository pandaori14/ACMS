<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnalyticsSummary;
use Illuminate\Http\Request;
use Modules\Assessment\Models\ClinicalAssessment;
use Modules\Assessment\Models\StaseGrade;
use Modules\Clinical\Models\LogbookEntry;
use Modules\Rotation\Models\RotationAssignment;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $user = $request->user();

        if ($user->hasRole('Mahasiswa')) {
            return $this->getStudentStats($user);
        } elseif ($user->hasRole(['Dodiknis', 'Dosen'])) {
            return $this->getPreceptorStats($user);
        } else {
            return $this->getAdminStats();
        }
    }

    private function getStudentStats($user)
    {
        // rotation_assignments.student_id menunjuk profil STUDENTS (bukan users)
        $studentProfileId = $user->student?->id;

        // Active Assignment
        $activeAssignment = RotationAssignment::with(['stase', 'hospital', 'preceptor', 'rotationPeriod'])
            ->where('student_id', $studentProfileId)
            ->whereHas('rotationPeriod', function ($q) {
                $q->where('start_date', '<=', now())
                    ->where('end_date', '>=', now());
            })
            ->first();

        // Logbook stats
        $logbookTotal = 0;
        $logbookVerified = 0;
        $logbookDraft = 0;
        if ($activeAssignment) {
            $logbooks = LogbookEntry::where('rotation_assignment_id', $activeAssignment->id)->get();
            $logbookTotal = $logbooks->count();
            $logbookVerified = $logbooks->whereIn('status', ['verified', 'approved'])->count();
            $logbookDraft = $logbooks->where('status', 'pending')->count();
        }

        // Pending Acknowledgements (Assessments)
        $pendingAssessments = ClinicalAssessment::where('student_id', $user->id)
            ->where('status', 'submitted')
            ->count();

        // Recent Grades
        $recentGrades = StaseGrade::with(['rotationAssignment.stase'])
            ->where('student_id', $user->id)
            ->where('status', 'published')
            ->orderBy('updated_at', 'desc')
            ->take(3)
            ->get();

        return response()->json([
            'role' => 'Mahasiswa',
            'active_assignment' => $activeAssignment,
            'logbook_stats' => [
                'total' => $logbookTotal,
                'verified' => $logbookVerified,
                'pending' => $logbookDraft,
                'progress' => $logbookTotal > 0 ? round(($logbookVerified / $logbookTotal) * 100) : 0,
            ],
            'logbook_distribution' => [
                ['name' => 'Disetujui', 'value' => $logbookVerified, 'fill' => '#10b981'],
                ['name' => 'Menunggu', 'value' => $logbookDraft, 'fill' => '#f59e0b'],
                ['name' => 'Ditolak', 'value' => $logbookTotal - $logbookVerified - $logbookDraft, 'fill' => '#ef4444'],
            ],
            'pending_assessments' => $pendingAssessments,
            'recent_grades' => $recentGrades,
        ]);
    }

    private function getPreceptorStats($user)
    {
        // Active Students under this preceptor
        $activeAssignments = RotationAssignment::with(['student.student', 'stase', 'rotationPeriod'])
            ->where('preceptor_id', $user->id)
            ->whereHas('rotationPeriod', function ($q) {
                $q->where('start_date', '<=', now())
                    ->where('end_date', '>=', now());
            })
            ->get();

        $activeStudentsCount = $activeAssignments->count();

        // Logbooks needing verification
        $assignmentIds = $activeAssignments->pluck('id')->toArray();
        $pendingLogbooks = 0;
        if (! empty($assignmentIds)) {
            $pendingLogbooks = LogbookEntry::whereIn('rotation_assignment_id', $assignmentIds)
                ->where('status', 'draft') // Assuming draft means needs review
                ->count();
        }

        return response()->json([
            'role' => 'Preceptor',
            'active_students_count' => $activeStudentsCount,
            'pending_logbooks' => $pendingLogbooks,
            'active_students' => $activeAssignments->take(5), // Just a sample for the dashboard
        ]);
    }

    private function getAdminStats()
    {
        $summary = AnalyticsSummary::where('key', 'admin_dashboard_stats')->first();

        if ($summary) {
            $data = $summary->payload;
            $data['role'] = 'Admin';

            return response()->json($data);
        }

        // Fallback if not generated yet
        return response()->json([
            'role' => 'Admin',
            'metrics' => [
                'total_students' => 0,
                'active_rotations' => 0,
                'total_hospitals' => 0,
                'total_stase' => 0,
            ],
            'stase_distribution' => [],
            'hospital_distribution' => [],
            'logbook_trend' => [],
        ]);
    }
}
