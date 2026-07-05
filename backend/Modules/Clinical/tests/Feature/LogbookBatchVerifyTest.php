<?php

namespace Modules\Clinical\Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Academic\Models\Cohort;
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
 * Regresi verifikasi logbook MASSAL — guard per-entri (RS & status)
 * dilaporkan sebagai skipped, sisanya terverifikasi.
 */
class LogbookBatchVerifyTest extends TestCase
{
    use RefreshDatabase;

    protected User $preceptor;

    protected User $studentUser;

    protected RotationAssignment $myAssignment;

    protected RotationAssignment $otherAssignment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->preceptor = User::factory()->create();
        $this->preceptor->assignRole('Dodiknis');

        $this->studentUser = User::factory()->create();
        $this->studentUser->assignRole('Mahasiswa');

        $faculty = Faculty::create(['name' => 'FK']);
        $program = Program::create(['faculty_id' => $faculty->id, 'code' => 'PSPD', 'name' => 'Pendidikan Dokter']);
        $cohort = Cohort::create(['program_id' => $program->id, 'name' => '2026', 'year' => 2026]);
        $stase = Stase::create([
            'program_id' => $program->id, 'code' => 'IPD', 'name' => 'Penyakit Dalam',
            'duration_weeks' => 4, 'passing_grade' => 70,
        ]);
        $myHospital = Hospital::create(['code' => 'RSA', 'name' => 'RS A', 'type' => 'Utama']);
        $otherHospital = Hospital::create(['code' => 'RSB', 'name' => 'RS B', 'type' => 'Satelit']);
        $period = RotationPeriod::create([
            'program_id' => $program->id, 'name' => 'Periode 1',
            'start_date' => now()->subDays(7)->toDateString(),
            'end_date' => now()->addDays(21)->toDateString(),
            'status' => 'active',
        ]);

        $this->preceptor->hospitals()->attach($myHospital->id);

        $profile = Student::create([
            'user_id' => $this->studentUser->id, 'program_id' => $program->id,
            'cohort_id' => $cohort->id, 'status' => 'active', 'enrollment_date' => '2026-01-01',
        ]);

        $this->myAssignment = RotationAssignment::create([
            'rotation_period_id' => $period->id, 'student_id' => $profile->id,
            'stase_id' => $stase->id, 'hospital_id' => $myHospital->id, 'status' => 'in_progress',
        ]);

        // Mahasiswa lain di RS lain (di luar cakupan preceptor)
        $otherUser = User::factory()->create();
        $otherUser->assignRole('Mahasiswa');
        $otherProfile = Student::create([
            'user_id' => $otherUser->id, 'program_id' => $program->id,
            'cohort_id' => $cohort->id, 'status' => 'active', 'enrollment_date' => '2026-01-01',
        ]);
        $this->otherAssignment = RotationAssignment::create([
            'rotation_period_id' => $period->id, 'student_id' => $otherProfile->id,
            'stase_id' => $stase->id, 'hospital_id' => $otherHospital->id, 'status' => 'in_progress',
        ]);
    }

    private function makeEntry(RotationAssignment $assignment, string $status = 'submitted'): LogbookEntry
    {
        return LogbookEntry::create([
            'rotation_assignment_id' => $assignment->id,
            'student_id' => $assignment->student_id,
            'activity_date' => now()->toDateString(),
            'activity_type' => 'case',
            'description' => 'Kegiatan klinis untuk pengujian verifikasi massal.',
            'status' => $status,
        ]);
    }

    public function test_batch_verifies_own_and_skips_out_of_scope(): void
    {
        $mine1 = $this->makeEntry($this->myAssignment);
        $mine2 = $this->makeEntry($this->myAssignment);
        $otherHospitalEntry = $this->makeEntry($this->otherAssignment); // RS lain → skipped
        $draftEntry = $this->makeEntry($this->myAssignment, 'draft');   // bukan submitted → skipped

        $res = $this->actingAs($this->preceptor)->postJson('/api/v1/clinical/logbooks/batch-verify', [
            'ids' => [$mine1->id, $mine2->id, $otherHospitalEntry->id, $draftEntry->id],
            'preceptor_feedback' => 'Diverifikasi kolektif — kegiatan sesuai.',
        ]);

        $res->assertOk()->assertJsonPath('data.verified', 2);
        $this->assertCount(2, $res->json('data.skipped'));

        $this->assertSame('verified', $mine1->fresh()->status);
        $this->assertSame('verified', $mine2->fresh()->status);
        $this->assertSame('submitted', $otherHospitalEntry->fresh()->status);
        $this->assertSame('draft', $draftEntry->fresh()->status);
        $this->assertSame('Diverifikasi kolektif — kegiatan sesuai.', $mine1->fresh()->preceptor_feedback);
    }

    public function test_student_cannot_batch_verify(): void
    {
        $entry = $this->makeEntry($this->myAssignment);

        $this->actingAs($this->studentUser)->postJson('/api/v1/clinical/logbooks/batch-verify', [
            'ids' => [$entry->id],
        ])->assertForbidden();
    }
}
