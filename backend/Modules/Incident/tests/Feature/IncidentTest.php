<?php

namespace Modules\Incident\Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SystemReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Incident\Models\IncidentReport;
use Tests\TestCase;

/**
 * Regresi modul Insiden — mengunci aturan RBAC & keamanan:
 * scoping (Laporan Saya vs Daftar Insiden), anti-bocor catatan internal,
 * gating aksi pengelola, anonimitas, dan gating konfigurasi.
 */
class IncidentTest extends TestCase
{
    use RefreshDatabase;

    protected User $reporter;       // Mahasiswa — report-incidents (OPERATE)

    protected User $otherReporter;  // Mahasiswa lain

    protected User $manager;        // Kaprodi — manage-incidents + view-anonymous-identity (OVERSEE)

    protected User $configurator;   // Admin Prodi — configure-incident-form (CONFIGURE)

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(SystemReferenceSeeder::class);

        $this->reporter = User::factory()->create();
        $this->reporter->assignRole('Mahasiswa');

        $this->otherReporter = User::factory()->create();
        $this->otherReporter->assignRole('Mahasiswa');

        $this->manager = User::factory()->create();
        $this->manager->assignRole('Kaprodi');

        $this->configurator = User::factory()->create();
        $this->configurator->assignRole('Admin Prodi');
    }

    private function makeReport(array $overrides = []): IncidentReport
    {
        return IncidentReport::create(array_merge([
            'reporter_id' => $this->reporter->id,
            'incident_type' => 'student_safety',
            'incident_date' => now()->toDateString(),
            'location' => 'IGD RS Pendidikan',
            'description' => 'Deskripsi insiden untuk pengujian yang cukup panjang.',
            'is_anonymous' => false,
            'status' => 'submitted',
        ], $overrides));
    }

    public function test_reporter_only_sees_own_reports(): void
    {
        $this->makeReport();
        $this->makeReport(['reporter_id' => $this->otherReporter->id]);

        $response = $this->actingAs($this->reporter)->getJson('/api/v1/incidents');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonCount(1, 'data');
    }

    public function test_manager_sees_all_reports(): void
    {
        $this->makeReport();
        $this->makeReport(['reporter_id' => $this->otherReporter->id]);

        $response = $this->actingAs($this->manager)->getJson('/api/v1/incidents');

        $response->assertOk()->assertJsonPath('meta.total', 2);
    }

    public function test_reporter_can_submit_report(): void
    {
        $payload = [
            'incident_type' => 'student_safety',
            'incident_date' => now()->subDay()->toDateString(),
            'location' => 'Bangsal Penyakit Dalam',
            'description' => 'Mahasiswa tertusuk jarum saat tindakan medis.',
            'is_anonymous' => 0,
        ];

        $response = $this->actingAs($this->reporter)->postJson('/api/v1/incidents/report', $payload);

        $response->assertCreated();
        $this->assertDatabaseHas('incident_reports', [
            'reporter_id' => $this->reporter->id,
            'incident_type' => 'student_safety',
            'status' => 'submitted',
        ]);
    }

    public function test_anonymous_report_nullifies_reporter(): void
    {
        $payload = [
            'incident_type' => 'bullying',
            'incident_date' => now()->subDay()->toDateString(),
            'location' => 'Ruang Jaga',
            'description' => 'Laporan anonim untuk pengujian masking identitas.',
            'is_anonymous' => 1,
        ];

        $this->actingAs($this->reporter)->postJson('/api/v1/incidents/report', $payload)->assertCreated();

        $this->assertDatabaseHas('incident_reports', [
            'incident_type' => 'bullying',
            'is_anonymous' => true,
            'reporter_id' => null,
        ]);
    }

    public function test_reporter_cannot_access_investigation_notes(): void
    {
        $report = $this->makeReport();
        $report->notes()->create([
            'user_id' => $this->manager->id,
            'note' => 'Catatan investigasi internal.',
            'is_internal' => true,
        ]);

        // Endpoint notes di-gate manage-incidents — pelapor tidak boleh akses.
        $this->actingAs($this->reporter)
            ->getJson("/api/v1/incidents/{$report->id}/notes")
            ->assertForbidden();
    }

    public function test_show_does_not_expose_internal_notes(): void
    {
        $report = $this->makeReport();
        $report->notes()->create([
            'user_id' => $this->manager->id,
            'note' => 'Catatan investigasi internal.',
            'is_internal' => true,
        ]);

        // Pelapor boleh melihat laporannya sendiri, tapi payload TIDAK memuat notes.
        $this->actingAs($this->reporter)
            ->getJson("/api/v1/incidents/{$report->id}")
            ->assertOk()
            ->assertJsonMissingPath('data.notes');
    }

    public function test_reporter_cannot_update_status(): void
    {
        $report = $this->makeReport();

        $this->actingAs($this->reporter)
            ->patchJson("/api/v1/incidents/{$report->id}/status", ['status' => 'investigating'])
            ->assertForbidden();
    }

    public function test_manager_can_update_status(): void
    {
        $report = $this->makeReport();

        $this->actingAs($this->manager)
            ->patchJson("/api/v1/incidents/{$report->id}/status", ['status' => 'investigating'])
            ->assertOk();

        $this->assertDatabaseHas('incident_reports', [
            'id' => $report->id,
            'status' => 'investigating',
        ]);
    }

    public function test_status_change_is_audited(): void
    {
        $report = $this->makeReport();

        $this->actingAs($this->manager)
            ->patchJson("/api/v1/incidents/{$report->id}/status", ['status' => 'investigating'])
            ->assertOk();

        // Perubahan tercatat di audit trail (hash-chain) via trait Auditable.
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'incident.report.updated',
            'target_id' => $report->id,
            'actor_id' => $this->manager->id,
        ]);
    }

    public function test_configure_endpoint_requires_permission(): void
    {
        $report = $this->makeReport();

        // Pelapor & pengelola (Kaprodi) tidak punya configure-incident-form.
        $this->actingAs($this->reporter)->getJson('/api/v1/incidents/config')->assertForbidden();
        $this->actingAs($this->manager)->getJson('/api/v1/incidents/config')->assertForbidden();

        // Admin Prodi (configure-incident-form) boleh.
        $this->actingAs($this->configurator)
            ->getJson('/api/v1/incidents/config')
            ->assertOk()
            ->assertJsonStructure(['data' => ['incident_types', 'incident_severities', 'settings', 'notification']]);
    }
}
