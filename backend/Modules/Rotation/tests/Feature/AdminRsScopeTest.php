<?php

namespace Modules\Rotation\Tests\Feature;

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
 * Regresi perjalanan Admin RS — semua data ter-scope ke rumah sakitnya:
 * penempatan, rekap presensi, dan mutasi data RS.
 */
class AdminRsScopeTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminRs;      // tertaut RS A

    protected Hospital $myHospital;

    protected Hospital $otherHospital;

    protected RotationAssignment $myAssignment;

    protected RotationAssignment $otherAssignment;

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
        $this->myHospital = Hospital::create(['code' => 'RSA', 'name' => 'RS A', 'type' => 'Utama']);
        $this->otherHospital = Hospital::create(['code' => 'RSB', 'name' => 'RS B', 'type' => 'Satelit']);
        $period = RotationPeriod::create([
            'program_id' => $program->id, 'name' => 'Periode 1',
            'start_date' => now()->subDays(7)->toDateString(),
            'end_date' => now()->addDays(21)->toDateString(),
            'status' => 'active',
        ]);

        $this->adminRs = User::factory()->create();
        $this->adminRs->assignRole('Admin RS');
        $this->adminRs->hospitals()->attach($this->myHospital->id);

        // Dua mahasiswa: satu di RS A, satu di RS B
        foreach ([['RSA', $this->myHospital], ['RSB', $this->otherHospital]] as [$tag, $hospital]) {
            $u = User::factory()->create();
            $u->assignRole('Mahasiswa');
            $profile = Student::create([
                'user_id' => $u->id, 'program_id' => $program->id,
                'cohort_id' => $cohort->id, 'status' => 'active', 'enrollment_date' => '2026-01-01',
            ]);
            $assignment = RotationAssignment::create([
                'rotation_period_id' => $period->id, 'student_id' => $profile->id,
                'stase_id' => $stase->id, 'hospital_id' => $hospital->id, 'status' => 'in_progress',
            ]);
            if ($tag === 'RSA') {
                $this->myAssignment = $assignment;
            } else {
                $this->otherAssignment = $assignment;
            }
        }
    }

    public function test_assignments_scoped_to_own_hospital(): void
    {
        $res = $this->actingAs($this->adminRs)->getJson('/api/v1/rotation/assignments');

        $res->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.hospital_id', $this->myHospital->id);
    }

    public function test_attendance_recap_scoped_to_own_hospital(): void
    {
        AttendanceRecord::create([
            'student_id' => $this->myAssignment->student_id,
            'rotation_assignment_id' => $this->myAssignment->id,
            'date' => now()->toDateString(),
            'status' => 'PRESENT',
        ]);
        AttendanceRecord::create([
            'student_id' => $this->otherAssignment->student_id,
            'rotation_assignment_id' => $this->otherAssignment->id,
            'date' => now()->toDateString(),
            'status' => 'PRESENT',
        ]);

        $res = $this->actingAs($this->adminRs)->getJson('/api/v1/clinical/attendance/recap');

        $res->assertOk()->assertJsonPath('meta.total', 1);
    }

    public function test_can_update_own_hospital_only(): void
    {
        $payload = ['code' => 'RSA', 'name' => 'RS A Diperbarui', 'type' => 'Utama'];

        $this->actingAs($this->adminRs)
            ->putJson("/api/v1/rotation/hospitals/{$this->myHospital->id}", $payload)
            ->assertOk();

        $this->actingAs($this->adminRs)
            ->putJson("/api/v1/rotation/hospitals/{$this->otherHospital->id}", [
                'code' => 'RSB', 'name' => 'Coba Ubah', 'type' => 'Satelit',
            ])
            ->assertForbidden();
    }

    public function test_cannot_create_or_delete_hospitals(): void
    {
        $this->actingAs($this->adminRs)->postJson('/api/v1/rotation/hospitals', [
            'code' => 'RSC', 'name' => 'RS Baru', 'type' => 'Afiliasi',
        ])->assertForbidden();

        $this->actingAs($this->adminRs)
            ->deleteJson("/api/v1/rotation/hospitals/{$this->otherHospital->id}")
            ->assertForbidden();
    }
}
