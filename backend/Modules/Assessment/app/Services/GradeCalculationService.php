<?php

namespace Modules\Assessment\Services;

use App\Models\Setting;
use Modules\Assessment\Models\ClinicalAssessment;
use Modules\Assessment\Models\StaseGrade;
use Modules\Clinical\Models\LogbookEntry;
use Modules\Rotation\Models\RotationAssignment;

class GradeCalculationService
{
    /**
     * Calculate the final grade for a specific rotation assignment.
     */
    public function calculateGrade(RotationAssignment $assignment): StaseGrade
    {
        // 1. Calculate Logbook Score (based on verification and feedback)
        $logbooks = LogbookEntry::where('rotation_assignment_id', $assignment->id)->get();
        $logbookScore = $this->calculateLogbookScore($logbooks);

        // 2. Get Assessments
        $assessments = ClinicalAssessment::with('template')
            ->where('rotation_assignment_id', $assignment->id)
            ->where('status', 'acknowledged') // Only calculate based on acknowledged assessments
            ->get();

        $miniCexAssessments = $assessments->filter(fn ($a) => $a->template->type === 'mini-cex');
        $dopsAssessments = $assessments->filter(fn ($a) => $a->template->type === 'dops');
        $cbdAssessments = $assessments->filter(fn ($a) => $a->template->type === 'cbd');

        // Convert raw scores to percentages based on max_total_score
        $minicexScore = $this->calculateAssessmentAverage($miniCexAssessments);
        $dopsScore = $this->calculateAssessmentAverage($dopsAssessments);
        $cbdScore = $this->calculateAssessmentAverage($cbdAssessments);

        // 3. Calculate Final Weighted Score.
        // Weights are configurable via Settings (group 'assessment'); treated proportionally
        // so admins can enter any positive numbers (normalized by their sum).
        $wLog = (float) Setting::getValue('grade_weight_logbook', 10);
        $wCex = (float) Setting::getValue('grade_weight_minicex', 30);
        $wDops = (float) Setting::getValue('grade_weight_dops', 30);
        $wCbd = (float) Setting::getValue('grade_weight_cbd', 30);
        $wSum = $wLog + $wCex + $wDops + $wCbd;
        if ($wSum <= 0) {
            $wSum = 100;
        }

        $finalScore = (($logbookScore * $wLog) + ($minicexScore * $wCex) + ($dopsScore * $wDops) + ($cbdScore * $wCbd)) / $wSum;
        $letterGrade = $this->getLetterGrade($finalScore);

        // 4. Save or Update Grade
        // PENTING: stase_grades.student_id ber-FK ke USERS, sedangkan
        // rotation_assignments.student_id menunjuk profil STUDENTS —
        // wajib dipetakan ke user_id (dulu salah tulis → FK gagal /
        // mahasiswa tak pernah melihat nilainya).
        $assignment->loadMissing('student');

        $grade = StaseGrade::updateOrCreate(
            ['rotation_assignment_id' => $assignment->id],
            [
                'student_id' => $assignment->student->user_id,
                'logbook_score' => $logbookScore,
                'minicex_score' => $minicexScore,
                'dops_score' => $dopsScore,
                'cbd_score' => $cbdScore,
                'final_score' => $finalScore,
                'letter_grade' => $letterGrade,
                'status' => 'draft', // Recalculating always resets status to draft
            ]
        );

        return $grade;
    }

    private function calculateLogbookScore($logbooks): float
    {
        if ($logbooks->isEmpty()) {
            return 0;
        }

        $verifiedCount = $logbooks->where('status', 'verified')->count();
        $totalCount = $logbooks->count();

        // Simplified logic: percentage of verified logbooks.
        // In reality, this could depend on a required quota per stase.
        return ($verifiedCount / $totalCount) * 100;
    }

    private function calculateAssessmentAverage($assessments): float
    {
        if ($assessments->isEmpty()) {
            return 0;
        }

        $totalPercentage = 0;
        foreach ($assessments as $assessment) {
            $maxScore = $assessment->template->rubric_schema['max_total_score'] ?? 100;
            // Ensure maxScore is not 0
            $maxScore = $maxScore > 0 ? $maxScore : 100;
            $percentage = ($assessment->total_score / $maxScore) * 100;
            $totalPercentage += $percentage;
        }

        return $totalPercentage / $assessments->count();
    }

    private function getLetterGrade(float $score): string
    {
        $threshold = (float) Setting::getValue('passing_grade_threshold', 70);
        if ($score < $threshold) {
            return 'E'; // Failed based on dynamic system threshold
        }

        // Letter-grade bands are configurable via Settings (group 'assessment').
        if ($score >= (float) Setting::getValue('grade_band_a', 85)) {
            return 'A';
        }
        if ($score >= (float) Setting::getValue('grade_band_ab', 80)) {
            return 'AB';
        }
        if ($score >= (float) Setting::getValue('grade_band_b', 75)) {
            return 'B';
        }
        if ($score >= (float) Setting::getValue('grade_band_bc', 70)) {
            return 'BC';
        }
        if ($score >= (float) Setting::getValue('grade_band_c', 65)) {
            return 'C';
        }
        if ($score >= (float) Setting::getValue('grade_band_d', 50)) {
            return 'D';
        }

        return 'E';
    }
}
