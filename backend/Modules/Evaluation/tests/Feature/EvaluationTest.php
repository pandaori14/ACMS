<?php

namespace Modules\Evaluation\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Academic\Models\Cohort;
use Modules\Academic\Models\Faculty;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Stase;
use Modules\Academic\Models\Student;
use Modules\Evaluation\Models\EvaluationQuestion;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationAssignment;
use Modules\Rotation\Models\RotationPeriod;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EvaluationTest extends TestCase
{
    use RefreshDatabase;

    protected $student;

    protected $assignment;

    protected $questions;

    protected function setUp(): void
    {
        parent::setUp();

        if (! Role::where('name', 'mahasiswa')->exists()) {
            Role::create(['name' => 'mahasiswa']);
        }

        $user = User::factory()->create();
        $user->assignRole('mahasiswa');

        $hospital = Hospital::create([
            'code' => 'RS-UGM',
            'name' => 'RS UGM',
            'type' => 'RS Pendidikan Utama',
        ]);

        $faculty = Faculty::create([
            'code' => 'FK-01',
            'name' => 'Fakultas Kedokteran',
            'status' => 'ACTIVE',
        ]);

        $program = Program::create([
            'faculty_id' => $faculty->id,
            'code' => 'PRD-01',
            'name' => 'Profesi Dokter',
            'level' => 'Profesi',
            'status' => 'ACTIVE',
        ]);
        $cohort = Cohort::create([
            'program_id' => $program->id,
            'name' => 'Angkatan 2026',
            'year' => 2026,
        ]);

        $this->student = Student::create([
            'user_id' => $user->id,
            'program_id' => $program->id,
            'cohort_id' => $cohort->id,
            'status' => 'ACTIVE',
            'enrollment_date' => now()->format('Y-m-d'),
        ]);

        $this->user = $user;
        $period = RotationPeriod::create([
            'program_id' => $program->id,
            'name' => 'Stase Anak',
            'start_date' => now()->subDays(10)->format('Y-m-d'),
            'end_date' => now()->addDays(10)->format('Y-m-d'),
            'status' => 'ACTIVE',
        ]);

        $stase = Stase::create([
            'program_id' => $program->id,
            'code' => 'ST-PD',
            'name' => 'Stase Penyakit Dalam',
            'credits' => 4,
            'duration_weeks' => 4,
            'passing_grade' => 70,
            'status' => 'ACTIVE',
        ]);

        $this->assignment = RotationAssignment::create([
            'student_id' => $this->student->id,
            'rotation_period_id' => $period->id,
            'hospital_id' => $hospital->id,
            'preceptor_id' => User::factory()->create()->id,
            'stase_id' => $stase->id,
            'status' => 'ACTIVE',
        ]);

        $this->questions = [
            EvaluationQuestion::create([
                'target_type' => 'App\Models\User',
                'question_text' => 'Bagaimana kualitas pengajaran preceptor?',
                'is_active' => true,
            ]),
            EvaluationQuestion::create([
                'target_type' => 'Modules\Rotation\Models\Hospital',
                'question_text' => 'Bagaimana fasilitas di Rumah Sakit?',
                'is_active' => true,
            ]),
        ];
    }

    public function test_can_fetch_evaluation_questions()
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/clinical/evaluations/questions');

        $response->assertStatus(200)
            ->assertJsonCount(2);
    }

    public function test_student_can_submit_evaluation()
    {
        $payload = [
            'rotation_assignment_id' => $this->assignment->id,
            'evaluations' => [
                [
                    'question_id' => $this->questions[0]->id,
                    'target_id' => $this->assignment->preceptor_id,
                    'target_type' => 'App\Models\User',
                    'rating' => 5,
                    'comment' => 'Sangat baik',
                ],
                [
                    'question_id' => $this->questions[1]->id,
                    'target_id' => $this->assignment->hospital_id,
                    'target_type' => 'Modules\Rotation\Models\Hospital',
                    'rating' => 4,
                    'comment' => 'Fasilitas memadai',
                ],
            ],
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/clinical/evaluations/submit', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Evaluasi berhasil disubmit. Terima kasih atas feedback Anda!');

        $this->assertDatabaseHas('evaluation_submissions', [
            'student_id' => $this->student->id,
            'evaluation_question_id' => $this->questions[0]->id,
            'rating' => 5,
        ]);
    }

    public function test_student_cannot_submit_twice()
    {
        $payload = [
            'rotation_assignment_id' => $this->assignment->id,
            'evaluations' => [
                [
                    'question_id' => $this->questions[0]->id,
                    'target_id' => $this->assignment->preceptor_id,
                    'target_type' => 'App\Models\User',
                    'rating' => 5,
                ],
            ],
        ];

        // First submit
        $this->actingAs($this->user)
            ->postJson('/api/v1/clinical/evaluations/submit', $payload);

        // Second submit
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/clinical/evaluations/submit', $payload);

        $response->assertStatus(400)
            ->assertJsonPath('error', 'Anda sudah melakukan evaluasi untuk stase ini.');
    }
}
