<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Modules\Academic\Models\Student;
use Modules\Clinical\Models\LogbookEntry;
use Modules\Examination\Models\ExamParticipant;
use Modules\Incident\Models\IncidentReport;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\HospitalCapacity;
use Modules\Rotation\Models\RotationAssignment;

/**
 * Dashboard Eksekutif (EXECUTIVE_ANALYTICS_DESIGN.md) — 4 pilar KPI:
 * beban RS, tren insiden, tingkat kelulusan ujian, kepatuhan logbook.
 * Agregasi di PHP/Collection (portabel MySQL & PostgreSQL) + cache 10 menit.
 */
class ExecutiveAnalyticsController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'rotation_period_id' => 'nullable|uuid|exists:rotation_periods,id',
            'hospital_id' => 'nullable|uuid|exists:hospitals,id',
        ]);

        $periodId = $request->input('rotation_period_id');
        $hospitalId = $request->input('hospital_id');

        $cacheKey = 'executive_analytics:'.($periodId ?? 'all').':'.($hospitalId ?? 'all');

        $data = Cache::remember($cacheKey, 600, function () use ($periodId, $hospitalId) {
            return [
                'scorecards' => $this->scorecards(),
                'hospital_load' => $this->hospitalLoad($periodId, $hospitalId),
                'incident_trends' => $this->incidentTrends(),
                'exam_pass_rate' => $this->examPassRate(),
                'logbook_compliance' => $this->logbookCompliance(),
                'generated_at' => now()->toIso8601String(),
            ];
        });

        return response()->json(['data' => $data]);
    }

    private function scorecards(): array
    {
        $activeAssignments = RotationAssignment::whereHas('rotationPeriod', function ($q) {
            $q->where('start_date', '<=', now())->where('end_date', '>=', now());
        })->count();

        $logbookTotal = LogbookEntry::count();
        $logbookVerified = LogbookEntry::where('status', 'verified')->count();

        return [
            'active_students' => Student::where('status', 'active')->count(),
            'active_assignments' => $activeAssignments,
            'incidents_30d' => IncidentReport::where('created_at', '>=', now()->subDays(30))->count(),
            'logbook_verified_percent' => $logbookTotal > 0
                ? round($logbookVerified / $logbookTotal * 100)
                : 0,
        ];
    }

    /**
     * Pilar 1 — Beban RS: mahasiswa aktif per RS vs total kuota → utilisasi.
     */
    private function hospitalLoad(?string $periodId, ?string $hospitalId): array
    {
        $assignments = RotationAssignment::query()
            ->when($periodId, fn ($q) => $q->where('rotation_period_id', $periodId))
            ->when(! $periodId, fn ($q) => $q->whereHas('rotationPeriod', function ($qq) {
                $qq->where('start_date', '<=', now())->where('end_date', '>=', now());
            }))
            ->when($hospitalId, fn ($q) => $q->where('hospital_id', $hospitalId))
            ->get(['hospital_id'])
            ->groupBy('hospital_id')
            ->map->count();

        $capacities = HospitalCapacity::query()
            ->when(
                $periodId,
                fn ($q) => $q->where(fn ($qq) => $qq->where('rotation_period_id', $periodId)->orWhereNull('rotation_period_id'))
            )
            ->get()
            ->groupBy('hospital_id')
            ->map(fn ($rows) => (int) $rows->sum('max_students'));

        return Hospital::orderBy('name')
            ->when($hospitalId, fn ($q) => $q->where('id', $hospitalId))
            ->get(['id', 'name'])
            ->map(function ($hospital) use ($assignments, $capacities) {
                $load = (int) ($assignments[$hospital->id] ?? 0);
                $capacity = $capacities[$hospital->id] ?? null;

                return [
                    'hospital' => $hospital->name,
                    'students' => $load,
                    'capacity' => $capacity,
                    'utilization_percent' => $capacity ? round($load / max(1, $capacity) * 100) : null,
                ];
            })->values()->all();
    }

    /**
     * Pilar 2 — Tren insiden 12 bulan terakhir per jenis (group di PHP; portabel).
     */
    private function incidentTrends(): array
    {
        $since = now()->subMonths(11)->startOfMonth();

        $reports = IncidentReport::where('created_at', '>=', $since)
            ->get(['created_at', 'incident_type']);

        // Kerangka 12 bulan agar chart tidak bolong
        $months = collect(range(0, 11))->map(
            fn ($i) => $since->copy()->addMonths($i)->format('Y-m')
        );

        $grouped = $reports->groupBy(fn ($r) => $r->created_at->format('Y-m'));

        return $months->map(function ($month) use ($grouped) {
            $rows = $grouped->get($month, collect());

            return [
                'month' => $month,
                'total' => $rows->count(),
                'by_type' => $rows->groupBy('incident_type')->map->count(),
            ];
        })->values()->all();
    }

    /**
     * Pilar 3 — Tingkat kelulusan ujian per tipe (dari final_score peserta).
     */
    private function examPassRate(): array
    {
        $participants = ExamParticipant::with('exam.stase')
            ->whereNotNull('final_score')
            ->get();

        return $participants
            ->filter(fn ($p) => $p->exam)
            ->groupBy(fn ($p) => $p->exam->type)
            ->map(function ($group, $type) {
                $passed = $group->filter(
                    fn ($p) => (float) $p->final_score >= $p->exam->effectivePassingScore()
                )->count();

                return [
                    'type' => $type,
                    'total' => $group->count(),
                    'passed' => $passed,
                    'failed' => $group->count() - $passed,
                    'pass_rate' => round($passed / max(1, $group->count()) * 100),
                ];
            })->values()->all();
    }

    /**
     * Pilar 4 — Kepatuhan logbook per stase (% entri verified).
     */
    private function logbookCompliance(): array
    {
        $entries = LogbookEntry::with('rotationAssignment.stase:id,name')
            ->get(['id', 'rotation_assignment_id', 'status']);

        return $entries
            ->groupBy(fn ($e) => $e->rotationAssignment?->stase?->name ?? 'Tanpa Stase')
            ->map(function ($group, $staseName) {
                $verified = $group->where('status', 'verified')->count();

                return [
                    'stase' => $staseName,
                    'total' => $group->count(),
                    'verified' => $verified,
                    'compliance_percent' => round($verified / max(1, $group->count()) * 100),
                ];
            })
            ->sortBy('stase')
            ->values()
            ->all();
    }
}
