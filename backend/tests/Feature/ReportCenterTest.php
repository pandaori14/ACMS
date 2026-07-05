<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Academic\Models\Cohort;
use Modules\Academic\Models\Faculty;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Stase;
use Modules\Academic\Models\Student;
use Modules\Attendance\Models\AttendanceRecord;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationAssignment;
use Modules\Rotation\Models\RotationPeriod;
use Tests\TestCase;

/**
 * Regresi Pusat Laporan — gerbang permission tiap ekspor, TERMASUK
 * regresi celah keamanan export nilai (dulu terbuka utk semua user login).
 */
class ReportCenterTest extends TestCase
{
    use RefreshDatabase;

    protected User $kaprodi;

    protected User $studentUser;

    protected User $preceptor;

    protected User $otherPreceptor;

    protected Student $profile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->kaprodi = User::factory()->create();
        $this->kaprodi->assignRole('Kaprodi');

        $this->studentUser = User::factory()->create();
        $this->studentUser->assignRole('Mahasiswa');

        $this->preceptor = User::factory()->create();
        $this->preceptor->assignRole('Dodiknis');

        $this->otherPreceptor = User::factory()->create();
        $this->otherPreceptor->assignRole('Dodiknis');

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
            'start_date' => now()->subDays(7)->toDateString(),
            'end_date' => now()->addDays(21)->toDateString(),
            'status' => 'active',
        ]);

        $this->profile = Student::create([
            'user_id' => $this->studentUser->id, 'program_id' => $program->id,
            'cohort_id' => $cohort->id, 'status' => 'active', 'enrollment_date' => '2026-01-01',
        ]);

        $assignment = RotationAssignment::create([
            'rotation_period_id' => $period->id, 'student_id' => $this->profile->id,
            'stase_id' => $stase->id, 'hospital_id' => $hospital->id,
            'preceptor_id' => $this->preceptor->id, 'status' => 'in_progress',
        ]);

        AttendanceRecord::create([
            'student_id' => $this->profile->id,
            'rotation_assignment_id' => $assignment->id,
            'date' => now()->toDateString(),
            'status' => 'PRESENT',
        ]);
    }

    public function test_grades_export_is_no_longer_open_to_students(): void
    {
        // REGRESI CELAH: dulu 200 untuk mahasiswa (CSV nilai semua orang)
        $this->actingAs($this->studentUser)->get('/api/v1/grades/export')->assertForbidden();
        $this->actingAs($this->studentUser)->get('/api/v1/grades/export-cohort')->assertForbidden();

        $this->actingAs($this->kaprodi)->get('/api/v1/grades/export')->assertOk();
    }

    public function test_cohort_grades_export_downloads_xlsx(): void
    {
        $cohort = Cohort::first();

        $res = $this->actingAs($this->kaprodi)->get('/api/v1/grades/export-cohort?cohort_id='.$cohort->id);
        $res->assertOk();
        $this->assertStringContainsString('spreadsheet', $res->headers->get('content-type'));
    }

    public function test_attendance_export_scoped_and_gated(): void
    {
        // Mahasiswa tanpa permission → 403
        $this->actingAs($this->studentUser)
            ->get('/api/v1/clinical/attendance/recap/export')
            ->assertForbidden();

        // Dodiknis pembimbing → 200 (xlsx)
        $res = $this->actingAs($this->preceptor)->get('/api/v1/clinical/attendance/recap/export');
        $res->assertOk();
        $this->assertStringContainsString('spreadsheet', $res->headers->get('content-type'));
    }

    public function test_logbook_recap_export_scoping(): void
    {
        // Mahasiswa: miliknya sendiri, tanpa param → 200 PDF
        $res = $this->actingAs($this->studentUser)->get('/api/v1/clinical/logbooks/export');
        $res->assertOk();
        $this->assertStringContainsString('pdf', strtolower($res->headers->get('content-type')));

        // Dodiknis RS lain → 403
        $this->actingAs($this->otherPreceptor)
            ->getJson('/api/v1/clinical/logbooks/export?student_id='.$this->profile->id)
            ->assertForbidden();

        // Dodiknis pembimbing (RS sama) → butuh tautan hospital_user
        $this->preceptor->hospitals()->attach(Hospital::first()->id);
        $this->actingAs($this->preceptor)
            ->get('/api/v1/clinical/logbooks/export?student_id='.$this->profile->id)
            ->assertOk();
    }

    public function test_evaluation_and_incident_exports_gated(): void
    {
        $this->actingAs($this->studentUser)
            ->get('/api/v1/clinical/evaluations/report/export')
            ->assertForbidden();

        $this->actingAs($this->kaprodi)
            ->get('/api/v1/clinical/evaluations/report/export')
            ->assertOk();

        $this->actingAs($this->studentUser)
            ->get('/api/v1/incidents/statistics/export')
            ->assertForbidden();

        $res = $this->actingAs($this->kaprodi)->get('/api/v1/incidents/statistics/export');
        $res->assertOk();
        $this->assertStringContainsString('pdf', strtolower($res->headers->get('content-type')));
    }
}
