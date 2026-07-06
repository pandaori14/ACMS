<?php

namespace Modules\Academic\Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SystemReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Academic\Models\AcademicEvent;
use Modules\Academic\Models\Cohort;
use Modules\Academic\Models\Faculty;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Student;
use Tests\TestCase;

/**
 * Kalender Akademik + siklus status mahasiswa: CRUD event ter-RBAC,
 * tipe event dari system_references, transisi status ber-alasan + audit.
 */
class AcademicCalendarTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $studentUser;

    protected Student $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(SystemReferenceSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin Prodi');

        $this->studentUser = User::factory()->create();
        $this->studentUser->assignRole('Mahasiswa');

        $faculty = Faculty::create(['name' => 'FK']);
        $program = Program::create(['faculty_id' => $faculty->id, 'code' => 'PSPD', 'name' => 'Pendidikan Dokter']);
        $cohort = Cohort::create(['program_id' => $program->id, 'name' => '2026', 'year' => 2026]);
        $this->student = Student::create([
            'user_id' => $this->studentUser->id,
            'program_id' => $program->id,
            'cohort_id' => $cohort->id,
            'status' => 'active',
            'enrollment_date' => '2026-01-01',
        ]);
    }

    public function test_admin_can_create_and_list_calendar_events(): void
    {
        $this->actingAs($this->admin)->postJson('/api/v1/academic/calendar', [
            'title' => 'Libur Idul Adha',
            'event_type' => 'holiday',
            'start_date' => '2026-08-01',
            'end_date' => '2026-08-03',
        ])->assertCreated();

        $res = $this->actingAs($this->studentUser)
            ->getJson('/api/v1/academic/calendar?from=2026-08-01&to=2026-08-31');

        $res->assertOk();
        $this->assertCount(1, $res->json('data'));
    }

    public function test_student_cannot_mutate_calendar(): void
    {
        $this->actingAs($this->studentUser)->postJson('/api/v1/academic/calendar', [
            'title' => 'X', 'event_type' => 'holiday',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-02',
        ])->assertForbidden();
    }

    public function test_invalid_event_type_rejected(): void
    {
        $this->actingAs($this->admin)->postJson('/api/v1/academic/calendar', [
            'title' => 'X', 'event_type' => 'tipe_ngawur',
            'start_date' => '2026-08-01', 'end_date' => '2026-08-02',
        ])->assertUnprocessable();
    }

    public function test_end_date_must_not_precede_start_date(): void
    {
        $this->actingAs($this->admin)->postJson('/api/v1/academic/calendar', [
            'title' => 'X', 'event_type' => 'holiday',
            'start_date' => '2026-08-05', 'end_date' => '2026-08-01',
        ])->assertUnprocessable();
    }

    public function test_admin_can_change_student_status_with_reason(): void
    {
        $res = $this->actingAs($this->admin)
            ->postJson("/api/v1/academic/students/{$this->student->id}/status", [
                'status' => 'leave',
                'reason' => 'Cuti melahirkan satu semester.',
            ]);

        $res->assertOk();
        $this->assertSame('leave', $this->student->fresh()->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'student.status_changed']);
    }

    public function test_status_change_requires_reason_and_valid_status(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/academic/students/{$this->student->id}/status", [
                'status' => 'leave',
            ])->assertUnprocessable();

        $this->actingAs($this->admin)
            ->postJson("/api/v1/academic/students/{$this->student->id}/status", [
                'status' => 'status_ngawur',
                'reason' => 'Alasan cukup panjang.',
            ])->assertUnprocessable();
    }

    public function test_student_cannot_change_status(): void
    {
        $this->actingAs($this->studentUser)
            ->postJson("/api/v1/academic/students/{$this->student->id}/status", [
                'status' => 'graduated',
                'reason' => 'Saya mau lulus sendiri.',
            ])->assertForbidden();
    }

    public function test_blocking_event_flag_persists(): void
    {
        $this->actingAs($this->admin)->postJson('/api/v1/academic/calendar', [
            'title' => 'Blackout UKMPPD',
            'event_type' => 'blackout',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-14',
            'blocks_rotation' => true,
        ])->assertCreated();

        $this->assertTrue(AcademicEvent::first()->blocks_rotation);
    }
}
