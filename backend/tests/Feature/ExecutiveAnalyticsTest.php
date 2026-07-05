<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Modules\Academic\Models\Faculty;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Stase;
use Modules\Examination\Models\Exam;
use Modules\Examination\Models\ExamParticipant;
use Modules\Rotation\Models\Hospital;
use Tests\TestCase;

/**
 * Regresi Dashboard Eksekutif — gate permission, bentuk payload 4 pilar,
 * dan kebenaran pass-rate ujian.
 */
class ExecutiveAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected User $kaprodi;

    protected User $studentUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        Cache::flush();

        $this->kaprodi = User::factory()->create();
        $this->kaprodi->assignRole('Kaprodi');

        $this->studentUser = User::factory()->create();
        $this->studentUser->assignRole('Mahasiswa');
    }

    public function test_requires_executive_analytics_permission(): void
    {
        $this->actingAs($this->studentUser)
            ->getJson('/api/v1/analytics/executive')
            ->assertForbidden();

        $this->actingAs($this->kaprodi)
            ->getJson('/api/v1/analytics/executive')
            ->assertOk();
    }

    public function test_payload_contains_four_pillars_and_scorecards(): void
    {
        $res = $this->actingAs($this->kaprodi)->getJson('/api/v1/analytics/executive');

        $res->assertOk()->assertJsonStructure([
            'data' => [
                'scorecards' => ['active_students', 'active_assignments', 'incidents_30d', 'logbook_verified_percent'],
                'hospital_load',
                'incident_trends',
                'exam_pass_rate',
                'logbook_compliance',
                'generated_at',
            ],
        ]);

        // Tren insiden selalu kerangka 12 bulan
        $this->assertCount(12, $res->json('data.incident_trends'));
    }

    public function test_exam_pass_rate_computed_correctly(): void
    {
        $faculty = Faculty::create(['name' => 'FK']);
        $program = Program::create(['faculty_id' => $faculty->id, 'code' => 'PSPD', 'name' => 'Pendidikan Dokter']);
        $stase = Stase::create([
            'program_id' => $program->id, 'code' => 'IPD', 'name' => 'Penyakit Dalam',
            'duration_weeks' => 4, 'passing_grade' => 70,
        ]);

        $exam = Exam::create([
            'name' => 'CBT IPD', 'type' => 'CBT', 'stase_id' => $stase->id,
            'date' => now()->toDateString(), 'passing_score' => 60, 'status' => 'COMPLETED',
        ]);

        // 2 lulus (>=60), 1 gagal
        foreach ([80, 60, 40] as $score) {
            $u = User::factory()->create();
            ExamParticipant::create([
                'exam_id' => $exam->id, 'student_id' => $u->id,
                'final_score' => $score, 'status' => 'SUBMITTED',
            ]);
        }

        $res = $this->actingAs($this->kaprodi)->getJson('/api/v1/analytics/executive');
        $cbt = collect($res->json('data.exam_pass_rate'))->firstWhere('type', 'CBT');

        $this->assertSame(3, $cbt['total']);
        $this->assertSame(2, $cbt['passed']);
        $this->assertSame(67, $cbt['pass_rate']);
    }

    public function test_hospital_filter_scopes_hospital_load(): void
    {
        $rsA = Hospital::create(['code' => 'RSA', 'name' => 'RS A', 'type' => 'Utama']);
        Hospital::create(['code' => 'RSB', 'name' => 'RS B', 'type' => 'Satelit']);

        $res = $this->actingAs($this->kaprodi)
            ->getJson('/api/v1/analytics/executive?hospital_id='.$rsA->id);

        $res->assertOk();
        $load = $res->json('data.hospital_load');
        $this->assertCount(1, $load);
        $this->assertSame('RS A', $load[0]['hospital']);
    }
}
