<?php

namespace Modules\Rotation\Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Academic\Models\Cohort;
use Modules\Academic\Models\Faculty;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Stase;
use Modules\Academic\Models\Student;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\HospitalCapacity;
use Modules\Rotation\Models\RotationPeriod;
use Tests\TestCase;

/**
 * Regresi Rotation — penempatan: deteksi konflik dobel-periode, guard
 * kapasitas RS per stase, penempatan massal, dan RBAC manage-rotations.
 */
class RotationAssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $studentUser;

    protected Program $program;

    protected Stase $stase;

    protected Hospital $hospital;

    protected RotationPeriod $period;

    protected Cohort $cohort;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin Prodi');

        $this->studentUser = User::factory()->create();
        $this->studentUser->assignRole('Mahasiswa');

        $faculty = Faculty::create(['name' => 'FK']);
        $this->program = Program::create(['faculty_id' => $faculty->id, 'code' => 'PSPD', 'name' => 'Pendidikan Dokter']);
        $this->cohort = Cohort::create(['program_id' => $this->program->id, 'name' => '2026', 'year' => 2026]);
        $this->stase = Stase::create([
            'program_id' => $this->program->id, 'code' => 'IPD', 'name' => 'Penyakit Dalam',
            'duration_weeks' => 4, 'passing_grade' => 70,
        ]);
        $this->hospital = Hospital::create(['code' => 'RSA', 'name' => 'RS A', 'type' => 'Utama']);
        $this->period = RotationPeriod::create([
            'program_id' => $this->program->id, 'name' => 'Periode 1',
            'start_date' => '2026-07-01', 'end_date' => '2026-07-28', 'status' => 'active',
        ]);
    }

    private function makeStudent(): Student
    {
        $user = User::factory()->create();
        $user->assignRole('Mahasiswa');

        return Student::create([
            'user_id' => $user->id,
            'program_id' => $this->program->id,
            'cohort_id' => $this->cohort->id,
            'status' => 'active',
            'enrollment_date' => '2026-01-01',
        ]);
    }

    private function assignmentPayload(Student $student): array
    {
        return [
            'rotation_period_id' => $this->period->id,
            'student_id' => $student->id,
            'stase_id' => $this->stase->id,
            'hospital_id' => $this->hospital->id,
            'status' => 'confirmed',
        ];
    }

    public function test_student_cannot_create_assignment(): void
    {
        $student = $this->makeStudent();

        $this->actingAs($this->studentUser)
            ->postJson('/api/v1/rotation/assignments', $this->assignmentPayload($student))
            ->assertForbidden();
    }

    public function test_duplicate_assignment_in_same_period_is_rejected(): void
    {
        $student = $this->makeStudent();

        $this->actingAs($this->admin)
            ->postJson('/api/v1/rotation/assignments', $this->assignmentPayload($student))
            ->assertCreated();

        $this->actingAs($this->admin)
            ->postJson('/api/v1/rotation/assignments', $this->assignmentPayload($student))
            ->assertStatus(409);
    }

    public function test_capacity_guard_blocks_when_quota_full(): void
    {
        HospitalCapacity::create([
            'hospital_id' => $this->hospital->id,
            'stase_id' => $this->stase->id,
            'rotation_period_id' => null, // kuota umum
            'max_students' => 1,
        ]);

        $this->actingAs($this->admin)
            ->postJson('/api/v1/rotation/assignments', $this->assignmentPayload($this->makeStudent()))
            ->assertCreated();

        $res = $this->actingAs($this->admin)
            ->postJson('/api/v1/rotation/assignments', $this->assignmentPayload($this->makeStudent()));

        $res->assertStatus(409);
        $this->assertStringContainsString('Kuota penuh', $res->json('message'));
    }

    public function test_bulk_assignment_reports_created_and_skipped(): void
    {
        HospitalCapacity::create([
            'hospital_id' => $this->hospital->id,
            'stase_id' => $this->stase->id,
            'rotation_period_id' => $this->period->id,
            'max_students' => 2,
        ]);

        $students = [$this->makeStudent(), $this->makeStudent(), $this->makeStudent()];

        $res = $this->actingAs($this->admin)->postJson('/api/v1/rotation/assignments/bulk', [
            'rotation_period_id' => $this->period->id,
            'stase_id' => $this->stase->id,
            'hospital_id' => $this->hospital->id,
            'status' => 'confirmed',
            'student_ids' => array_map(fn ($s) => $s->id, $students),
        ]);

        $res->assertOk()
            ->assertJsonPath('data.created', 2);
        $this->assertCount(1, $res->json('data.skipped'));
    }

    public function test_capacity_endpoint_returns_occupancy(): void
    {
        $cap = HospitalCapacity::create([
            'hospital_id' => $this->hospital->id,
            'stase_id' => $this->stase->id,
            'rotation_period_id' => $this->period->id,
            'max_students' => 5,
        ]);

        $this->actingAs($this->admin)
            ->postJson('/api/v1/rotation/assignments', $this->assignmentPayload($this->makeStudent()))
            ->assertCreated();

        $res = $this->actingAs($this->admin)->getJson('/api/v1/rotation/capacities?hospital_id='.$this->hospital->id);

        $res->assertOk();
        $row = collect($res->json('data'))->firstWhere('id', $cap->id);
        $this->assertSame(1, $row['occupied']);
        $this->assertSame(5, $row['max_students']);
    }
}
