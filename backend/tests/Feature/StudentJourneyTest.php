<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SystemReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Academic\Models\Cohort;
use Modules\Academic\Models\Faculty;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Stase;
use Modules\Academic\Models\Student;
use Modules\Assessment\Models\AssessmentTemplate;
use Modules\Assessment\Models\StaseGrade;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationPeriod;
use Tests\TestCase;

/**
 * E2E "golden path" perjalanan mahasiswa koass — mengunci bahwa SEMUA modul
 * & RBAC berjalan menyambung:
 *
 *   Admin siapkan master data → mahasiswa didistribusikan ke stase+RS →
 *   mahasiswa: dashboard pribadi, jadwal rotasi, isi logbook, presensi,
 *   lihat ujian, lapor insiden → Dodiknis (RS yang sesuai) verifikasi
 *   logbook + menilai → nilai dihitung → disetujui → diterbitkan →
 *   mahasiswa melihat nilai stasenya.
 */
class StudentJourneyTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;

    protected User $adminProdi;

    protected User $kaprodi;

    protected User $preceptor;      // Dodiknis di RS yang sesuai

    protected User $otherPreceptor; // Dodiknis RS lain (harus DITOLAK)

    protected Program $program;

    protected Cohort $cohort;

    protected Stase $stase;

    protected Hospital $hospital;

    protected Hospital $otherHospital;

    protected RotationPeriod $period;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(SystemReferenceSeeder::class);

        $this->superAdmin = User::factory()->create();
        $this->superAdmin->assignRole('Super Admin');

        $this->adminProdi = User::factory()->create();
        $this->adminProdi->assignRole('Admin Prodi');

        $this->kaprodi = User::factory()->create();
        $this->kaprodi->assignRole('Kaprodi');

        // Master data akademik
        $faculty = Faculty::create(['name' => 'Fakultas Kedokteran']);
        $this->program = Program::create(['faculty_id' => $faculty->id, 'code' => 'PSPD', 'name' => 'Pendidikan Dokter']);
        $this->cohort = Cohort::create(['program_id' => $this->program->id, 'name' => 'Angkatan 2026', 'year' => 2026]);
        $this->stase = Stase::create([
            'program_id' => $this->program->id, 'code' => 'IPD', 'name' => 'Ilmu Penyakit Dalam',
            'duration_weeks' => 4, 'passing_grade' => 70,
        ]);
        $this->hospital = Hospital::create(['code' => 'RSA', 'name' => 'RSUD A', 'type' => 'Utama']);
        $this->otherHospital = Hospital::create(['code' => 'RSB', 'name' => 'RSUD B', 'type' => 'Satelit']);

        // Periode berjalan hari ini (agar presensi & dashboard aktif)
        $this->period = RotationPeriod::create([
            'program_id' => $this->program->id, 'name' => 'Periode Berjalan',
            'start_date' => now()->subDays(3)->toDateString(),
            'end_date' => now()->addDays(25)->toDateString(),
            'status' => 'active',
        ]);

        // Dodiknis tertaut ke RS masing-masing (scoping RBAC baris)
        $this->preceptor = User::factory()->create();
        $this->preceptor->assignRole('Dodiknis');
        $this->preceptor->hospitals()->attach($this->hospital->id);

        $this->otherPreceptor = User::factory()->create();
        $this->otherPreceptor->assignRole('Dodiknis');
        $this->otherPreceptor->hospitals()->attach($this->otherHospital->id);
    }

    public function test_full_student_journey_across_all_modules(): void
    {
        // ===== 1. ADMIN: buat mahasiswa (akun dibuat otomatis) =====
        $res = $this->actingAs($this->adminProdi)->postJson('/api/v1/academic/students', [
            'name' => 'Koass Budi',
            'email' => 'budi.koass@student.test',
            'identity_number' => 'J500260777',
            'password' => 'RahasiaKuat123',
            'program_id' => $this->program->id,
            'cohort_id' => $this->cohort->id,
            'status' => 'active',
            'enrollment_date' => now()->toDateString(),
        ]);
        $res->assertCreated();
        $studentUser = User::where('email', 'budi.koass@student.test')->firstOrFail();
        $studentProfile = Student::where('user_id', $studentUser->id)->firstOrFail();

        // ===== 2. ADMIN: distribusikan mahasiswa ke stase + RS =====
        $res = $this->actingAs($this->adminProdi)->postJson('/api/v1/rotation/assignments', [
            'rotation_period_id' => $this->period->id,
            'student_id' => $studentProfile->id,
            'stase_id' => $this->stase->id,
            'hospital_id' => $this->hospital->id,
            'status' => 'in_progress',
        ]);
        $res->assertCreated();
        $assignmentId = $res->json('data.id');

        // Mahasiswa TIDAK boleh mendistribusikan dirinya sendiri (RBAC)
        $this->actingAs($studentUser)->postJson('/api/v1/rotation/assignments', [
            'rotation_period_id' => $this->period->id,
            'student_id' => $studentProfile->id,
            'stase_id' => $this->stase->id,
            'hospital_id' => $this->otherHospital->id,
            'status' => 'pending',
        ])->assertForbidden();

        // ===== 3. MAHASISWA: dashboard statistik pribadi =====
        $res = $this->actingAs($studentUser)->getJson('/api/dashboard/stats');
        $res->assertOk()
            ->assertJsonPath('role', 'Mahasiswa')
            ->assertJsonPath('active_assignment.id', $assignmentId)
            ->assertJsonPath('active_assignment.stase.name', 'Ilmu Penyakit Dalam')
            ->assertJsonPath('active_assignment.hospital.name', 'RSUD A');

        // ===== 4. MAHASISWA: lihat jadwal rotasi (hanya miliknya) =====
        $res = $this->actingAs($studentUser)->getJson('/api/v1/rotation/assignments');
        $res->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $assignmentId);

        // ===== 5. MAHASISWA: isi & submit logbook =====
        $res = $this->actingAs($studentUser)->postJson('/api/v1/clinical/logbooks', [
            'rotation_assignment_id' => $assignmentId,
            'activity_date' => now()->toDateString(),
            'activity_type' => 'case',
            'description' => 'Anamnesis dan pemeriksaan fisik pasien DM tipe 2 di bangsal penyakit dalam.',
            'status' => 'submitted',
        ]);
        $res->assertCreated();
        $logbookId = $res->json('data.id');

        // ===== 6. MAHASISWA: presensi check-in (rotasi aktif hari ini) =====
        $res = $this->actingAs($studentUser)->getJson('/api/v1/clinical/attendance/status');
        $res->assertOk()->assertJsonPath('can_check_in', true);

        $this->actingAs($studentUser)->postJson('/api/v1/clinical/attendance/check-in', [
            'rotation_assignment_id' => $assignmentId,
        ])->assertOk();

        // ===== 7. DODIKNIS RS LAIN: TIDAK boleh memverifikasi (scoping RS) =====
        $this->actingAs($this->otherPreceptor)
            ->patchJson("/api/v1/clinical/logbooks/{$logbookId}/verify", [])
            ->assertForbidden();

        // ===== 8. DODIKNIS RS SESUAI: lihat & verifikasi logbook =====
        $res = $this->actingAs($this->preceptor)->getJson('/api/v1/clinical/logbooks?pending_verification=true');
        $res->assertOk()->assertJsonCount(1, 'data');

        $this->actingAs($this->preceptor)
            ->patchJson("/api/v1/clinical/logbooks/{$logbookId}/verify", [
                'preceptor_feedback' => 'Anamnesis sistematis, lanjutkan.',
            ])
            ->assertOk();

        // ===== 9. DODIKNIS: menilai (Mini-CEX) → mahasiswa acknowledge =====
        $template = AssessmentTemplate::create([
            'type' => 'mini-cex', 'name' => 'Mini-CEX',
            'rubric_schema' => [
                'indicators' => [
                    ['key' => 'anamnesis', 'label' => 'Anamnesis', 'weight' => 50, 'max_score' => 100],
                    ['key' => 'diagnosis', 'label' => 'Diagnosis', 'weight' => 50, 'max_score' => 100],
                ],
            ],
            'is_active' => true,
        ]);

        $res = $this->actingAs($this->preceptor)->postJson('/api/v1/assessments', [
            'rotation_assignment_id' => $assignmentId,
            'assessment_template_id' => $template->id,
            'student_id' => $studentUser->id,
            'assessment_date' => now()->toDateString(),
            'scores' => ['anamnesis' => 85, 'diagnosis' => 80],
            'feedback_notes' => 'Kompetensi klinis baik.',
            'status' => 'submitted',
        ]);
        $res->assertCreated();
        $assessmentId = $res->json('data.id');

        $this->actingAs($studentUser)
            ->patchJson("/api/v1/assessments/{$assessmentId}/acknowledge")
            ->assertOk();

        // ===== 10. NILAI: hitung → setujui (Kaprodi) → terbitkan =====
        $this->actingAs($this->adminProdi)
            ->postJson("/api/v1/grades/calculate/{$assignmentId}")
            ->assertOk();

        $gradeId = StaseGrade::where('rotation_assignment_id', $assignmentId)->value('id');
        $this->assertNotNull($gradeId, 'Nilai stase harus terbentuk setelah kalkulasi.');

        $this->actingAs($this->kaprodi)->patchJson("/api/v1/grades/{$gradeId}/approve")->assertOk();
        $this->actingAs($this->kaprodi)->patchJson("/api/v1/grades/{$gradeId}/publish")->assertOk();

        // ===== 11. MAHASISWA: melihat nilai stase yang sudah terbit =====
        $res = $this->actingAs($studentUser)->getJson('/api/v1/grades');
        $res->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'published');

        // Dashboard mahasiswa kini menampilkan nilai terbaru
        $res = $this->actingAs($studentUser)->getJson('/api/dashboard/stats');
        $res->assertOk()->assertJsonCount(1, 'recent_grades');

        // ===== 12. MAHASISWA: melihat jadwal ujian yang diikutinya =====
        $res = $this->actingAs($this->adminProdi)->postJson('/api/v1/examinations', [
            'name' => 'OSCE IPD', 'type' => 'OSCE', 'stase_id' => $this->stase->id,
            'date' => now()->addDays(10)->toDateString(),
        ]);
        $res->assertCreated();
        $examId = $res->json('data.id');
        $this->actingAs($this->adminProdi)
            ->postJson("/api/v1/examinations/{$examId}/participants", ['student_id' => $studentUser->id])
            ->assertOk();

        $res = $this->actingAs($studentUser)->getJson('/api/v1/examinations');
        $res->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'OSCE IPD');

        // ===== 13. MAHASISWA: melaporkan insiden =====
        $this->actingAs($studentUser)->postJson('/api/v1/incidents/report', [
            'incident_type' => 'patient_safety',
            'incident_date' => now()->toDateString(),
            'location' => 'Bangsal Penyakit Dalam RSUD A',
            'description' => 'Hampir terjadi kesalahan pemberian obat, sudah dicegah perawat jaga.',
            'is_anonymous' => false,
        ])->assertCreated();
    }

    public function test_super_admin_can_manage_everything(): void
    {
        // Bypass Gate::before — Super Admin lolos permission APAPUN,
        // termasuk yang belum di-sync ke rolenya.
        $this->assertTrue($this->superAdmin->can('permission-baru-yang-belum-disync'));

        // Contoh lintas modul: endpoint bergating permission berbeda-beda
        $this->actingAs($this->superAdmin)->getJson('/api/v1/finance/billings')->assertOk();
        $this->actingAs($this->superAdmin)->getJson('/api/v1/clinical/attendance/recap')->assertOk();
        $this->actingAs($this->superAdmin)->getJson('/api/v1/clinical/evaluations/report')->assertOk();
        $this->actingAs($this->superAdmin)->postJson('/api/v1/academic/cohorts', [
            'program_id' => $this->program->id, 'name' => 'Angkatan 2027', 'year' => 2027,
        ])->assertCreated();
        $this->actingAs($this->superAdmin)->getJson('/api/dashboard/stats')->assertOk();
    }
}
