<?php

namespace Modules\Assessment\Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SystemReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Academic\Models\Cohort;
use Modules\Academic\Models\Faculty;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Stase;
use Modules\Academic\Models\Student;
use Modules\Assessment\Models\GradeAppeal;
use Modules\Assessment\Models\StaseGrade;
use Modules\Clinical\Models\SkillChecklistItem;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationAssignment;
use Modules\Rotation\Models\RotationPeriod;
use Tests\TestCase;

/**
 * P3 integritas klinis & penilaian: flag telat submit logbook, banding
 * nilai (jendela+kepemilikan+keputusan), remedial guard, skill checklist
 * (template RBAC + observasi ter-scope + progres).
 */
class ClinicalIntegrityTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $kaprodi;

    protected User $studentUser;

    protected User $dodiknis;

    protected Student $profile;

    protected Program $program;

    protected Cohort $cohort;

    protected Stase $stase;

    protected Hospital $hospital;

    protected RotationPeriod $period;

    protected RotationAssignment $assignment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(SystemReferenceSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin Prodi');
        $this->kaprodi = User::factory()->create();
        $this->kaprodi->assignRole('Kaprodi');

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
            'start_date' => now()->subDays(14)->toDateString(),
            'end_date' => now()->addDays(14)->toDateString(),
            'status' => 'active',
        ]);

        $this->studentUser = User::factory()->create(['program_id' => $this->program->id, 'identity_number' => 'J500260001']);
        $this->studentUser->assignRole('Mahasiswa');
        $this->profile = Student::create([
            'user_id' => $this->studentUser->id, 'program_id' => $this->program->id,
            'cohort_id' => $this->cohort->id, 'status' => 'active', 'enrollment_date' => '2026-01-01',
        ]);

        $this->dodiknis = User::factory()->create();
        $this->dodiknis->assignRole('Dodiknis');
        $this->dodiknis->hospitals()->attach($this->hospital->id);

        $this->assignment = RotationAssignment::create([
            'rotation_period_id' => $this->period->id, 'student_id' => $this->profile->id,
            'stase_id' => $this->stase->id, 'hospital_id' => $this->hospital->id, 'status' => 'in_progress',
        ]);
    }

    // ---------- Flag telat submit logbook ----------

    public function test_logbook_submitted_past_threshold_is_flagged_late(): void
    {
        // Ambang default 3 hari; kegiatan 5 hari lalu → telat 2 hari
        $res = $this->actingAs($this->studentUser)->postJson('/api/v1/clinical/logbooks', [
            'rotation_assignment_id' => $this->assignment->id,
            'activity_date' => now()->subDays(5)->toDateString(),
            'activity_type' => 'case',
            'description' => 'Anamnesis pasien DM tipe 2 di bangsal.',
            'status' => 'submitted',
        ]);

        $res->assertCreated();
        $this->assertTrue($res->json('data.is_late'));
        $this->assertSame(2, $res->json('data.late_days'));
    }

    public function test_logbook_submitted_on_time_is_not_late(): void
    {
        $res = $this->actingAs($this->studentUser)->postJson('/api/v1/clinical/logbooks', [
            'rotation_assignment_id' => $this->assignment->id,
            'activity_date' => now()->subDay()->toDateString(),
            'activity_type' => 'case',
            'description' => 'Follow-up pasien hipertensi.',
            'status' => 'submitted',
        ]);

        $res->assertCreated();
        $this->assertFalse($res->json('data.is_late'));
    }

    // ---------- Banding nilai ----------

    private function publishedGrade(): StaseGrade
    {
        return StaseGrade::create([
            'rotation_assignment_id' => $this->assignment->id,
            'student_id' => $this->studentUser->id,
            'final_score' => 55, 'letter_grade' => 'D', 'status' => 'published',
            'published_at' => now()->subDays(2),
        ]);
    }

    public function test_student_can_appeal_own_published_grade_once(): void
    {
        $grade = $this->publishedGrade();

        $this->actingAs($this->studentUser)
            ->postJson("/api/v1/grades/{$grade->id}/appeal", [
                'reason' => 'Nilai DOPS saya belum termasuk penilaian tanggal 20 Juni oleh dr. X.',
            ])->assertCreated();

        // Kedua kali → ditolak (satu banding per nilai)
        $this->actingAs($this->studentUser)
            ->postJson("/api/v1/grades/{$grade->id}/appeal", [
                'reason' => 'Mau banding lagi karena masih tidak puas dengan hasilnya.',
            ])->assertUnprocessable();
    }

    public function test_appeal_window_and_ownership_enforced(): void
    {
        $grade = $this->publishedGrade();
        $grade->update(['published_at' => now()->subDays(30)]); // lewat jendela 14 hari

        $this->actingAs($this->studentUser)
            ->postJson("/api/v1/grades/{$grade->id}/appeal", [
                'reason' => 'Sudah lewat jendela banding seharusnya ditolak sistem.',
            ])->assertUnprocessable();

        // Mahasiswa lain tidak boleh membanding nilai orang
        $other = User::factory()->create();
        $other->assignRole('Mahasiswa');
        $grade->update(['published_at' => now()]);
        $this->actingAs($other)
            ->postJson("/api/v1/grades/{$grade->id}/appeal", [
                'reason' => 'Banding atas nilai milik mahasiswa lain harus ditolak.',
            ])->assertForbidden();
    }

    public function test_accepted_appeal_reopens_grade(): void
    {
        $grade = $this->publishedGrade();
        $appeal = GradeAppeal::create([
            'stase_grade_id' => $grade->id,
            'student_id' => $this->studentUser->id,
            'reason' => 'Ada komponen penilaian yang belum dihitung.',
            'status' => 'submitted',
        ]);

        // Mahasiswa tidak boleh memutuskan
        $this->actingAs($this->studentUser)
            ->patchJson("/api/v1/grades/appeals/{$appeal->id}/decide", [
                'decision' => 'accepted', 'decision_note' => 'Saya setujui sendiri.',
            ])->assertForbidden();

        $this->actingAs($this->kaprodi)
            ->patchJson("/api/v1/grades/appeals/{$appeal->id}/decide", [
                'decision' => 'accepted', 'decision_note' => 'Benar, DOPS tgl 20/6 belum masuk. Nilai dihitung ulang.',
            ])->assertOk();

        $this->assertSame('approved', $grade->fresh()->status);
        $this->assertSame('accepted', $appeal->fresh()->status);
    }

    // ---------- Remedial guard ----------

    public function test_remedial_attempt_number_and_max_attempts(): void
    {
        // Penempatan pertama sudah ada (setUp) → attempt 1
        $this->assertSame(1, $this->assignment->fresh()->attempt_number);

        // Gagal (nilai < passing) → remedial di periode baru = attempt 2
        StaseGrade::create([
            'rotation_assignment_id' => $this->assignment->id,
            'student_id' => $this->studentUser->id,
            'final_score' => 50, 'letter_grade' => 'E', 'status' => 'published',
            'published_at' => now(),
        ]);
        $period2 = RotationPeriod::create([
            'program_id' => $this->program->id, 'name' => 'Periode 2',
            'start_date' => now()->addMonth()->toDateString(),
            'end_date' => now()->addMonths(2)->toDateString(), 'status' => 'planned',
        ]);

        $res = $this->actingAs($this->admin)->postJson('/api/v1/rotation/assignments', [
            'rotation_period_id' => $period2->id, 'student_id' => $this->profile->id,
            'stase_id' => $this->stase->id, 'hospital_id' => $this->hospital->id, 'status' => 'confirmed',
        ]);
        $res->assertCreated();
        $this->assertSame(2, RotationAssignment::find($res->json('data.id'))->attempt_number);

        // Percobaan ke-3 masih boleh (max 1+2), ke-4 ditolak
        $period3 = RotationPeriod::create([
            'program_id' => $this->program->id, 'name' => 'Periode 3',
            'start_date' => now()->addMonths(3)->toDateString(),
            'end_date' => now()->addMonths(4)->toDateString(), 'status' => 'planned',
        ]);
        $this->actingAs($this->admin)->postJson('/api/v1/rotation/assignments', [
            'rotation_period_id' => $period3->id, 'student_id' => $this->profile->id,
            'stase_id' => $this->stase->id, 'hospital_id' => $this->hospital->id, 'status' => 'confirmed',
        ])->assertCreated();

        $period4 = RotationPeriod::create([
            'program_id' => $this->program->id, 'name' => 'Periode 4',
            'start_date' => now()->addMonths(5)->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(), 'status' => 'planned',
        ]);
        $blocked = $this->actingAs($this->admin)->postJson('/api/v1/rotation/assignments', [
            'rotation_period_id' => $period4->id, 'student_id' => $this->profile->id,
            'stase_id' => $this->stase->id, 'hospital_id' => $this->hospital->id, 'status' => 'confirmed',
        ]);
        $blocked->assertStatus(409);
        $this->assertStringContainsString('review akademik', $blocked->json('message'));
    }

    public function test_passed_stase_cannot_be_retaken(): void
    {
        StaseGrade::create([
            'rotation_assignment_id' => $this->assignment->id,
            'student_id' => $this->studentUser->id,
            'final_score' => 85, 'letter_grade' => 'A', 'status' => 'published',
            'published_at' => now(),
        ]);
        $period2 = RotationPeriod::create([
            'program_id' => $this->program->id, 'name' => 'Periode 2',
            'start_date' => now()->addMonth()->toDateString(),
            'end_date' => now()->addMonths(2)->toDateString(), 'status' => 'planned',
        ]);

        $res = $this->actingAs($this->admin)->postJson('/api/v1/rotation/assignments', [
            'rotation_period_id' => $period2->id, 'student_id' => $this->profile->id,
            'stase_id' => $this->stase->id, 'hospital_id' => $this->hospital->id, 'status' => 'confirmed',
        ]);

        $res->assertStatus(409);
        $this->assertStringContainsString('LULUS', $res->json('message'));
    }

    // ---------- Skill checklist ----------

    public function test_skill_template_mutation_requires_manage_stase(): void
    {
        $this->actingAs($this->studentUser)->postJson('/api/v1/clinical/skills/items', [
            'stase_id' => $this->stase->id, 'name' => 'Pungsi vena',
        ])->assertForbidden();

        $this->actingAs($this->admin)->postJson('/api/v1/clinical/skills/items', [
            'stase_id' => $this->stase->id, 'name' => 'Pungsi vena',
        ])->assertCreated();
    }

    public function test_dodiknis_assesses_only_students_at_own_hospital(): void
    {
        $item = SkillChecklistItem::create(['stase_id' => $this->stase->id, 'name' => 'Pungsi vena']);

        // Mahasiswa di RS-nya → boleh (dan observasi ulang MENIMPA)
        $this->actingAs($this->dodiknis)->postJson('/api/v1/clinical/skills/assess', [
            'student_id' => $this->profile->id,
            'skill_checklist_item_id' => $item->id,
            'level' => 'below_expected',
        ])->assertOk();
        $this->actingAs($this->dodiknis)->postJson('/api/v1/clinical/skills/assess', [
            'student_id' => $this->profile->id,
            'skill_checklist_item_id' => $item->id,
            'level' => 'at_expected',
        ])->assertOk();
        $this->assertDatabaseCount('student_skill_records', 1);

        // Mahasiswa RS lain → 403
        $otherUser = User::factory()->create();
        $otherUser->assignRole('Mahasiswa');
        $otherProfile = Student::create([
            'user_id' => $otherUser->id, 'program_id' => $this->program->id,
            'cohort_id' => $this->cohort->id, 'status' => 'active', 'enrollment_date' => '2026-01-01',
        ]);
        $otherHospital = Hospital::create(['code' => 'RSB', 'name' => 'RS B', 'type' => 'Jejaring']);
        RotationAssignment::create([
            'rotation_period_id' => $this->period->id, 'student_id' => $otherProfile->id,
            'stase_id' => $this->stase->id, 'hospital_id' => $otherHospital->id, 'status' => 'in_progress',
        ]);

        $this->actingAs($this->dodiknis)->postJson('/api/v1/clinical/skills/assess', [
            'student_id' => $otherProfile->id,
            'skill_checklist_item_id' => $item->id,
            'level' => 'at_expected',
        ])->assertForbidden();
    }

    public function test_student_sees_own_skill_progress(): void
    {
        $item = SkillChecklistItem::create(['stase_id' => $this->stase->id, 'name' => 'Pungsi vena']);
        $this->actingAs($this->dodiknis)->postJson('/api/v1/clinical/skills/assess', [
            'student_id' => $this->profile->id,
            'skill_checklist_item_id' => $item->id,
            'level' => 'above_expected',
        ])->assertOk();

        $res = $this->actingAs($this->studentUser)->getJson('/api/v1/clinical/skills/progress');

        $res->assertOk();
        $stase = collect($res->json('data.stases'))->firstWhere('stase', 'Penyakit Dalam');
        $this->assertSame(1, $stase['assessed']);
        $this->assertSame('above_expected', $stase['items'][0]['level']);
    }
}
