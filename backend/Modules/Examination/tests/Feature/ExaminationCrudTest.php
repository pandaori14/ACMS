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
use Modules\Examination\Models\ExamScore;
use Tests\TestCase;

/**
 * Regresi Examination — CRUD ujian dengan RBAC manage-examinations,
 * kunci status (COMPLETED terkunci, tipe hanya DRAFT), dan guard nilai
 * (ujian/peserta/stasiun bernilai tidak bisa dihapus).
 */
class ExaminationCrudTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;      // Admin Prodi — manage-examinations

    protected User $studentUser;

    protected Stase $stase;

    protected Exam $exam;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin Prodi');

        $this->studentUser = User::factory()->create();
        $this->studentUser->assignRole('Mahasiswa');

        $faculty = Faculty::create(['name' => 'FK']);
        $program = Program::create(['faculty_id' => $faculty->id, 'code' => 'PSPD', 'name' => 'Pendidikan Dokter']);
        $this->stase = Stase::create([
            'program_id' => $program->id, 'code' => 'IPD', 'name' => 'Penyakit Dalam',
            'duration_weeks' => 4, 'passing_grade' => 70,
        ]);

        $this->exam = Exam::create([
            'name' => 'OSCE IPD Batch 1',
            'type' => 'OSCE',
            'stase_id' => $this->stase->id,
            'date' => '2026-08-01',
            'status' => 'DRAFT',
        ]);
    }

    public function test_student_cannot_create_or_mutate_exam(): void
    {
        $this->actingAs($this->studentUser)->postJson('/api/v1/examinations', [
            'name' => 'Ujian Ilegal', 'type' => 'CBT', 'stase_id' => $this->stase->id, 'date' => '2026-08-01',
        ])->assertForbidden();

        $this->actingAs($this->studentUser)
            ->deleteJson("/api/v1/examinations/{$this->exam->id}")
            ->assertForbidden();
    }

    public function test_admin_can_create_exam_with_stations(): void
    {
        $res = $this->actingAs($this->admin)->postJson('/api/v1/examinations', [
            'name' => 'OSCE Bedah',
            'type' => 'OSCE',
            'stase_id' => $this->stase->id,
            'date' => '2026-09-01',
            'stations' => [
                ['name' => 'Anamnesis'],
                ['name' => 'Pemeriksaan Fisik'],
            ],
        ]);

        $res->assertCreated();
        $this->assertCount(2, $res->json('data.stations'));
    }

    public function test_admin_can_update_exam_and_completed_is_locked(): void
    {
        $this->actingAs($this->admin)
            ->putJson("/api/v1/examinations/{$this->exam->id}", ['name' => 'OSCE IPD Revisi'])
            ->assertOk()
            ->assertJsonPath('data.name', 'OSCE IPD Revisi');

        $this->exam->update(['status' => 'COMPLETED']);

        $this->actingAs($this->admin)
            ->putJson("/api/v1/examinations/{$this->exam->id}", ['name' => 'Coba Ubah'])
            ->assertStatus(422);
    }

    public function test_type_change_only_allowed_in_draft(): void
    {
        $this->exam->update(['status' => 'ONGOING']);

        $this->actingAs($this->admin)
            ->putJson("/api/v1/examinations/{$this->exam->id}", ['type' => 'CBT'])
            ->assertStatus(422);
    }

    public function test_exam_with_scores_cannot_be_deleted(): void
    {
        $participant = ExamParticipant::create([
            'exam_id' => $this->exam->id,
            'student_id' => $this->studentUser->id,
        ]);
        ExamScore::create([
            'exam_participant_id' => $participant->id,
            'assessor_id' => $this->admin->id,
            'score' => 80,
        ]);

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/examinations/{$this->exam->id}")
            ->assertStatus(422);

        // Peserta bernilai juga tidak bisa dikeluarkan
        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/examinations/{$this->exam->id}/participants/{$participant->id}")
            ->assertStatus(422);
    }

    public function test_admin_can_delete_exam_and_manage_participants(): void
    {
        $participant = ExamParticipant::create([
            'exam_id' => $this->exam->id,
            'student_id' => $this->studentUser->id,
        ]);

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/examinations/{$this->exam->id}/participants/{$participant->id}")
            ->assertOk();

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/examinations/{$this->exam->id}")
            ->assertOk();

        $this->assertSoftDeleted('exams', ['id' => $this->exam->id]);
    }

    public function test_admin_can_add_and_remove_station(): void
    {
        $res = $this->actingAs($this->admin)->postJson("/api/v1/examinations/{$this->exam->id}/stations", [
            'name' => 'Stasiun Resusitasi',
        ]);
        $res->assertCreated();
        $stationId = $res->json('data.id');

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/examinations/{$this->exam->id}/stations/{$stationId}")
            ->assertOk();
    }
}
