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
use Modules\Assessment\Models\StaseGrade;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationAssignment;
use Modules\Rotation\Models\RotationPeriod;
use Modules\Rotation\Models\RotationSwapRequest;
use Tests\TestCase;

/**
 * P4b: tukar jadwal rotasi (ajukan → putuskan → slot ditukar atomik),
 * matriks timeline, at-risk & cohort comparison (RBAC eksekutif).
 */
class SwapAndAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $kaprodi;

    protected User $studentA;

    protected User $studentB;

    protected Student $profileA;

    protected Student $profileB;

    protected Program $program;

    protected Cohort $cohort;

    protected Stase $staseX;

    protected Stase $staseY;

    protected Hospital $hospA;

    protected Hospital $hospB;

    protected RotationPeriod $period;

    protected RotationAssignment $assignA;

    protected RotationAssignment $assignB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin Prodi');
        $this->kaprodi = User::factory()->create();
        $this->kaprodi->assignRole('Kaprodi');

        $faculty = Faculty::create(['name' => 'FK']);
        $this->program = Program::create(['faculty_id' => $faculty->id, 'code' => 'PSPD', 'name' => 'Pendidikan Dokter']);
        $this->cohort = Cohort::create(['program_id' => $this->program->id, 'name' => '2026', 'year' => 2026]);
        $this->staseX = Stase::create([
            'program_id' => $this->program->id, 'code' => 'IPD', 'name' => 'Penyakit Dalam',
            'duration_weeks' => 4, 'passing_grade' => 70,
        ]);
        $this->staseY = Stase::create([
            'program_id' => $this->program->id, 'code' => 'BDH', 'name' => 'Bedah',
            'duration_weeks' => 4, 'passing_grade' => 70,
        ]);
        $this->hospA = Hospital::create(['code' => 'RSA', 'name' => 'RS A', 'type' => 'Utama']);
        $this->hospB = Hospital::create(['code' => 'RSB', 'name' => 'RS B', 'type' => 'Jejaring']);
        $this->period = RotationPeriod::create([
            'program_id' => $this->program->id, 'name' => 'Periode 1',
            'start_date' => now()->addWeek()->toDateString(),
            'end_date' => now()->addWeeks(5)->toDateString(), 'status' => 'planned',
        ]);

        [$this->studentA, $this->profileA] = $this->makeStudent();
        [$this->studentB, $this->profileB] = $this->makeStudent();

        $this->assignA = RotationAssignment::create([
            'rotation_period_id' => $this->period->id, 'student_id' => $this->profileA->id,
            'stase_id' => $this->staseX->id, 'hospital_id' => $this->hospA->id, 'status' => 'confirmed',
        ]);
        $this->assignB = RotationAssignment::create([
            'rotation_period_id' => $this->period->id, 'student_id' => $this->profileB->id,
            'stase_id' => $this->staseY->id, 'hospital_id' => $this->hospB->id, 'status' => 'confirmed',
        ]);
    }

    /** @return array{0: User, 1: Student} */
    private function makeStudent(): array
    {
        $user = User::factory()->create(['program_id' => $this->program->id]);
        $user->assignRole('Mahasiswa');
        $profile = Student::create([
            'user_id' => $user->id, 'program_id' => $this->program->id,
            'cohort_id' => $this->cohort->id, 'status' => 'active', 'enrollment_date' => '2026-01-01',
        ]);

        return [$user, $profile];
    }

    public function test_student_requests_swap_and_admin_approves_slots_exchanged(): void
    {
        $res = $this->actingAs($this->studentA)->postJson('/api/v1/rotation/swaps', [
            'target_assignment_id' => $this->assignB->id,
            'reason' => 'RS B lebih dekat domisili orang tua saya.',
        ]);
        $res->assertCreated();
        $swapId = $res->json('data.id');

        // Permintaan ganda utk penempatan yang sama → ditolak
        $this->actingAs($this->studentB)->postJson('/api/v1/rotation/swaps', [
            'target_assignment_id' => $this->assignA->id,
            'reason' => 'Saya juga ingin bertukar dengan penempatan itu.',
        ])->assertUnprocessable();

        // Mahasiswa tidak boleh memutuskan
        $this->actingAs($this->studentA)
            ->patchJson("/api/v1/rotation/swaps/{$swapId}/decide", ['decision' => 'approved'])
            ->assertForbidden();

        $this->actingAs($this->admin)
            ->patchJson("/api/v1/rotation/swaps/{$swapId}/decide", [
                'decision' => 'approved', 'decision_note' => 'Disetujui — alasan wajar.',
            ])->assertOk();

        // Slot benar-benar tertukar
        $this->assertSame($this->staseY->id, $this->assignA->fresh()->stase_id);
        $this->assertSame($this->hospB->id, $this->assignA->fresh()->hospital_id);
        $this->assertSame($this->staseX->id, $this->assignB->fresh()->stase_id);
        $this->assertSame($this->hospA->id, $this->assignB->fresh()->hospital_id);
    }

    public function test_swap_blocked_for_in_progress_assignment(): void
    {
        $this->assignB->update(['status' => 'in_progress']);

        $this->actingAs($this->studentA)->postJson('/api/v1/rotation/swaps', [
            'target_assignment_id' => $this->assignB->id,
            'reason' => 'Ingin bertukar walau rotasi mitra sudah berjalan.',
        ])->assertUnprocessable();
    }

    public function test_requester_can_cancel_pending_swap(): void
    {
        $swap = RotationSwapRequest::create([
            'requester_assignment_id' => $this->assignA->id,
            'target_assignment_id' => $this->assignB->id,
            'reason' => 'Alasan pribadi keluarga.', 'status' => 'submitted',
        ]);

        // Bukan pemohon → 403
        $this->actingAs($this->studentB)
            ->patchJson("/api/v1/rotation/swaps/{$swap->id}/cancel")
            ->assertForbidden();

        $this->actingAs($this->studentA)
            ->patchJson("/api/v1/rotation/swaps/{$swap->id}/cancel")
            ->assertOk();
        $this->assertSame('cancelled', $swap->fresh()->status);
    }

    public function test_schedule_matrix_returns_rows_and_periods(): void
    {
        $res = $this->actingAs($this->admin)
            ->getJson('/api/v1/rotation/schedule-matrix?cohort_id='.$this->cohort->id);

        $res->assertOk();
        $this->assertCount(1, $res->json('data.periods'));
        $this->assertCount(2, $res->json('data.rows'));
        $rowA = collect($res->json('data.rows'))->firstWhere('student_id', $this->profileA->id);
        $this->assertSame('Penyakit Dalam', $rowA['cells'][$this->period->id]['stase']);
    }

    public function test_at_risk_and_cohort_comparison_gated_and_working(): void
    {
        // Mahasiswa gagal 1 stase → sinyal at-risk
        StaseGrade::create([
            'rotation_assignment_id' => $this->assignA->id,
            'student_id' => $this->studentA->id,
            'final_score' => 50, 'letter_grade' => 'E', 'status' => 'published',
            'published_at' => now(),
        ]);

        $this->actingAs($this->studentA)
            ->getJson('/api/v1/analytics/at-risk')
            ->assertForbidden();

        $res = $this->actingAs($this->kaprodi)->getJson('/api/v1/analytics/at-risk');
        $res->assertOk();
        $flagged = collect($res->json('data.students'))->firstWhere('user_id', $this->studentA->id);
        $this->assertNotNull($flagged);
        $this->assertStringContainsString('di bawah ambang lulus', $flagged['signals'][0]);

        $comparison = $this->actingAs($this->kaprodi)->getJson('/api/v1/analytics/cohort-comparison');
        $comparison->assertOk();
        $row = collect($comparison->json('data'))->firstWhere('cohort', '2026');
        $this->assertSame(2, $row['students']);
        $this->assertEquals(50, $row['avg_grade']);
    }
}
