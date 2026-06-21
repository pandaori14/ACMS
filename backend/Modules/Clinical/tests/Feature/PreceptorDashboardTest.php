<?php

namespace Modules\Clinical\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Academic\Models\Cohort;
use Modules\Academic\Models\Faculty;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Stase;
use Modules\Academic\Models\Student;
use Modules\Clinical\Models\LogbookEntry;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationAssignment;
use Modules\Rotation\Models\RotationPeriod;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PreceptorDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Ensure roles exist
        Role::firstOrCreate(['name' => 'Dodiknis']);
        Role::firstOrCreate(['name' => 'Mahasiswa']);
    }

    public function test_preceptor_can_view_dashboard_stats()
    {
        // Create preceptor
        $preceptor = User::factory()->create();
        $preceptor->assignRole('Dodiknis');

        $faculty = Faculty::create([
            'name' => 'Fakultas Kedokteran',
            'code' => 'FK',
            'status' => 'active',
        ]);

        $program = Program::create([
            'faculty_id' => $faculty->id,
            'name' => 'Program Test',
            'code' => 'PT-01',
            'degree_level' => 'Profesi',
            'status' => 'active',
        ]);

        $cohort = Cohort::create([
            'program_id' => $program->id,
            'name' => 'Cohort Test',
            'year' => 2026,
            'status' => 'active',
        ]);

        // Create student
        $studentUser = User::factory()->create();
        $studentUser->assignRole('Mahasiswa');
        $student = Student::create([
            'user_id' => $studentUser->id,
            'program_id' => $program->id,
            'cohort_id' => $cohort->id,
            'enrollment_date' => now(),
            'nim' => 'NIM-'.uniqid(),
            'status' => 'active',
        ]);

        $hospital = Hospital::create([
            'name' => 'RS Test',
            'code' => 'RST',
            'type' => 'RS_Pendidikan_Utama',
            'status' => 'active',
        ]);

        $stase = Stase::create([
            'program_id' => $program->id,
            'name' => 'Stase Test',
            'code' => 'STT',
            'duration_weeks' => 4,
            'passing_grade' => 70,
            'status' => 'active',
        ]);

        $rotationPeriod = RotationPeriod::create([
            'program_id' => $program->id,
            'name' => 'Period Test',
            'start_date' => now(),
            'end_date' => now()->addWeeks(4),
            'status' => 'active',
        ]);

        // Create assignment
        $assignment = RotationAssignment::create([
            'student_id' => $student->id,
            'preceptor_id' => $preceptor->id,
            'hospital_id' => $hospital->id,
            'stase_id' => $stase->id,
            'rotation_period_id' => $rotationPeriod->id,
            'start_date' => now(),
            'end_date' => now()->addWeeks(4),
            'status' => 'active',
        ]);

        LogbookEntry::create([
            'student_id' => $student->id,
            'rotation_assignment_id' => $assignment->id,
            'preceptor_id' => $preceptor->id,
            'status' => 'submitted',
            'activity_date' => now(),
            'activity_type' => 'case',
            'description' => 'Test',
        ]);

        $response = $this->actingAs($preceptor)->getJson('/api/v1/clinical/preceptor/dashboard-stats');

        $response->assertStatus(200)
            ->assertJsonPath('data.assigned_students', 1)
            ->assertJsonPath('data.pending_logbooks', 1)
            ->assertJsonPath('data.total_assessments', 0);
    }
}
