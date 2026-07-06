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
use Modules\Assessment\Jobs\CompileLogbookBookDocument;
use Modules\Assessment\Jobs\GenerateLetterDocument;
use Modules\Assessment\Models\AssessmentTemplate;
use Modules\Assessment\Models\ClinicalAssessment;
use Modules\Assessment\Models\GeneratedDocument;
use Modules\Assessment\Models\StaseGrade;
use Modules\Clinical\Models\LogbookEntry;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationAssignment;
use Modules\Rotation\Models\RotationPeriod;
use Tests\TestCase;

/**
 * Kelayakan yudisium: checklist per syarat, panel batch per angkatan
 * (RBAC manage-grades), surat keterangan formal (guard status), dan
 * kompilasi buku logbook.
 */
class YudisiumEligibilityTest extends TestCase
{
    use RefreshDatabase;

    protected User $studentUser;

    protected User $admin;

    protected Student $profile;

    protected Program $program;

    protected Cohort $cohort;

    protected Stase $stase;

    protected RotationAssignment $assignment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin Prodi');

        $faculty = Faculty::create(['name' => 'FK']);
        $this->program = Program::create(['faculty_id' => $faculty->id, 'code' => 'PSPD', 'name' => 'Pendidikan Dokter']);
        $this->cohort = Cohort::create(['program_id' => $this->program->id, 'name' => '2026', 'year' => 2026]);
        $this->stase = Stase::create([
            'program_id' => $this->program->id, 'code' => 'IPD', 'name' => 'Penyakit Dalam',
            'duration_weeks' => 4, 'passing_grade' => 70, 'is_mandatory' => true,
        ]);
        $hospital = Hospital::create(['code' => 'RSA', 'name' => 'RS A', 'type' => 'Utama']);
        $period = RotationPeriod::create([
            'program_id' => $this->program->id, 'name' => 'Periode 1',
            'start_date' => '2026-06-01', 'end_date' => '2026-06-28', 'status' => 'completed',
        ]);

        $this->studentUser = User::factory()->create(['program_id' => $this->program->id, 'identity_number' => 'J500260001']);
        $this->studentUser->assignRole('Mahasiswa');
        $this->profile = Student::create([
            'user_id' => $this->studentUser->id, 'program_id' => $this->program->id,
            'cohort_id' => $this->cohort->id, 'status' => 'active', 'enrollment_date' => '2026-01-01',
        ]);

        $this->assignment = RotationAssignment::create([
            'rotation_period_id' => $period->id, 'student_id' => $this->profile->id,
            'stase_id' => $this->stase->id, 'hospital_id' => $hospital->id, 'status' => 'completed',
        ]);
    }

    /** Lengkapi seluruh syarat kelulusan untuk mahasiswa uji. */
    private function satisfyAllRequirements(): void
    {
        StaseGrade::create([
            'rotation_assignment_id' => $this->assignment->id,
            'student_id' => $this->studentUser->id,
            'final_score' => 84.5, 'letter_grade' => 'A', 'status' => 'published',
        ]);

        LogbookEntry::create([
            'rotation_assignment_id' => $this->assignment->id,
            'student_id' => $this->profile->id,
            'activity_date' => '2026-06-05',
            'activity_type' => 'manajemen_kasus',
            'description' => 'Anamnesis dan tatalaksana pasien DM tipe 2.',
            'status' => 'verified',
        ]);

        foreach (['mini-cex', 'dops', 'cbd'] as $type) {
            $template = AssessmentTemplate::create([
                'type' => $type, 'name' => strtoupper($type).' Template',
                'rubric_schema' => ['items' => []], 'is_active' => true,
            ]);
            ClinicalAssessment::create([
                'rotation_assignment_id' => $this->assignment->id,
                'assessment_template_id' => $template->id,
                'student_id' => $this->studentUser->id,
                'preceptor_id' => $this->admin->id,
                'assessment_date' => '2026-06-10',
                'total_score' => 85,
                'status' => 'acknowledged',
                'acknowledged_at' => now(),
            ]);
        }
    }

    public function test_student_sees_own_eligibility_checklist(): void
    {
        $res = $this->actingAs($this->studentUser)->getJson('/api/v1/yudisium/eligibility');

        $res->assertOk()->assertJsonPath('data.eligible', false);
        $requirements = collect($res->json('data.requirements'));
        $this->assertSame(5, $requirements->count());
        // Nilai stase wajib belum ada → gagal
        $this->assertFalse($requirements->firstWhere('key', 'stase_lulus')['passed']);
    }

    public function test_eligible_when_all_requirements_met(): void
    {
        $this->satisfyAllRequirements();

        $res = $this->actingAs($this->studentUser)->getJson('/api/v1/yudisium/eligibility');

        $res->assertOk()->assertJsonPath('data.eligible', true);
    }

    public function test_pending_logbook_blocks_eligibility(): void
    {
        $this->satisfyAllRequirements();

        LogbookEntry::create([
            'rotation_assignment_id' => $this->assignment->id,
            'student_id' => $this->profile->id,
            'activity_date' => '2026-06-06',
            'activity_type' => 'manajemen_kasus',
            'description' => 'Entri menggantung menunggu verifikasi preceptor.',
            'status' => 'submitted',
        ]);

        $res = $this->actingAs($this->studentUser)->getJson('/api/v1/yudisium/eligibility');

        $res->assertOk()->assertJsonPath('data.eligible', false);
        $logbook = collect($res->json('data.requirements'))->firstWhere('key', 'logbook_bersih');
        $this->assertFalse($logbook['passed']);
    }

    public function test_batch_eligibility_requires_manage_grades(): void
    {
        $this->actingAs($this->studentUser)
            ->getJson('/api/v1/yudisium/eligibility-batch?cohort_id='.$this->cohort->id)
            ->assertForbidden();

        $this->satisfyAllRequirements();

        $res = $this->actingAs($this->admin)
            ->getJson('/api/v1/yudisium/eligibility-batch?cohort_id='.$this->cohort->id);

        $res->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.eligible', 1)
            ->assertJsonPath('data.students.0.nim', 'J500260001');
    }

    public function test_letter_guard_by_student_status(): void
    {
        Queue::fake();

        // Aktif → surat aktif boleh
        $this->actingAs($this->studentUser)
            ->postJson('/api/v1/yudisium/generate-letter', ['letter_type' => 'active'])
            ->assertStatus(202);
        Queue::assertPushed(GenerateLetterDocument::class);

        // Aktif → surat lulus DITOLAK
        $this->actingAs($this->studentUser)
            ->postJson('/api/v1/yudisium/generate-letter', ['letter_type' => 'graduated'])
            ->assertStatus(422);

        // Lulus → surat lulus boleh
        $this->profile->update(['status' => 'graduated']);
        $this->actingAs($this->studentUser)
            ->postJson('/api/v1/yudisium/generate-letter', ['letter_type' => 'graduated'])
            ->assertStatus(202);
    }

    public function test_letter_job_produces_numbered_pdf(): void
    {
        Storage::fake('local');

        $document = GeneratedDocument::create([
            'user_id' => $this->studentUser->id,
            'type' => 'letter_active',
            'status' => 'processing',
            'verification_code' => str_repeat('d', 40),
        ]);

        (new GenerateLetterDocument($document->id))->handle();

        $document->refresh();
        $this->assertSame('ready', $document->status);
        Storage::assertExists($document->file_path);
        $this->assertStringContainsString('SKA/ACMS-FK', $document->meta['letter_number']);
    }

    public function test_logbook_book_job_produces_pdf(): void
    {
        Storage::fake('local');
        $this->satisfyAllRequirements();

        $document = GeneratedDocument::create([
            'user_id' => $this->studentUser->id,
            'type' => 'logbook_book',
            'status' => 'processing',
            'verification_code' => str_repeat('e', 40),
        ]);

        (new CompileLogbookBookDocument($document->id))->handle();

        $document->refresh();
        $this->assertSame('ready', $document->status);
        Storage::assertExists($document->file_path);
        $this->assertSame(1, $document->meta['entry_count']);
    }

    public function test_generate_logbook_book_dispatches_job(): void
    {
        Queue::fake();

        $this->actingAs($this->studentUser)
            ->postJson('/api/v1/yudisium/generate-logbook-book')
            ->assertStatus(202);

        Queue::assertPushed(CompileLogbookBookDocument::class);
    }
}
