<?php

namespace Modules\Assessment\Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Academic\Models\Cohort;
use Modules\Academic\Models\Faculty;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Stase;
use Modules\Academic\Models\Student;
use Modules\Assessment\Models\AssessmentScore;
use Modules\Assessment\Models\AssessmentTemplate;
use Modules\Assessment\Models\ClinicalAssessment;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationAssignment;
use Modules\Rotation\Models\RotationPeriod;
use Tests\TestCase;

/**
 * Regresi Assessment — edit/hapus penilaian: hanya kreator/admin,
 * terkunci setelah acknowledged, skor dihitung ulang dari rubrik.
 */
class AssessmentCrudTest extends TestCase
{
    use RefreshDatabase;

    protected User $preceptor;

    protected User $otherPreceptor;

    protected User $studentUser;

    protected ClinicalAssessment $assessment;

    protected AssessmentTemplate $template;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->preceptor = User::factory()->create();
        $this->preceptor->assignRole('Dodiknis');

        $this->otherPreceptor = User::factory()->create();
        $this->otherPreceptor->assignRole('Dodiknis');

        $this->studentUser = User::factory()->create();
        $this->studentUser->assignRole('Mahasiswa');

        $faculty = Faculty::create(['name' => 'FK']);
        $program = Program::create(['faculty_id' => $faculty->id, 'code' => 'PSPD', 'name' => 'Pendidikan Dokter']);
        $cohort = Cohort::create(['program_id' => $program->id, 'name' => '2026', 'year' => 2026]);
        $stase = Stase::create([
            'program_id' => $program->id, 'code' => 'IPD', 'name' => 'Penyakit Dalam',
            'duration_weeks' => 4, 'passing_grade' => 70,
        ]);
        $hospital = Hospital::create(['code' => 'RSA', 'name' => 'RS A', 'type' => 'Utama']);
        $period = RotationPeriod::create([
            'program_id' => $program->id, 'name' => 'Periode 1',
            'start_date' => '2026-07-01', 'end_date' => '2026-07-28', 'status' => 'active',
        ]);
        $studentProfile = Student::create([
            'user_id' => $this->studentUser->id, 'program_id' => $program->id,
            'cohort_id' => $cohort->id, 'status' => 'active', 'enrollment_date' => '2026-01-01',
        ]);
        $assignment = RotationAssignment::create([
            'rotation_period_id' => $period->id, 'student_id' => $studentProfile->id,
            'stase_id' => $stase->id, 'hospital_id' => $hospital->id, 'status' => 'in_progress',
        ]);

        $this->template = AssessmentTemplate::create([
            'type' => 'mini-cex', 'name' => 'Mini-CEX',
            'rubric_schema' => ['indicators' => [
                ['key' => 'anamnesis', 'label' => 'Anamnesis', 'weight' => 50, 'max_score' => 100],
                ['key' => 'diagnosis', 'label' => 'Diagnosis', 'weight' => 50, 'max_score' => 100],
            ]],
            'is_active' => true,
        ]);

        $this->assessment = ClinicalAssessment::create([
            'rotation_assignment_id' => $assignment->id,
            'assessment_template_id' => $this->template->id,
            'student_id' => $this->studentUser->id,
            'preceptor_id' => $this->preceptor->id,
            'assessment_date' => '2026-07-05',
            'total_score' => 75,
            'feedback_notes' => 'Cukup baik.',
            'status' => 'submitted',
        ]);
        foreach (['anamnesis' => 80, 'diagnosis' => 70] as $key => $score) {
            AssessmentScore::create([
                'clinical_assessment_id' => $this->assessment->id,
                'rubric_key' => $key,
                'score' => $score,
            ]);
        }
    }

    public function test_creator_can_update_scores_and_total_is_recomputed(): void
    {
        $res = $this->actingAs($this->preceptor)->putJson("/api/v1/assessments/{$this->assessment->id}", [
            'scores' => ['anamnesis' => 90, 'diagnosis' => 80],
            'feedback_notes' => 'Meningkat pesat.',
        ]);

        $res->assertOk()->assertJsonPath('data.feedback_notes', 'Meningkat pesat.');
        // (90/100)*50 + (80/100)*50 = 85
        $this->assertEquals(85.0, (float) $res->json('data.total_score'));
    }

    public function test_other_preceptor_cannot_update_or_delete(): void
    {
        $this->actingAs($this->otherPreceptor)
            ->putJson("/api/v1/assessments/{$this->assessment->id}", ['feedback_notes' => 'Hack'])
            ->assertForbidden();

        $this->actingAs($this->otherPreceptor)
            ->deleteJson("/api/v1/assessments/{$this->assessment->id}")
            ->assertForbidden();
    }

    public function test_acknowledged_assessment_is_locked(): void
    {
        $this->assessment->update(['status' => 'acknowledged']);

        $this->actingAs($this->preceptor)
            ->putJson("/api/v1/assessments/{$this->assessment->id}", ['feedback_notes' => 'Ubah'])
            ->assertStatus(422);

        $this->actingAs($this->preceptor)
            ->deleteJson("/api/v1/assessments/{$this->assessment->id}")
            ->assertStatus(422);
    }

    public function test_creator_can_delete_before_acknowledged(): void
    {
        $this->actingAs($this->preceptor)
            ->deleteJson("/api/v1/assessments/{$this->assessment->id}")
            ->assertOk();

        $this->assertSoftDeleted('clinical_assessments', ['id' => $this->assessment->id]);
    }

    public function test_template_mutation_requires_academic_master_permission(): void
    {
        $this->actingAs($this->preceptor)
            ->postJson('/api/v1/assessments/templates', [
                'type' => 'dops', 'name' => 'DOPS',
                'rubric_schema' => ['indicators' => []],
            ])
            ->assertForbidden();
    }
}
