<?php

namespace Modules\Assessment\Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Modules\Academic\Models\Cohort;
use Modules\Academic\Models\Faculty;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Stase;
use Modules\Academic\Models\Student;
use Modules\Assessment\Jobs\GenerateTranscriptDocument;
use Modules\Assessment\Models\GeneratedDocument;
use Modules\Assessment\Models\StaseGrade;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationAssignment;
use Modules\Rotation\Models\RotationPeriod;
use Tests\TestCase;

/**
 * Regresi Yudisium — generate dokumen resmi (job queue), unduh aman,
 * dan verifikasi publik via kode QR (tanpa login).
 */
class YudisiumTest extends TestCase
{
    use RefreshDatabase;

    protected User $studentUser;

    protected User $otherStudent;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

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
            'start_date' => '2026-06-01', 'end_date' => '2026-06-28', 'status' => 'completed',
        ]);

        $this->studentUser = User::factory()->create(['program_id' => $program->id, 'identity_number' => 'J500260001']);
        $this->studentUser->assignRole('Mahasiswa');
        $profile = Student::create([
            'user_id' => $this->studentUser->id, 'program_id' => $program->id,
            'cohort_id' => $cohort->id, 'status' => 'active', 'enrollment_date' => '2026-01-01',
        ]);

        $this->otherStudent = User::factory()->create();
        $this->otherStudent->assignRole('Mahasiswa');

        $assignment = RotationAssignment::create([
            'rotation_period_id' => $period->id, 'student_id' => $profile->id,
            'stase_id' => $stase->id, 'hospital_id' => $hospital->id, 'status' => 'completed',
        ]);
        StaseGrade::create([
            'rotation_assignment_id' => $assignment->id,
            'student_id' => $this->studentUser->id,
            'logbook_score' => 90, 'minicex_score' => 85, 'dops_score' => 80, 'cbd_score' => 82,
            'final_score' => 84.5, 'letter_grade' => 'A', 'status' => 'published',
        ]);
    }

    public function test_generate_creates_document_and_dispatches_job(): void
    {
        Queue::fake();

        $res = $this->actingAs($this->studentUser)->postJson('/api/v1/yudisium/generate');

        $res->assertStatus(202);
        $this->assertDatabaseHas('generated_documents', [
            'user_id' => $this->studentUser->id,
            'status' => 'processing',
        ]);
        Queue::assertPushed(GenerateTranscriptDocument::class);
    }

    public function test_job_produces_pdf_and_marks_ready(): void
    {
        Storage::fake('local');

        $document = GeneratedDocument::create([
            'user_id' => $this->studentUser->id,
            'type' => 'transcript',
            'status' => 'processing',
            'verification_code' => str_repeat('a', 40),
        ]);

        (new GenerateTranscriptDocument($document->id))->handle();

        $document->refresh();
        $this->assertSame('ready', $document->status);
        $this->assertNotNull($document->file_path);
        Storage::assertExists($document->file_path);
        $this->assertSame('J500260001', $document->meta['nim']);
        $this->assertEquals(84.5, $document->meta['average']);
    }

    public function test_download_owner_only_for_students(): void
    {
        Storage::fake('local');
        Storage::put('documents/x/test.pdf', '%PDF-1.4 test');

        $document = GeneratedDocument::create([
            'user_id' => $this->studentUser->id,
            'type' => 'transcript',
            'status' => 'ready',
            'file_path' => 'documents/x/test.pdf',
            'verification_code' => str_repeat('b', 40),
            'meta' => ['name' => 'Tester'],
        ]);

        $this->actingAs($this->studentUser)
            ->get("/api/v1/yudisium/documents/{$document->id}/download")
            ->assertOk();

        $this->actingAs($this->otherStudent)
            ->getJson("/api/v1/yudisium/documents/{$document->id}/download")
            ->assertForbidden();
    }

    public function test_public_verify_returns_masked_data_without_login(): void
    {
        GeneratedDocument::create([
            'user_id' => $this->studentUser->id,
            'type' => 'transcript',
            'status' => 'ready',
            'file_path' => 'documents/x/y.pdf',
            'verification_code' => str_repeat('c', 40),
            'meta' => ['name' => 'Koass Budi', 'nim' => 'J500260001', 'program' => 'Pendidikan Dokter', 'average' => 84.5, 'stase_count' => 1],
        ]);

        // TANPA login
        $res = $this->getJson('/api/public/verify-document/'.str_repeat('c', 40));
        $res->assertOk()
            ->assertJsonPath('valid', true)
            ->assertJsonPath('name', 'Koass Budi')
            ->assertJsonPath('nim_masked', '••••••0001');

        $this->getJson('/api/public/verify-document/kode-ngawur')
            ->assertOk()
            ->assertJsonPath('valid', false);
    }

    public function test_generate_is_rate_limited(): void
    {
        Queue::fake();

        for ($i = 0; $i < 3; $i++) {
            $this->actingAs($this->studentUser)->postJson('/api/v1/yudisium/generate')->assertStatus(202);
        }

        $this->actingAs($this->studentUser)->postJson('/api/v1/yudisium/generate')->assertStatus(429);
    }
}
