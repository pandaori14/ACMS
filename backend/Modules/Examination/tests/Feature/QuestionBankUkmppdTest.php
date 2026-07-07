<?php

namespace Modules\Examination\Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SystemReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Academic\Models\Cohort;
use Modules\Academic\Models\Faculty;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Stase;
use Modules\Academic\Models\Student;
use Modules\Examination\Models\Exam;
use Modules\Examination\Models\ExamAnswer;
use Modules\Examination\Models\ExamParticipant;
use Modules\Examination\Models\QuestionBankItem;
use Modules\Examination\Models\UkmppdResult;
use Tests\TestCase;

/**
 * P4a Examination: bank soal reusable (CRUD ter-RBAC, salin ke ujian dgn
 * lock fairness), randomisasi soal deterministik per peserta, dan tracking
 * UKMPPD (CRUD admin + riwayat/readiness mahasiswa).
 */
class QuestionBankUkmppdTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $studentUser;

    protected Stase $stase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(SystemReferenceSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin Prodi');

        $faculty = Faculty::create(['name' => 'FK']);
        $program = Program::create(['faculty_id' => $faculty->id, 'code' => 'PSPD', 'name' => 'Pendidikan Dokter']);
        $cohort = Cohort::create(['program_id' => $program->id, 'name' => '2026', 'year' => 2026]);
        $this->stase = Stase::create([
            'program_id' => $program->id, 'code' => 'IPD', 'name' => 'Penyakit Dalam',
            'duration_weeks' => 4, 'passing_grade' => 70,
        ]);

        $this->studentUser = User::factory()->create(['program_id' => $program->id]);
        $this->studentUser->assignRole('Mahasiswa');
        Student::create([
            'user_id' => $this->studentUser->id, 'program_id' => $program->id,
            'cohort_id' => $cohort->id, 'status' => 'active', 'enrollment_date' => '2026-01-01',
        ]);
    }

    private function bankItem(): QuestionBankItem
    {
        return QuestionBankItem::create([
            'stase_id' => $this->stase->id,
            'topic' => 'Endokrin',
            'difficulty' => 'medium',
            'question_text' => 'Terapi lini pertama DM tipe 2?',
            'options' => [
                ['option_text' => 'Metformin', 'is_correct' => true],
                ['option_text' => 'Insulin basal', 'is_correct' => false],
                ['option_text' => 'Sulfonilurea', 'is_correct' => false],
            ],
            'points' => 2,
            'created_by' => $this->admin->id,
        ]);
    }

    private function makeCbtExam(array $overrides = []): Exam
    {
        return Exam::create(array_merge([
            'name' => 'CBT IPD', 'type' => 'CBT', 'stase_id' => $this->stase->id,
            'date' => now()->toDateString(), 'duration_minutes' => 60,
            'status' => 'ONGOING',
        ], $overrides));
    }

    public function test_question_bank_crud_gated_and_working(): void
    {
        $payload = [
            'stase_id' => $this->stase->id,
            'question_text' => 'Terapi lini pertama DM tipe 2?',
            'difficulty' => 'medium',
            'options' => [
                ['option_text' => 'Metformin', 'is_correct' => true],
                ['option_text' => 'Insulin', 'is_correct' => false],
            ],
        ];

        $this->actingAs($this->studentUser)
            ->postJson('/api/v1/examinations/question-bank', $payload)
            ->assertForbidden();

        $this->actingAs($this->admin)
            ->postJson('/api/v1/examinations/question-bank', $payload)
            ->assertCreated();

        $res = $this->actingAs($this->admin)
            ->getJson('/api/v1/examinations/question-bank?search=DM tipe 2');
        $res->assertOk();
        $this->assertCount(1, $res->json('data'));
    }

    public function test_bank_rejects_multiple_correct_options(): void
    {
        $this->actingAs($this->admin)->postJson('/api/v1/examinations/question-bank', [
            'question_text' => 'Soal kunci ganda?',
            'options' => [
                ['option_text' => 'A', 'is_correct' => true],
                ['option_text' => 'B', 'is_correct' => true],
            ],
        ])->assertUnprocessable();
    }

    public function test_copy_from_bank_to_exam_and_lock_after_answers(): void
    {
        $item = $this->bankItem();
        $exam = $this->makeCbtExam();

        $res = $this->actingAs($this->admin)->postJson(
            "/api/v1/examinations/{$exam->id}/questions/from-bank",
            ['item_ids' => [$item->id]]
        );
        $res->assertOk()->assertJsonPath('data.copied', 1);

        $question = $exam->questions()->with('options')->first();
        $this->assertSame('Terapi lini pertama DM tipe 2?', $question->question_text);
        $this->assertSame(2, $question->points);
        $this->assertTrue((bool) $question->options->firstWhere('option_text', 'Metformin')->is_correct);

        // Ada jawaban peserta → salin lagi DITOLAK (fairness lock)
        $participant = ExamParticipant::create([
            'exam_id' => $exam->id, 'student_id' => $this->studentUser->id, 'status' => 'REGISTERED',
        ]);
        ExamAnswer::create([
            'exam_participant_id' => $participant->id,
            'exam_question_id' => $question->id,
            'exam_question_option_id' => $question->options->first()->id,
        ]);

        $this->actingAs($this->admin)->postJson(
            "/api/v1/examinations/{$exam->id}/questions/from-bank",
            ['item_ids' => [$item->id]]
        )->assertUnprocessable();
    }

    public function test_shuffle_is_deterministic_per_participant(): void
    {
        $exam = $this->makeCbtExam(['shuffle_questions' => true, 'shuffle_options' => true]);
        $item1 = $this->bankItem();
        $this->actingAs($this->admin)->postJson(
            "/api/v1/examinations/{$exam->id}/questions/from-bank",
            ['item_ids' => [$item1->id]]
        )->assertOk();
        // Tambah beberapa soal agar shuffle terlihat
        for ($i = 0; $i < 4; $i++) {
            $this->actingAs($this->admin)->postJson("/api/v1/examinations/{$exam->id}/questions", [
                'question_text' => "Soal nomor {$i}?",
                'options' => [
                    ['option_text' => 'Benar', 'is_correct' => true],
                    ['option_text' => 'Salah 1', 'is_correct' => false],
                    ['option_text' => 'Salah 2', 'is_correct' => false],
                ],
            ])->assertCreated();
        }

        ExamParticipant::create([
            'exam_id' => $exam->id, 'student_id' => $this->studentUser->id, 'status' => 'REGISTERED',
        ]);

        $this->actingAs($this->studentUser)
            ->postJson("/api/v1/examinations/{$exam->id}/attempt/start")
            ->assertOk();

        $first = $this->actingAs($this->studentUser)
            ->getJson("/api/v1/examinations/{$exam->id}/attempt")
            ->json('data.questions');
        $second = $this->actingAs($this->studentUser)
            ->getJson("/api/v1/examinations/{$exam->id}/attempt")
            ->json('data.questions');

        // Deterministik: reload TIDAK mengubah urutan
        $this->assertSame(
            collect($first)->pluck('id')->all(),
            collect($second)->pluck('id')->all()
        );
        $this->assertSame(
            collect($first[0]['options'])->pluck('id')->all(),
            collect($second[0]['options'])->pluck('id')->all()
        );
        // Kunci tidak bocor
        $this->assertArrayNotHasKey('is_correct', $first[0]['options'][0]);
    }

    public function test_ukmppd_crud_and_duplicate_attempt_rejected(): void
    {
        $payload = [
            'student_id' => $this->studentUser->id,
            'attempt_number' => 1,
            'exam_date' => '2026-08-01',
            'cbt_score' => 72.5,
            'osce_score' => 80,
            'status' => 'passed',
        ];

        $this->actingAs($this->studentUser)
            ->postJson('/api/v1/examinations/ukmppd', $payload)
            ->assertForbidden();

        $this->actingAs($this->admin)
            ->postJson('/api/v1/examinations/ukmppd', $payload)
            ->assertCreated();

        // Duplikat percobaan yang sama → 422
        $this->actingAs($this->admin)
            ->postJson('/api/v1/examinations/ukmppd', $payload)
            ->assertUnprocessable();

        $res = $this->actingAs($this->admin)->getJson('/api/v1/examinations/ukmppd');
        $res->assertOk()
            ->assertJsonPath('meta.passed', 1)
            ->assertJsonPath('meta.first_take_pass', 1);
    }

    public function test_student_sees_own_ukmppd_and_readiness(): void
    {
        UkmppdTestHelper::seedResult($this->studentUser->id);

        $res = $this->actingAs($this->studentUser)->getJson('/api/v1/examinations/ukmppd/my');

        $res->assertOk();
        $this->assertCount(1, $res->json('data.attempts'));
        // Belum ada nilai stase/CBT → readiness null tapi struktur ada
        $this->assertArrayHasKey('readiness', $res->json('data'));
    }
}

/** Helper kecil agar tes tetap ringkas. */
class UkmppdTestHelper
{
    public static function seedResult(string $userId): void
    {
        UkmppdResult::create([
            'student_id' => $userId,
            'attempt_number' => 1,
            'exam_date' => '2026-08-01',
            'cbt_score' => 65,
            'status' => 'failed',
        ]);
    }
}
