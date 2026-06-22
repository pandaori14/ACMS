<?php

namespace Modules\Attendance\Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Academic\Models\Cohort;
use Modules\Academic\Models\Faculty;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Stase;
use Modules\Academic\Models\Student;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationAssignment;
use Modules\Rotation\Models\RotationPeriod;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AttendanceTest extends TestCase
{
    use RefreshDatabase;

    protected $student;

    protected $hospital;

    protected $assignment;

    protected function setUp(): void
    {
        parent::setUp();

        // Setup Roles
        if (! Role::where('name', 'mahasiswa')->exists()) {
            Role::create(['name' => 'mahasiswa']);
        }

        // User creation moved down

        $this->hospital = Hospital::create([
            'code' => 'RS-UGM',
            'name' => 'RS UGM',
            'type' => 'RS Pendidikan Utama',
            'latitude' => -7.7699,
            'longitude' => 110.3779,
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

        $user = User::factory()->create();
        $user->assignRole('mahasiswa');

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
            'name' => 'Stase Penyakit Dalam - Periode 1',
            'start_date' => now()->subDays(5)->format('Y-m-d'),
            'end_date' => now()->addDays(20)->format('Y-m-d'),
            'status' => 'ACTIVE',
        ]);

        // Mock preceptor
        $preceptor = User::factory()->create();

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
            'hospital_id' => $this->hospital->id,
            'preceptor_id' => $preceptor->id,
            'stase_id' => $stase->id,
            'status' => 'ACTIVE',
        ]);
    }

    public function test_student_can_check_in_within_radius()
    {
        // Coordinate close to RS UGM (distance < 100m)
        $payload = [
            'rotation_assignment_id' => $this->assignment->id,
            'latitude' => -7.76991,
            'longitude' => 110.37791,
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/clinical/attendance/check-in', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Check-in berhasil!');

        $this->assertDatabaseHas('attendance_records', [
            'student_id' => $this->student->id,
            'rotation_assignment_id' => $this->assignment->id,
            'status' => 'PRESENT',
        ]);
    }

    public function test_student_cannot_check_in_outside_radius()
    {
        Setting::updateOrCreate(['key' => 'require_location_clockin'], ['value' => 'true', 'type' => 'boolean']);
        Setting::clearCache();

        // Coordinate far from RS UGM (e.g. Jakarta)
        $payload = [
            'rotation_assignment_id' => $this->assignment->id,
            'latitude' => -6.2088,
            'longitude' => 106.8456,
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/clinical/attendance/check-in', $payload);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Anda berada di luar radius Rumah Sakit.');

        $this->assertDatabaseMissing('attendance_records', [
            'student_id' => $this->student->id,
            'status' => 'PRESENT',
        ]);
    }

    public function test_student_cannot_check_in_twice_in_one_day()
    {
        $payload = [
            'rotation_assignment_id' => $this->assignment->id,
            'latitude' => -7.7699,
            'longitude' => 110.3779,
        ];

        $this->actingAs($this->user)
            ->postJson('/api/v1/clinical/attendance/check-in', $payload);

        // Second attempt
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/clinical/attendance/check-in', $payload);

        $response->assertStatus(400)
            ->assertJsonPath('message', 'Anda sudah melakukan check-in hari ini.');
    }
}
