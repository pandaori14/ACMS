<?php

namespace Modules\Assessment\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Modules\Academic\Models\Student;
use Modules\Assessment\Models\StaseGrade;
use Modules\Assessment\Services\GradeCalculationService;
use Modules\Rotation\Models\RotationAssignment;

class GradeController extends Controller
{
    private $gradeService;

    public function __construct(GradeCalculationService $gradeService)
    {
        $this->gradeService = $gradeService;
    }

    /**
     * Get list of grades (Kaprodi sees all, Student sees their published grades)
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = StaseGrade::with(['rotationAssignment.stase', 'student.student']);

        if ($user->hasRole('Mahasiswa')) {
            $query->where('student_id', $user->id)
                ->where('status', 'published');
        } elseif ($user->hasRole(['Kaprodi', 'Admin Prodi', 'Super Admin'])) {
            // Can see all
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
        } else {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $grades = $query->orderBy('updated_at', 'desc')->paginate(15);

        return response()->json($grades);
    }

    /**
     * Trigger calculation for a specific rotation assignment
     */
    public function calculate($assignment_id, Request $request)
    {
        $user = $request->user();
        if (! $user->hasRole(['Kaprodi', 'Admin Prodi', 'Super Admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $assignment = RotationAssignment::findOrFail($assignment_id);

        try {
            $grade = $this->gradeService->calculateGrade($assignment);

            return response()->json([
                'message' => 'Grade calculated successfully',
                'data' => $grade->load(['rotationAssignment.stase', 'student.student']),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Calculation failed', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Approve a grade (Kaprodi)
     */
    public function approve($id, Request $request)
    {
        $user = $request->user();
        if (! $user->hasRole(['Kaprodi', 'Super Admin'])) {
            return response()->json(['message' => 'Only Kaprodi can approve grades'], 403);
        }

        $grade = StaseGrade::findOrFail($id);
        $grade->update(['status' => 'approved']);

        return response()->json([
            'message' => 'Grade approved successfully',
            'data' => $grade,
        ]);
    }

    /**
     * Publish a grade to the student
     */
    public function publish($id, Request $request)
    {
        $user = $request->user();
        if (! $user->hasRole(['Kaprodi', 'Admin Prodi', 'Super Admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $grade = StaseGrade::findOrFail($id);
        if ($grade->status !== 'approved') {
            return response()->json(['message' => 'Grade must be approved before publishing'], 400);
        }

        $grade->update(['status' => 'published']);

        return response()->json([
            'message' => 'Grade published successfully',
            'data' => $grade,
        ]);
    }

    /**
     * Export Grades for SIAKAD (CSV)
     */
    public function export(Request $request)
    {
        $user = $request->user();
        if (! $user->hasRole(['Kaprodi', 'Admin Prodi', 'Super Admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $grades = StaseGrade::with(['rotationAssignment.stase', 'student.student'])
            ->whereIn('status', ['approved', 'published'])
            ->get();

        $csvData = [];
        // CSV Header suitable for SIAKAD
        $csvData[] = ['NIM', 'Nama Mahasiswa', 'Kode Stase', 'Nama Stase', 'Nilai Angka', 'Nilai Huruf', 'Status'];

        foreach ($grades as $grade) {
            $csvData[] = [
                $grade->student->student->nim ?? '-',
                $grade->student->name,
                $grade->rotationAssignment->stase->code ?? '-',
                $grade->rotationAssignment->stase->name ?? '-',
                $grade->final_score,
                $grade->letter_grade,
                $grade->status,
            ];
        }

        $filename = 'Export_Nilai_SIAKAD_'.date('Ymd_His').'.csv';
        $handle = fopen('php://temp', 'r+');
        foreach ($csvData as $row) {
            fputcsv($handle, $row);
        }
        rewind($handle);
        $csvContent = stream_get_contents($handle);
        fclose($handle);

        return response($csvContent, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    public function getTranscript($student_id, Request $request)
    {
        $user = $request->user();

        // Student can only view their own transcript
        if ($user->hasRole('Mahasiswa') && $user->id !== $student_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Fetch User
        $studentUser = User::with('program')->findOrFail($student_id);

        // Fetch Academic Student Profile
        $academicProfile = Student::with('cohort')
            ->where('user_id', $student_id)
            ->first();

        // Fetch all published grades
        $grades = StaseGrade::with(['rotationAssignment.stase'])
            ->where('student_id', $student_id)
            ->where('status', 'published')
            ->get();

        // Calculate IPK Profesi (Average of Final Scores)
        // If there are different credits (SKS) per stase, we would do a weighted average.
        // For simplicity, we assume arithmetic mean of the score, or weighted by duration_weeks.
        $totalWeightedScore = 0;
        $totalWeeks = 0;
        $totalRawScore = 0;

        foreach ($grades as $grade) {
            $weeks = $grade->rotationAssignment->stase->duration_weeks ?? 1;
            $totalWeightedScore += ($grade->final_score * $weeks);
            $totalWeeks += $weeks;
            $totalRawScore += $grade->final_score;
        }

        $ipk = 0;
        $averageScore = 0;
        if ($totalWeeks > 0) {
            $averageScore = $totalRawScore / count($grades);

            // Konversi rata-rata ke IPK (skala 4.0)
            if ($averageScore >= 85) {
                $ipk = 4.0;
            } elseif ($averageScore >= 80) {
                $ipk = 3.7;
            } elseif ($averageScore >= 75) {
                $ipk = 3.3;
            } elseif ($averageScore >= 70) {
                $ipk = 3.0;
            } elseif ($averageScore >= 65) {
                $ipk = 2.7;
            } elseif ($averageScore >= 60) {
                $ipk = 2.0;
            } elseif ($averageScore >= 50) {
                $ipk = 1.0;
            } else {
                $ipk = 0.0;
            }
        }

        return response()->json([
            'student' => [
                'name' => $studentUser->name,
                'nim' => $studentUser->identity_number,
                'program' => $studentUser->program->name ?? 'Profesi Dokter',
                'cohort' => $academicProfile->cohort->name ?? '-',
            ],
            'grades' => $grades,
            'summary' => [
                'total_stase_completed' => count($grades),
                'average_score' => round($averageScore, 2),
                'ipk' => number_format($ipk, 2),
            ],
        ]);
    }
}
