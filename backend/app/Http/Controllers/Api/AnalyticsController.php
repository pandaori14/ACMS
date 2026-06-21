<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Academic\Models\Stase;
use Modules\Assessment\Models\StaseGrade;
use Modules\Clinical\Models\LogbookEntry;

class AnalyticsController extends Controller
{
    /**
     * Retrieve advanced analytics for the Admin/Kaprodi dashboard.
     */
    public function index(Request $request)
    {
        // Enforce role-based access
        $user = $request->user();
        if (! $user->hasRole(['Super Admin', 'Admin Prodi', 'Kaprodi'])) {
            return response()->json(['message' => 'Unauthorized access to analytics.'], 403);
        }

        return response()->json([
            'grade_distribution' => $this->getGradeDistribution(),
            'stase_performance' => $this->getStasePerformance(),
            'logbook_completion' => $this->getLogbookCompletionStats(),
        ]);
    }

    /**
     * Get the distribution of letter grades across all published grades.
     */
    private function getGradeDistribution()
    {
        // Aggregate count of each letter grade (A, AB, B, etc.)
        $distribution = StaseGrade::select('letter_grade as grade', DB::raw('count(*) as total'))
            ->where('status', 'published')
            ->whereNotNull('letter_grade')
            ->groupBy('letter_grade')
            ->orderBy('letter_grade', 'asc') // A, AB, B, BC, C, etc.
            ->get();

        // Ensure a fixed structure even if some grades have 0 count
        $template = [
            'A' => 0, 'AB' => 0, 'B' => 0, 'BC' => 0, 'C' => 0, 'D' => 0, 'E' => 0,
        ];

        foreach ($distribution as $item) {
            $gradeStr = strtoupper($item->grade);
            if (isset($template[$gradeStr])) {
                $template[$gradeStr] = $item->total;
            }
        }

        // Format for Recharts
        $formatted = [];
        foreach ($template as $grade => $count) {
            $formatted[] = [
                'grade' => $grade,
                'count' => $count,
            ];
        }

        return $formatted;
    }

    /**
     * Get average numerical score per stase.
     */
    private function getStasePerformance()
    {
        $grades = StaseGrade::with('rotationAssignment.stase')
            ->where('status', 'published')
            ->get();

        $performance = [];
        foreach ($grades as $grade) {
            $staseName = $grade->rotationAssignment->stase->name ?? 'Unknown';
            if (! isset($performance[$staseName])) {
                $performance[$staseName] = ['total_score' => 0, 'count' => 0];
            }
            $performance[$staseName]['total_score'] += (float) $grade->final_score;
            $performance[$staseName]['count']++;
        }

        $result = [];
        foreach ($performance as $name => $data) {
            $result[] = [
                'stase_name' => $name,
                'average_score' => round($data['total_score'] / $data['count'], 1),
            ];
        }

        usort($result, function ($a, $b) {
            return strcmp($a['stase_name'], $b['stase_name']);
        });

        return $result;
    }

    /**
     * Get an estimated logbook completion percentage by checking how many
     * assignments have completed their required number of logs (simplified proxy).
     */
    private function getLogbookCompletionStats()
    {
        // For simplicity, we just calculate the ratio of verified logbooks to total logbooks globally,
        // grouped by stase if possible, but let's provide a global pie chart metric.

        $totalLogbooks = LogbookEntry::count();
        $verifiedLogbooks = LogbookEntry::where('status', 'verified')->count();
        $rejectedLogbooks = LogbookEntry::where('status', 'rejected')->count();
        $draftLogbooks = $totalLogbooks - ($verifiedLogbooks + $rejectedLogbooks);

        // Avoid division by zero
        if ($totalLogbooks === 0) {
            return [
                ['name' => 'Verified', 'value' => 0, 'fill' => '#10b981'],
                ['name' => 'Rejected', 'value' => 0, 'fill' => '#ef4444'],
                ['name' => 'Draft/Pending', 'value' => 0, 'fill' => '#f59e0b'],
            ];
        }

        return [
            ['name' => 'Verified', 'value' => $verifiedLogbooks, 'fill' => '#10b981'],
            ['name' => 'Rejected', 'value' => $rejectedLogbooks, 'fill' => '#ef4444'],
            ['name' => 'Draft/Pending', 'value' => $draftLogbooks, 'fill' => '#f59e0b'],
        ];
    }
}
