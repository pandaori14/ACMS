<?php

namespace Modules\Clinical\Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Academic\Models\Cohort;
use Modules\Academic\Models\Competency;
use Modules\Academic\Models\Faculty;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Stase;
use Modules\Academic\Models\Student;
use Modules\Clinical\Models\LogbookEntry;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationAssignment;
use Modules\Rotation\Models\RotationPeriod;
use Tests\TestCase;

/**
 * Regresi tracking kompetensi — hanya logbook VERIFIED yang dihitung,
 * fulfilled saat capaian ≥ min_cases, dan scoping per-peran.
 */
class CompetencyProgressTest extends TestCase
{
    use RefreshDatabase;

    protected User $studentUser;

    protected User $otherStudentUser;

    protected User $preceptor;      // Dodiknis RS yang sesuai

    protected User $otherPreceptor; // Dodiknis RS lain

    protected Student $profile;

    protected Competency $competency;

    protected RotationAssignment $assignment;

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
        $otherHospital = Hospital::create(['code' => 'RSB', 'name' => 'RS B', 'type' => 'Satelit']);
        $period = RotationPeriod::create([
            'program_id' => $program->id, 'name' => 'Periode 1',
            'start_date' => now()->subDays(7)->toDateString(),
            'end_date' => now()->addDays(21)->toDateString(),
            'status' => 'active',
        ]);

        $this->competency = Competency::create([
            'name' => 'Anamnesis Pasien Diabetes',
            'type' => 'skill',
            'level' => '4A',
            'stase_id' => $stase->id,
            'min_cases' => 2,
        ]);

        $this->studentUser = User::factory()->create();
        $this->studentUser->assignRole('Mahasiswa');
        $this->profile = Student::create([
            'user_id' => $this->studentUser->id, 'program_id' => $program->id,
            'cohort_id' => $cohort->id, 'status' => 'active', 'enrollment_date' => '2026-01-01',
        ]);

        $this->otherStudentUser = User::factory()->create();
        $this->otherStudentUser->assignRole('Mahasiswa');
        Student::create([
            'user_id' => $this->otherStudentUser->id, 'program_id' => $program->id,
            'cohort_id' => $cohort->id, 'status' => 'active', 'enrollment_date' => '2026-01-01',
        ]);

        $this->assignment = RotationAssignment::create([
            'rotation_period_id' => $period->id, 'student_id' => $this->profile->id,
            'stase_id' => $stase->id, 'hospital_id' => $hospital->id, 'status' => 'in_progress',
        ]);

        $this->preceptor = User::factory()->create();
        $this->preceptor->assignRole('Dodiknis');
        $this->preceptor->hospitals()->attach($hospital->id);

        $this->otherPreceptor = User::factory()->create();
        $this->otherPreceptor->assignRole('Dodiknis');
        $this->otherPreceptor->hospitals()->attach($otherHospital->id);
    }

    private function makeLogbook(string $status): LogbookEntry
    {
        return LogbookEntry::create([
            'rotation_assignment_id' => $this->assignment->id,
            'student_id' => $this->profile->id,
            'activity_date' => now()->toDateString(),
            'activity_type' => 'case',
            'description' => 'Anamnesis pasien DM tipe 2 dengan komplikasi neuropati.',
            'competency_id' => $this->competency->id,
            'status' => $status,
        ]);
    }

    public function test_only_verified_logbooks_count_toward_progress(): void
    {
        $this->makeLogbook('verified');
        $this->makeLogbook('submitted'); // tidak dihitung
        $this->makeLogbook('draft');     // tidak dihitung

        $res = $this->actingAs($this->studentUser)->getJson('/api/v1/clinical/competency-progress');

        $res->assertOk()
            ->assertJsonPath('data.stases.0.competencies.0.achieved', 1)
            ->assertJsonPath('data.stases.0.competencies.0.min_cases', 2)
            ->assertJsonPath('data.stases.0.competencies.0.fulfilled', false)
            ->assertJsonPath('data.overall.percent', 0);
    }

    public function test_fulfilled_when_achieved_reaches_min_cases(): void
    {
        $this->makeLogbook('verified');
        $this->makeLogbook('verified');

        $res = $this->actingAs($this->studentUser)->getJson('/api/v1/clinical/competency-progress');

        $res->assertOk()
            ->assertJsonPath('data.stases.0.competencies.0.achieved', 2)
            ->assertJsonPath('data.stases.0.competencies.0.fulfilled', true)
            ->assertJsonPath('data.overall.percent', 100);
    }

    public function test_student_always_sees_own_progress_only(): void
    {
        // Mahasiswa lain meminta progres — param student_id diabaikan, dapat miliknya (kosong)
        $res = $this->actingAs($this->otherStudentUser)
            ->getJson('/api/v1/clinical/competency-progress?student_id='.$this->profile->id);

        $res->assertOk();
        $this->assertNotSame(
            $this->profile->id,
            $res->json('data.student.id'),
            'Mahasiswa tidak boleh melihat progres mahasiswa lain.'
        );
    }

    public function test_dodiknis_scoped_to_own_hospital(): void
    {
        $this->makeLogbook('verified');

        // Dodiknis RS yang sesuai → boleh
        $this->actingAs($this->preceptor)
            ->getJson('/api/v1/clinical/competency-progress?student_id='.$this->profile->id)
            ->assertOk()
            ->assertJsonPath('data.student.id', $this->profile->id);

        // Dodiknis RS lain → ditolak
        $this->actingAs($this->otherPreceptor)
            ->getJson('/api/v1/clinical/competency-progress?student_id='.$this->profile->id)
            ->assertForbidden();
    }
}
