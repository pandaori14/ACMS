<?php

namespace Modules\Academic\Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SystemReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Modules\Academic\Models\Cohort;
use Modules\Academic\Models\Faculty;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Student;
use Tests\TestCase;

/**
 * Regresi modul Academic — mengunci CRUD data master (Faculty/Program/Cohort/Student),
 * guard hapus (data terpakai tidak boleh hilang), RBAC mutasi
 * (manage-academic-master), dan import massal mahasiswa.
 */
class AcademicMasterTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;      // Admin Prodi — manage-academic-master

    protected User $student;    // Mahasiswa — tanpa permission mutasi

    protected Faculty $faculty;

    protected Program $program;

    protected Cohort $cohort;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(SystemReferenceSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin Prodi');

        $this->student = User::factory()->create();
        $this->student->assignRole('Mahasiswa');

        $this->faculty = Faculty::create(['name' => 'Fakultas Kedokteran']);
        $this->program = Program::create([
            'faculty_id' => $this->faculty->id,
            'code' => 'PSPD',
            'name' => 'Pendidikan Dokter',
        ]);
        $this->cohort = Cohort::create([
            'program_id' => $this->program->id,
            'name' => 'Angkatan 2026',
            'year' => 2026,
        ]);
    }

    // ---------- RBAC ----------

    public function test_student_cannot_mutate_master_data(): void
    {
        $this->actingAs($this->student)
            ->postJson('/api/v1/academic/cohorts', ['program_id' => $this->program->id, 'name' => 'X', 'year' => 2026])
            ->assertForbidden();

        $this->actingAs($this->student)
            ->deleteJson("/api/v1/academic/faculties/{$this->faculty->id}")
            ->assertForbidden();
    }

    public function test_authenticated_user_can_read_master_data(): void
    {
        $this->actingAs($this->student)
            ->getJson('/api/v1/academic/cohorts')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    // ---------- Faculty & Program ----------

    public function test_admin_can_update_and_guarded_delete_faculty(): void
    {
        $this->actingAs($this->admin)
            ->putJson("/api/v1/academic/faculties/{$this->faculty->id}", ['name' => 'FK Baru'])
            ->assertOk()
            ->assertJsonPath('data.name', 'FK Baru');

        // Masih punya program → tidak boleh dihapus
        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/academic/faculties/{$this->faculty->id}")
            ->assertStatus(422);

        $empty = Faculty::create(['name' => 'Fakultas Kosong']);
        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/academic/faculties/{$empty->id}")
            ->assertOk();
        $this->assertSoftDeleted('faculties', ['id' => $empty->id]);
    }

    public function test_admin_can_update_and_guarded_delete_program(): void
    {
        $this->actingAs($this->admin)
            ->putJson("/api/v1/academic/programs/{$this->program->id}", ['accreditation' => 'Unggul'])
            ->assertOk()
            ->assertJsonPath('data.accreditation', 'Unggul');

        $emptyProgram = Program::create([
            'faculty_id' => $this->faculty->id,
            'code' => 'KOSONG',
            'name' => 'Program Kosong',
        ]);
        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/academic/programs/{$emptyProgram->id}")
            ->assertOk();
    }

    // ---------- Cohort ----------

    public function test_cohort_crud_and_guarded_delete(): void
    {
        $res = $this->actingAs($this->admin)->postJson('/api/v1/academic/cohorts', [
            'program_id' => $this->program->id,
            'name' => 'Angkatan 2027',
            'year' => 2027,
        ]);
        $res->assertCreated();
        $cohortId = $res->json('data.id');

        $this->actingAs($this->admin)
            ->putJson("/api/v1/academic/cohorts/{$cohortId}", ['name' => 'Angkatan 2027 Genap'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Angkatan 2027 Genap');

        // Cohort berisi mahasiswa tidak boleh dihapus
        $this->makeStudent();
        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/academic/cohorts/{$this->cohort->id}")
            ->assertStatus(422);

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/academic/cohorts/{$cohortId}")
            ->assertOk();
    }

    // ---------- Student ----------

    public function test_admin_can_create_student_with_user_account(): void
    {
        $res = $this->actingAs($this->admin)->postJson('/api/v1/academic/students', [
            'name' => 'Budi Santoso',
            'email' => 'budi@student.test',
            'identity_number' => 'J500260001',
            'program_id' => $this->program->id,
            'cohort_id' => $this->cohort->id,
            'status' => 'active',
            'enrollment_date' => '2026-07-01',
        ]);

        $res->assertCreated()->assertJsonPath('data.user.email', 'budi@student.test');

        $this->assertDatabaseHas('users', ['email' => 'budi@student.test', 'identity_number' => 'J500260001']);
        $this->assertDatabaseHas('students', ['cohort_id' => $this->cohort->id]);

        $user = User::where('email', 'budi@student.test')->first();
        $this->assertTrue($user->hasRole('Mahasiswa'));
    }

    public function test_student_status_must_come_from_system_references(): void
    {
        $this->actingAs($this->admin)->postJson('/api/v1/academic/students', [
            'name' => 'Salah Status',
            'email' => 'salah@student.test',
            'identity_number' => 'J500260099',
            'program_id' => $this->program->id,
            'cohort_id' => $this->cohort->id,
            'status' => 'bukan-status',
            'enrollment_date' => '2026-07-01',
        ])->assertStatus(422);
    }

    public function test_admin_can_update_and_delete_student(): void
    {
        $student = $this->makeStudent();

        $this->actingAs($this->admin)
            ->putJson("/api/v1/academic/students/{$student->id}", ['status' => 'graduated'])
            ->assertOk()
            ->assertJsonPath('data.status', 'graduated');

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/academic/students/{$student->id}")
            ->assertOk();

        $this->assertSoftDeleted('students', ['id' => $student->id]);
        $this->assertDatabaseHas('users', ['id' => $student->user_id, 'status' => 'inactive']);
    }

    public function test_import_creates_students_and_reports_skipped_rows(): void
    {
        $csv = "nama,email,nim,password\n".
            "Budi Import,budi.import@student.test,J500260010,\n".
            "Tanpa Email,,J500260011,\n".
            "Budi Import,budi.import@student.test,J500260010,\n"; // duplikat baris 1

        $file = UploadedFile::fake()->createWithContent('mahasiswa.csv', $csv);

        // post (bukan postJson): upload file butuh multipart, bukan body JSON
        $res = $this->actingAs($this->admin)->post('/api/v1/academic/students/import', [
            'file' => $file,
            'program_id' => $this->program->id,
            'cohort_id' => $this->cohort->id,
        ], ['Accept' => 'application/json']);

        $res->assertOk()
            ->assertJsonPath('data.created', 1);

        $this->assertCount(2, $res->json('data.skipped'));
        $this->assertDatabaseHas('users', ['email' => 'budi.import@student.test']);
    }

    private function makeStudent(): Student
    {
        $user = User::factory()->create(['identity_number' => 'J5002600'.rand(10, 99)]);
        $user->assignRole('Mahasiswa');

        return Student::create([
            'user_id' => $user->id,
            'program_id' => $this->program->id,
            'cohort_id' => $this->cohort->id,
            'status' => 'active',
            'enrollment_date' => '2026-07-01',
        ]);
    }
}
