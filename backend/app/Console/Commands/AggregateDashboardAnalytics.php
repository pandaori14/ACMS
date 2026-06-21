<?php

namespace App\Console\Commands;

use App\Models\AnalyticsSummary;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Modules\Academic\Models\Stase;
use Modules\Clinical\Models\LogbookEntry;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationAssignment;

class AggregateDashboardAnalytics extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:aggregate-analytics';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Aggregates dashboard analytics and stores it in materialized view table.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting dashboard analytics aggregation...');

        $totalStudents = User::role('Mahasiswa')->count();
        $totalHospitals = Hospital::count();
        $totalStase = Stase::count();

        $activeAssignmentsCount = RotationAssignment::whereHas('rotationPeriod', function ($q) {
            $q->where('start_date', '<=', now())
                ->where('end_date', '>=', now());
        })->count();

        // Get distribution of students across stase
        $staseDistribution = RotationAssignment::select('stase_id', DB::raw('count(*) as total'))
            ->whereHas('rotationPeriod', function ($q) {
                $q->where('start_date', '<=', now())
                    ->where('end_date', '>=', now());
            })
            ->groupBy('stase_id')
            ->with('stase:id,name,code')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->stase->name ?? 'Unknown',
                    'value' => $item->total,
                ];
            });

        // Get distribution of students across hospitals
        $hospitalDistribution = RotationAssignment::select('hospital_id', DB::raw('count(DISTINCT student_id) as total'))
            ->whereHas('rotationPeriod', function ($q) {
                $q->where('start_date', '<=', now())
                    ->where('end_date', '>=', now());
            })
            ->groupBy('hospital_id')
            ->with('hospital:id,name')
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->hospital->name ?? 'Unknown',
                    'total' => $item->total,
                ];
            });

        // Get logbook submissions over the last 7 days
        $last7Days = collect();
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $count = LogbookEntry::whereDate('created_at', $date)->count();
            $last7Days->push([
                'date' => now()->subDays($i)->format('d M'),
                'total' => $count,
            ]);
        }

        $payload = [
            'metrics' => [
                'total_students' => $totalStudents,
                'active_rotations' => $activeAssignmentsCount,
                'total_hospitals' => $totalHospitals,
                'total_stase' => $totalStase,
            ],
            'stase_distribution' => $staseDistribution,
            'hospital_distribution' => $hospitalDistribution,
            'logbook_trend' => $last7Days,
        ];

        AnalyticsSummary::updateOrCreate(
            ['key' => 'admin_dashboard_stats'],
            ['payload' => $payload]
        );

        $this->info('Dashboard analytics aggregation completed.');
    }
}
