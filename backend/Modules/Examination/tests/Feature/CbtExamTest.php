<?php

namespace Modules\Examination\Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Academic\Models\Faculty;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Stase;
use Modules\Examination\Models\Exam;
use Modules\Examination\Models\ExamParticipant;
use Modules\Examination\Models\ExamQuestion;
use Tests\TestCase;

/**
 * Regresi CBT — bank soal (RBAC + kunci setelah ada jawaban), attempt
 * mahasiswa (tanpa bocor kunci), auto-grading, dan penegakan waktu server-side.
 */
class CbtExamTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $studentUser;

    protected User $outsider;   // mahasiswa yang BUKAN peserta

    protected Exam $exam;

    protected ExamParticipant $participant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin Prodi');

        $this->studentUser = User::factory()->create();
        $this->studentUser->assignRole('Mahasiswa');

        $this->outsider = User::factory()->create();
        $this->outsider->assignRole('Mahasiswa');

        $faculty = Faculty::create(['name' => 'FK']);
        $program = Program::create(['faculty_id' => $faculty->id, 'code' => 'PSPD', 'name' => 'Pendidikan Dokter']);
        $stase = Stase::create([
            'program_id' => $program->id, 'code' => 'IPD', 'name' => 'Penyakit Dalam',
            'duration_weeks' => 4, 'passing_grade' => 70,
        ]);

        $this->exam = Exam::create([
            'name' => 'CBT IPD Batch 1',
            'type' => 'CBT',
            'stase_id' => $stase->id,
            'date' => now()->toDateString(),
            'duration_minutes' => 60,
            'passing_score' => 60,
            'status' => 'ONGOING',
        ]);

        $this->participant = ExamParticipant::create([
            'exam_id' => $this->exam->id,
            'student_id' => $this->studentUser->id,
        ]);
    }

    /** Buat 1 soal via API admin; return respons JSON data. */
    private function makeQuestion(string $text, int $points = 1): array
    {
        $res = $this->actingAs($this->admin)->postJson("/api/v1/examinations/{$this->exam->id}/questions", [
            'question_text' => $text,
            'points' => $points,
            'options' => [
                ['option_text' => 'Jawaban benar', 'is_correct' => true],
                ['option_text' => 'Jawaban salah A', 'is_correct' => false],
                ['option_text' => 'Jawaban salah B', 'is_correct' => false],
            ],
        ]);
        $res->assertCreated();

        return $res->json('data');
    }

    private function correctOptionId(array $question): string
    {
        return collect($question['options'])->firstWhere('is_correct', true)['id'];
    }

    private function wrongOptionId(array $question): string
    {
        return collect($question['options'])->firstWhere('is_correct', false)['id'];
    }

    public function test_student_cannot_manage_questions(): void
    {
        $this->actingAs($this->studentUser)
            ->postJson("/api/v1/examinations/{$this->exam->id}/questions", [
                'question_text' => 'Ilegal',
                'options' => [
                    ['option_text' => 'A', 'is_correct' => true],
                    ['option_text' => 'B', 'is_correct' => false],
                ],
            ])
            ->assertForbidden();
    }

    public function test_question_requires_exactly_one_correct_option(): void
    {
        $this->actingAs($this->admin)->postJson("/api/v1/examinations/{$this->exam->id}/questions", [
            'question_text' => 'Dua kunci?',
            'options' => [
                ['option_text' => 'A', 'is_correct' => true],
                ['option_text' => 'B', 'is_correct' => true],
            ],
        ])->assertStatus(422);
    }

    public function test_attempt_payload_never_leaks_answer_key(): void
    {
        $this->makeQuestion('Soal 1');

        $res = $this->actingAs($this->studentUser)
            ->postJson("/api/v1/examinations/{$this->exam->id}/attempt/start");

        $res->assertOk()->assertJsonPath('data.state', 'in_progress');
        $this->assertStringNotContainsString('is_correct', json_encode($res->json('data.questions')));
        $this->assertNotNull($res->json('data.deadline'));
    }

    public function test_non_participant_cannot_start(): void
    {
        $this->makeQuestion('Soal 1');

        $this->actingAs($this->outsider)
            ->postJson("/api/v1/examinations/{$this->exam->id}/attempt/start")
            ->assertForbidden();
    }

    public function test_auto_grading_computes_weighted_score(): void
    {
        $q1 = $this->makeQuestion('Soal 1 (1 poin)', 1);
        $q2 = $this->makeQuestion('Soal 2 (2 poin)', 2);
        $q3 = $this->makeQuestion('Soal 3 (1 poin)', 1);

        $this->actingAs($this->studentUser)
            ->postJson("/api/v1/examinations/{$this->exam->id}/attempt/start")
            ->assertOk();

        // Benar q1 (1) + benar q2 (2), salah q3 → 3/4 = 75
        foreach ([[$q1, true], [$q2, true], [$q3, false]] as [$q, $correct]) {
            $this->actingAs($this->studentUser)
                ->postJson("/api/v1/examinations/{$this->exam->id}/attempt/answer", [
                    'question_id' => $q['id'],
                    'option_id' => $correct ? $this->correctOptionId($q) : $this->wrongOptionId($q),
                ])->assertOk();
        }

        $res = $this->actingAs($this->studentUser)
            ->postJson("/api/v1/examinations/{$this->exam->id}/attempt/submit");

        $res->assertOk()
            ->assertJsonPath('data.state', 'finished')
            ->assertJsonPath('data.passed', true);
        $this->assertEquals(75.0, (float) $res->json('data.score'));
        $this->assertEquals(75.0, (float) $this->participant->fresh()->final_score);

        // Jawaban setelah submit terkunci
        $this->actingAs($this->studentUser)
            ->postJson("/api/v1/examinations/{$this->exam->id}/attempt/answer", [
                'question_id' => $q1['id'],
                'option_id' => $this->wrongOptionId($q1),
            ])->assertStatus(422);
    }

    public function test_deadline_enforced_and_auto_submits(): void
    {
        $q1 = $this->makeQuestion('Soal 1');

        $this->actingAs($this->studentUser)
            ->postJson("/api/v1/examinations/{$this->exam->id}/attempt/start")
            ->assertOk();

        // Mundurkan started_at melewati durasi + grace
        $this->participant->update(['started_at' => now()->subMinutes(61)->subSeconds(40)]);

        $this->actingAs($this->studentUser)
            ->postJson("/api/v1/examinations/{$this->exam->id}/attempt/answer", [
                'question_id' => $q1['id'],
                'option_id' => $this->correctOptionId($q1),
            ])->assertStatus(422);

        // State → auto-submit dengan jawaban yang ada (kosong → 0)
        $res = $this->actingAs($this->studentUser)
            ->getJson("/api/v1/examinations/{$this->exam->id}/attempt");

        $res->assertOk()->assertJsonPath('data.state', 'finished');
        $this->assertEquals(0.0, (float) $res->json('data.score'));
        $this->assertSame('SUBMITTED', $this->participant->fresh()->status);
    }

    public function test_questions_locked_after_any_answer_exists(): void
    {
        $q1 = $this->makeQuestion('Soal 1');

        $this->actingAs($this->studentUser)
            ->postJson("/api/v1/examinations/{$this->exam->id}/attempt/start")
            ->assertOk();
        $this->actingAs($this->studentUser)
            ->postJson("/api/v1/examinations/{$this->exam->id}/attempt/answer", [
                'question_id' => $q1['id'],
                'option_id' => $this->correctOptionId($q1),
            ])->assertOk();

        $this->actingAs($this->admin)
            ->postJson("/api/v1/examinations/{$this->exam->id}/questions", [
                'question_text' => 'Soal susulan',
                'options' => [
                    ['option_text' => 'A', 'is_correct' => true],
                    ['option_text' => 'B', 'is_correct' => false],
                ],
            ])->assertStatus(422);

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/examinations/{$this->exam->id}/questions/{$q1['id']}")
            ->assertStatus(422);

        $this->assertSame(1, ExamQuestion::where('exam_id', $this->exam->id)->count());
    }
}
