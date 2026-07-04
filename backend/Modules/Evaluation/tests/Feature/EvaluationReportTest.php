<?php

namespace Modules\Evaluation\Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Academic\Models\Cohort;
use Modules\Academic\Models\Faculty;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Stase;
use Modules\Academic\Models\Student;
use Modules\Evaluation\Models\EvaluationQuestion;
use Modules\Evaluation\Models\EvaluationSubmission;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationAssignment;
use Modules\Rotation\Models\RotationPeriod;
use Tests\TestCase;

/**
 * Regresi Evaluation — laporan agregat anonim (ambang responden, tanpa
 * identitas mahasiswa) + bank pertanyaan (guard hapus bila sudah dijawab).
 */
class EvaluationReportTest extends TestCase
{
    use RefreshDatabase;

    protected User $analyst;    // Kaprodi — view-analytics

    protected User $studentUser;

    protected User $preceptor;

    protected EvaluationQuestion $question;

    protected RotationAssignment $assignment;

    protected Program $program;

    protected Cohort $cohort;

    protected RotationPeriod $period;

    protected Stase $stase;

    protected Hospital $hospital;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->analyst = User::factory()->create();
        $this->analyst->assignRole('Kaprodi');

        $this->studentUser = User::factory()->create();
        $this->studentUser->assignRole('Mahasiswa');

        $this->preceptor = User::factory()->create();
        $this->preceptor->assignRole('Dodiknis');

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
            'start_date' => '2026-06-01', 'end_date' => '2026-06-28', 'status' => 'active',
        ]);

        $this->question = EvaluationQuestion::create([
            'target_type' => 'PRECEPTOR',
            'question_text' => 'Kualitas bimbingan klinis?',
            'is_active' => true,
        ]);

        $studentProfile = Student::create([
            'user_id' => $this->studentUser->id, 'program_id' => $this->program->id,
            'cohort_id' => $this->cohort->id, 'status' => 'active', 'enrollment_date' => '2026-01-01',
        ]);
        $this->assignment = RotationAssignment::create([
            'rotation_period_id' => $this->period->id, 'student_id' => $studentProfile->id,
            'stase_id' => $this->stase->id, 'hospital_id' => $this->hospital->id,
            'preceptor_id' => $this->preceptor->id, 'status' => 'completed',
        ]);
    }

    private function submitFor(User $studentUser, int $rating, ?string $comment = null): void
    {
        $profile = Student::firstOrCreate(
            ['user_id' => $studentUser->id],
            [
                'program_id' => $this->program->id, 'cohort_id' => $this->cohort->id,
                'status' => 'active', 'enrollment_date' => '2026-01-01',
            ]
        );

        EvaluationSubmission::create([
            'student_id' => $profile->id,
            'rotation_assignment_id' => $this->assignment->id,
            'target_id' => $this->preceptor->id,
            'target_type' => User::class,
            'evaluation_question_id' => $this->question->id,
            'rating' => $rating,
            'comment' => $comment,
        ]);
    }

    public function test_report_requires_analytics_permission(): void
    {
        $this->actingAs($this->studentUser)
            ->getJson('/api/v1/clinical/evaluations/report')
            ->assertForbidden();
    }

    public function test_report_aggregates_anonymously_with_threshold(): void
    {
        // 3 responden → tampil dengan ambang default 3
        $this->submitFor($this->studentUser, 5, 'Sangat membimbing.');
        $this->submitFor(User::factory()->create(), 4);
        $this->submitFor(User::factory()->create(), 3);

        $res = $this->actingAs($this->analyst)->getJson('/api/v1/clinical/evaluations/report');

        $res->assertOk();
        $data = $res->json('data');
        $this->assertCount(1, $data);
        $this->assertSame(3, $data[0]['respondents']);
        $this->assertSame(4.0, (float) $data[0]['average_rating']);
        $this->assertSame($this->preceptor->name, $data[0]['target_name']);

        // Respons TIDAK memuat identitas mahasiswa
        $this->assertStringNotContainsString($this->studentUser->name, json_encode($data));
        $this->assertStringNotContainsString('student_id', json_encode($data));
    }

    public function test_targets_below_threshold_are_hidden(): void
    {
        $this->submitFor($this->studentUser, 5); // hanya 1 responden

        $res = $this->actingAs($this->analyst)->getJson('/api/v1/clinical/evaluations/report');

        $res->assertOk()->assertJsonCount(0, 'data');

        // Dengan ambang diturunkan, muncul
        $this->actingAs($this->analyst)
            ->getJson('/api/v1/clinical/evaluations/report?min_responses=1')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_question_with_answers_is_deactivated_not_deleted(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Admin Prodi');

        $this->submitFor($this->studentUser, 4);

        $this->actingAs($admin)
            ->deleteJson("/api/v1/clinical/evaluations/questions/{$this->question->id}")
            ->assertOk();

        $this->assertDatabaseHas('evaluation_questions', [
            'id' => $this->question->id,
            'is_active' => false,
        ]);

        // Pertanyaan tanpa jawaban → benar-benar dihapus
        $fresh = EvaluationQuestion::create([
            'target_type' => 'HOSPITAL', 'question_text' => 'Fasilitas RS?', 'is_active' => true,
        ]);
        $this->actingAs($admin)
            ->deleteJson("/api/v1/clinical/evaluations/questions/{$fresh->id}")
            ->assertOk();
        $this->assertDatabaseMissing('evaluation_questions', ['id' => $fresh->id]);
    }
}
