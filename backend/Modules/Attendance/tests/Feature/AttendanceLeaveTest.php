<?php

namespace Modules\Attendance\Tests\Feature;

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
 * Regresi Attendance — pengajuan izin/sakit oleh mahasiswa (flag review)
 * dan koreksi kehadiran (scoping Dodiknis vs admin).
 */
class AttendanceLeaveTest extends TestCase
{
    use RefreshDatabase;

    protected User $studentUser;

    protected User $preceptor;

    protected User $otherPreceptor;

    protected User $admin;

    protected Student $student;

    protected RotationAssignment $assignment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->studentUser = User::factory()->create();
        $this->studentUser->assignRole('Mahasiswa');

        $this->preceptor = User::factory()->create();
        $this->preceptor->assignRole('Dodiknis');

        $this->otherPreceptor = User::factory()->create();
        $this->otherPreceptor->assignRole('Dodiknis');

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin Prodi');

        $faculty = Faculty::create(['name' => 'FK']);
        $program = Program::create(['faculty_id' => $faculty->id, 'code' => 'PSPD', 'name' => 'Pendidikan Dokter']);
        $cohort = Cohort::create(['program_id' => $program->id, 'name' => '2026', 'year' => 2026]);
        $stase = Stase::create([
            'program_id' => $program->id, 'code' => 'IPD', 'name' => 'Penyakit Dalam',
            'duration_weeks' => 4, 'passing_grade' => 70,
        ]);
        $hospital = Hospital::create(['code' => 'RSA', 'name' => 'RS A', 'type' => 'Utama']);
        $period = RotationPeriod::create([
            'program_id' => $program->id, 'name' => 'Periode Berjalan',
            'start_date' => now()->subDays(7)->toDateString(),
            'end_date' => now()->addDays(21)->toDateString(),
            'status' => 'active',
        ]);

        $this->student = Student::create([
            'user_id' => $this->studentUser->id, 'program_id' => $program->id,
            'cohort_id' => $cohort->id, 'status' => 'active', 'enrollment_date' => '2026-01-01',
        ]);

        $this->assignment = RotationAssignment::create([
            'rotation_period_id' => $period->id, 'student_id' => $this->student->id,
            'stase_id' => $stase->id, 'hospital_id' => $hospital->id,
            'preceptor_id' => $this->preceptor->id, 'status' => 'in_progress',
        ]);
    }

    public function test_student_can_submit_sick_leave(): void
    {
        $res = $this->actingAs($this->studentUser)->postJson('/api/v1/clinical/attendance/leave', [
            'date' => now()->toDateString(),
            'type' => 'SICK',
            'notes' => 'Demam tinggi, ada surat dokter.',
        ]);

        $res->assertCreated()
            ->assertJsonPath('data.status', 'SICK')
            ->assertJsonPath('data.is_flagged', true);

        // Dobel pengajuan ditolak
        $this->actingAs($this->studentUser)->postJson('/api/v1/clinical/attendance/leave', [
            'date' => now()->toDateString(),
            'type' => 'LEAVE',
            'notes' => 'Coba lagi.',
        ])->assertStatus(422);
    }

    public function test_leave_outside_active_rotation_is_rejected(): void
    {
        $this->actingAs($this->studentUser)->postJson('/api/v1/clinical/attendance/leave', [
            'date' => now()->addMonths(6)->toDateString(),
            'type' => 'LEAVE',
            'notes' => 'Acara keluarga besar.',
        ])->assertStatus(422);
    }

    public function test_preceptor_can_correct_own_student_attendance(): void
    {
        $record = AttendanceRecord::create([
            'student_id' => $this->student->id,
            'rotation_assignment_id' => $this->assignment->id,
            'date' => now()->toDateString(),
            'status' => 'SICK',
            'is_flagged' => true,
            'flag_reason' => 'Pengajuan sakit — menunggu review',
        ]);

        $res = $this->actingAs($this->preceptor)->putJson("/api/v1/clinical/attendance/{$record->id}/correct", [
            'status' => 'SICK',
            'notes' => 'Surat dokter valid.',
        ]);

        $res->assertOk()->assertJsonPath('data.is_flagged', false);
    }

    public function test_other_preceptor_cannot_correct(): void
    {
        $record = AttendanceRecord::create([
            'student_id' => $this->student->id,
            'rotation_assignment_id' => $this->assignment->id,
            'date' => now()->toDateString(),
            'status' => 'LATE',
        ]);

        $this->actingAs($this->otherPreceptor)
            ->putJson("/api/v1/clinical/attendance/{$record->id}/correct", ['status' => 'PRESENT'])
            ->assertForbidden();

        // Admin boleh
        $this->actingAs($this->admin)
            ->putJson("/api/v1/clinical/attendance/{$record->id}/correct", ['status' => 'PRESENT'])
            ->assertOk();
    }

    public function test_student_cannot_correct_attendance(): void
    {
        $record = AttendanceRecord::create([
            'student_id' => $this->student->id,
            'rotation_assignment_id' => $this->assignment->id,
            'date' => now()->toDateString(),
            'status' => 'ABSENT',
        ]);

        $this->actingAs($this->studentUser)
            ->putJson("/api/v1/clinical/attendance/{$record->id}/correct", ['status' => 'PRESENT'])
            ->assertForbidden();
    }
}
