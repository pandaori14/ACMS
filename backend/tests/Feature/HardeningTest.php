<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Incident\Models\IncidentReport;
use Tests\TestCase;

/**
 * Regresi hardening — state CSRF SSO & retensi PII insiden.
 */
class HardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_sso_callback_rejects_missing_or_wrong_state(): void
    {
        // Tanpa pernah memanggil /sso/redirect → session tak punya sso_state
        $this->getJson('/api/sso/callback?provider=google&code=abc&state=palsu')
            ->assertForbidden();
    }

    public function test_prune_pii_anonymizes_old_resolved_reports_only(): void
    {
        $reporter = User::factory()->create();

        $old = IncidentReport::create([
            'reporter_id' => $reporter->id,
            'incident_type' => 'student_safety',
            'incident_date' => now()->subMonths(30)->toDateString(),
            'location' => 'IGD',
            'description' => 'Laporan lama yang sudah selesai.',
            'is_anonymous' => false,
            'status' => 'resolved',
        ]);
        $old->forceFill(['created_at' => now()->subMonths(30)])->save();

        $recent = IncidentReport::create([
            'reporter_id' => $reporter->id,
            'incident_type' => 'student_safety',
            'incident_date' => now()->subMonth()->toDateString(),
            'location' => 'IGD',
            'description' => 'Laporan baru selesai.',
            'is_anonymous' => false,
            'status' => 'resolved',
        ]);

        $oldOpen = IncidentReport::create([
            'reporter_id' => $reporter->id,
            'incident_type' => 'student_safety',
            'incident_date' => now()->subMonths(30)->toDateString(),
            'location' => 'IGD',
            'description' => 'Laporan lama masih investigasi.',
            'is_anonymous' => false,
            'status' => 'investigating',
        ]);
        $oldOpen->forceFill(['created_at' => now()->subMonths(30)])->save();

        // DRY-RUN: tidak mengubah apa pun
        $this->artisan('incidents:prune-pii --dry')->assertSuccessful();
        $this->assertNotNull($old->fresh()->reporter_id);

        // Eksekusi nyata
        $this->artisan('incidents:prune-pii')->assertSuccessful();

        $old->refresh();
        $this->assertNull($old->reporter_id);
        $this->assertTrue($old->is_anonymous);
        $this->assertNotNull($old->anonymized_at);

        // Laporan baru & laporan lama yang belum selesai TIDAK disentuh
        $this->assertNotNull($recent->fresh()->reporter_id);
        $this->assertNotNull($oldOpen->fresh()->reporter_id);

        // Idempotent: run kedua tidak error
        $this->artisan('incidents:prune-pii')->assertSuccessful();
    }
}
