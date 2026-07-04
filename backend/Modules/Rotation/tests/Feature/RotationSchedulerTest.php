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
use Modules\Rotation\Models\RotationAssignment;
use Modules\Rotation\Models\RotationPeriod;
use Tests\TestCase;

/**
 * Regresi mesin auto-scheduling rotasi — preview dry-run, distribusi merata
 * round-robin, hormati kuota, lewati mahasiswa ber-assignment & stase yang
 * sudah dijalani, dan RBAC manage-rotations.
 */
class RotationSchedulerTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $studentUser;

    protected Program $program;

    protected Cohort $cohort;

    protected RotationPeriod $period;

    protected Hospital $hospital;

    /** @var Stase[] */
    protected array $stases = [];

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

        foreach (['Anak', 'Bedah', 'Penyakit Dalam'] as $i => $name) {
            $this->stases[] = Stase::create([
                'program_id' => $this->program->id, 'code' => 'ST'.$i, 'name' => $name,
                'duration_weeks' => 4, 'passing_grade' => 70,
            ]);
        }

        $this->hospital = Hospital::create(['code' => 'RSA', 'name' => 'RS A', 'type' => 'Utama']);

        $this->period = RotationPeriod::create([
            'program_id' => $this->program->id, 'name' => 'Periode 1',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(28)->toDateString(),
            'status' => 'active',
        ]);
    }

    private function makeStudents(int $count): array
    {
        $students = [];
        for ($i = 0; $i < $count; $i++) {
            $user = User::factory()->create();
            $user->assignRole('Mahasiswa');
            $students[] = Student::create([
                'user_id' => $user->id,
                'program_id' => $this->program->id,
                'cohort_id' => $this->cohort->id,
                'status' => 'active',
                'enrollment_date' => '2026-01-01',
            ]);
        }

        return $students;
    }

    public function test_student_cannot_use_scheduler(): void
    {
        $this->actingAs($this->studentUser)
            ->postJson('/api/v1/rotation/schedule/preview', ['rotation_period_id' => $this->period->id])
            ->assertForbidden();
    }

    public function test_preview_distributes_evenly_and_does_not_write(): void
    {
        $this->makeStudents(6);

        $res = $this->actingAs($this->admin)->postJson('/api/v1/rotation/schedule/preview', [
            'rotation_period_id' => $this->period->id,
        ]);

        $res->assertOk()
            ->assertJsonPath('data.summary.candidates', 6)
            ->assertJsonPath('data.summary.placed', 6);

        // Distribusi merata: 6 mhs × 3 stase → 2/2/2
        $byStase = collect($res->json('data.placements'))->groupBy('stase_name');
        $this->assertCount(3, $byStase);
        foreach ($byStase as $group) {
            $this->assertCount(2, $group);
        }

        // Dry-run: TIDAK ada baris yang tertulis
        $this->assertSame(0, RotationAssignment::count());
    }

    public function test_commit_creates_assignments_and_respects_quota(): void
    {
        // Kuota RS A utk stase pertama hanya 1
        HospitalCapacity::create([
            'hospital_id' => $this->hospital->id,
            'stase_id' => $this->stases[0]->id,
            'rotation_period_id' => $this->period->id,
            'max_students' => 1,
        ]);

        $this->makeStudents(4);

        $preview = $this->actingAs($this->admin)->postJson('/api/v1/rotation/schedule/preview', [
            'rotation_period_id' => $this->period->id,
        ])->assertOk()->json('data');

        // Stase ber-kuota-1 tidak boleh diisi lebih dari 1
        $staseCounts = collect($preview['placements'])->groupBy('stase_id');
        $this->assertLessThanOrEqual(1, ($staseCounts->get($this->stases[0]->id) ?? collect())->count());

        $res = $this->actingAs($this->admin)->postJson('/api/v1/rotation/schedule/commit', [
            'rotation_period_id' => $this->period->id,
            'placements' => $preview['placements'],
        ]);

        $res->assertOk();
        $this->assertSame(count($preview['placements']), $res->json('data.created'));
        $this->assertSame(count($preview['placements']), RotationAssignment::count());
    }

    public function test_already_assigned_students_are_skipped(): void
    {
        $students = $this->makeStudents(3);

        // Satu mahasiswa sudah ditempatkan manual
        RotationAssignment::create([
            'rotation_period_id' => $this->period->id,
            'student_id' => $students[0]->id,
            'stase_id' => $this->stases[0]->id,
            'hospital_id' => $this->hospital->id,
            'status' => 'confirmed',
        ]);

        $res = $this->actingAs($this->admin)->postJson('/api/v1/rotation/schedule/preview', [
            'rotation_period_id' => $this->period->id,
        ]);

        $res->assertOk()->assertJsonPath('data.summary.candidates', 2);
        $ids = collect($res->json('data.placements'))->pluck('student_id');
        $this->assertFalse($ids->contains($students[0]->id));
    }

    public function test_completed_stase_is_not_repeated(): void
    {
        $students = $this->makeStudents(1);

        // Riwayat: mahasiswa sudah menjalani stase 'Anak' di periode lampau
        $pastPeriod = RotationPeriod::create([
            'program_id' => $this->program->id, 'name' => 'Periode Lalu',
            'start_date' => now()->subMonths(2)->toDateString(),
            'end_date' => now()->subMonth()->toDateString(),
            'status' => 'completed',
        ]);
        RotationAssignment::create([
            'rotation_period_id' => $pastPeriod->id,
            'student_id' => $students[0]->id,
            'stase_id' => $this->stases[0]->id, // Anak
            'hospital_id' => $this->hospital->id,
            'status' => 'completed',
        ]);

        $res = $this->actingAs($this->admin)->postJson('/api/v1/rotation/schedule/preview', [
            'rotation_period_id' => $this->period->id,
        ]);

        $res->assertOk()->assertJsonPath('data.summary.placed', 1);
        $this->assertNotSame(
            $this->stases[0]->id,
            $res->json('data.placements.0.stase_id'),
            'Stase yang sudah dijalani tidak boleh diulang.'
        );
    }

    public function test_unplaced_reported_when_all_quota_full(): void
    {
        // Semua stase diberi kuota 0-efektif (max 1, lalu diisi manual)
        foreach ($this->stases as $stase) {
            HospitalCapacity::create([
                'hospital_id' => $this->hospital->id,
                'stase_id' => $stase->id,
                'rotation_period_id' => $this->period->id,
                'max_students' => 1,
            ]);
        }
        $fillers = $this->makeStudents(3);
        foreach ($this->stases as $i => $stase) {
            RotationAssignment::create([
                'rotation_period_id' => $this->period->id,
                'student_id' => $fillers[$i]->id,
                'stase_id' => $stase->id,
                'hospital_id' => $this->hospital->id,
                'status' => 'confirmed',
            ]);
        }

        $this->makeStudents(1); // kandidat baru — semua kuota sudah penuh

        $res = $this->actingAs($this->admin)->postJson('/api/v1/rotation/schedule/preview', [
            'rotation_period_id' => $this->period->id,
        ]);

        $res->assertOk()
            ->assertJsonPath('data.summary.placed', 0);
        $this->assertCount(1, $res->json('data.unplaced'));
        $this->assertStringContainsString('penuh', $res->json('data.unplaced.0.reason'));
    }
}
