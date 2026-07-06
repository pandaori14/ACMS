<?php

namespace Modules\Rotation\Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Academic\Models\AcademicEvent;
use Modules\Academic\Models\Cohort;
use Modules\Academic\Models\Faculty;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Stase;
use Modules\Academic\Models\Student;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationAssignment;
use Modules\Rotation\Models\RotationPeriod;
use Tests\TestCase;

/**
 * Guard baru penempatan rotasi (P1 fondasi akademik): mahasiswa non-aktif
 * ditolak, periode kena blackout kalender ditolak, prasyarat stase ditegakkan
 * di penempatan manual maupun auto-scheduler.
 */
class RotationGuardrailsTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected Program $program;

    protected Cohort $cohort;

    protected Stase $stase;

    protected Hospital $hospital;

    protected RotationPeriod $period;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin Prodi');

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

    private function makeStudent(string $status = 'active'): Student
    {
        $user = User::factory()->create();
        $user->assignRole('Mahasiswa');

        return Student::create([
            'user_id' => $user->id,
            'program_id' => $this->program->id,
            'cohort_id' => $this->cohort->id,
            'status' => $status,
            'enrollment_date' => '2026-01-01',
        ]);
    }

    private function assign(Student $student, ?Stase $stase = null, ?RotationPeriod $period = null)
    {
        return $this->actingAs($this->admin)->postJson('/api/v1/rotation/assignments', [
            'rotation_period_id' => ($period ?? $this->period)->id,
            'student_id' => $student->id,
            'stase_id' => ($stase ?? $this->stase)->id,
            'hospital_id' => $this->hospital->id,
            'status' => 'confirmed',
        ]);
    }

    public function test_inactive_student_cannot_be_assigned(): void
    {
        $res = $this->assign($this->makeStudent('leave'));

        $res->assertStatus(409);
        $this->assertStringContainsString('aktif', $res->json('message'));
    }

    public function test_blackout_period_blocks_assignment(): void
    {
        AcademicEvent::create([
            'title' => 'Blackout UKMPPD',
            'event_type' => 'blackout',
            'start_date' => '2026-07-10',
            'end_date' => '2026-07-15',
            'blocks_rotation' => true,
        ]);

        $res = $this->assign($this->makeStudent());

        $res->assertStatus(409);
        $this->assertStringContainsString('blackout', $res->json('message'));
    }

    public function test_non_blocking_event_does_not_block_assignment(): void
    {
        AcademicEvent::create([
            'title' => 'Libur Nasional',
            'event_type' => 'holiday',
            'start_date' => '2026-07-10',
            'end_date' => '2026-07-11',
            'blocks_rotation' => false,
        ]);

        $this->assign($this->makeStudent())->assertCreated();
    }

    public function test_prerequisite_stase_enforced_on_manual_assignment(): void
    {
        $advanced = Stase::create([
            'program_id' => $this->program->id, 'code' => 'BDH', 'name' => 'Bedah',
            'duration_weeks' => 4, 'passing_grade' => 70,
            'prerequisite_stase_ids' => [$this->stase->id],
        ]);
        $student = $this->makeStudent();

        // Belum menyelesaikan IPD → ditolak
        $res = $this->assign($student, $advanced);
        $res->assertStatus(409);
        $this->assertStringContainsString('Prasyarat', $res->json('message'));

        // Selesaikan IPD di periode lain → boleh masuk Bedah
        $periodDone = RotationPeriod::create([
            'program_id' => $this->program->id, 'name' => 'Periode 0',
            'start_date' => '2026-05-01', 'end_date' => '2026-05-28', 'status' => 'completed',
        ]);
        RotationAssignment::create([
            'rotation_period_id' => $periodDone->id,
            'student_id' => $student->id,
            'stase_id' => $this->stase->id,
            'hospital_id' => $this->hospital->id,
            'status' => 'completed',
        ]);

        $this->assign($student, $advanced)->assertCreated();
    }

    public function test_scheduler_preview_respects_blackout_and_prerequisites(): void
    {
        $advanced = Stase::create([
            'program_id' => $this->program->id, 'code' => 'BDH', 'name' => 'Bedah',
            'duration_weeks' => 4, 'passing_grade' => 70,
            'prerequisite_stase_ids' => [$this->stase->id],
        ]);
        $student = $this->makeStudent();

        // Preview normal: mahasiswa hanya bisa masuk stase TANPA prasyarat (IPD)
        $res = $this->actingAs($this->admin)->postJson('/api/v1/rotation/schedule/preview', [
            'rotation_period_id' => $this->period->id,
        ]);
        $res->assertOk();
        $placements = collect($res->json('data.placements'));
        $this->assertSame(
            $this->stase->id,
            $placements->firstWhere('student_id', $student->id)['stase_id']
        );
        $this->assertNotContains($advanced->id, $placements->pluck('stase_id'));

        // Periode kena blackout → preview kosong dengan alasan
        AcademicEvent::create([
            'title' => 'Blackout', 'event_type' => 'blackout',
            'start_date' => '2026-07-01', 'end_date' => '2026-07-31',
            'blocks_rotation' => true,
        ]);

        $blocked = $this->actingAs($this->admin)->postJson('/api/v1/rotation/schedule/preview', [
            'rotation_period_id' => $this->period->id,
        ]);
        $blocked->assertOk();
        $this->assertSame(0, $blocked->json('data.summary.candidates'));
        $this->assertNotNull($blocked->json('data.summary.blocked_reason'));
    }
}
