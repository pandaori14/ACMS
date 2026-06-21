<?php

namespace Modules\Incident\Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SystemReferenceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Incident\Models\Consultation;
use Tests\TestCase;

/**
 * Regresi modul Konsultasi — scoping (Riwayat Saya vs Manajemen),
 * gating respons, dan endpoint form-options (dropdown dinamis untuk pengaju).
 */
class ConsultationTest extends TestCase
{
    use RefreshDatabase;

    protected User $requester;      // Mahasiswa — submit-consultation

    protected User $otherRequester; // Mahasiswa lain

    protected User $manager;        // Kaprodi — manage-consultations

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(SystemReferenceSeeder::class);

        $this->requester = User::factory()->create();
        $this->requester->assignRole('Mahasiswa');

        $this->otherRequester = User::factory()->create();
        $this->otherRequester->assignRole('Mahasiswa');

        $this->manager = User::factory()->create();
        $this->manager->assignRole('Kaprodi');
    }

    private function makeConsultation(array $overrides = []): Consultation
    {
        return Consultation::create(array_merge([
            'requester_id' => $this->requester->id,
            'category' => 'academic',
            'topic' => 'Pertanyaan jadwal stase',
            'message' => 'Saya ingin menanyakan jadwal rotasi stase berikutnya.',
            'is_anonymous' => false,
            'status' => 'pending',
        ], $overrides));
    }

    public function test_requester_only_sees_own_consultations(): void
    {
        $this->makeConsultation();
        $this->makeConsultation(['requester_id' => $this->otherRequester->id]);

        $this->actingAs($this->requester)->getJson('/api/v1/consultations')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonCount(1, 'data');
    }

    public function test_manager_sees_all_consultations(): void
    {
        $this->makeConsultation();
        $this->makeConsultation(['requester_id' => $this->otherRequester->id]);

        $this->actingAs($this->manager)->getJson('/api/v1/consultations')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);
    }

    public function test_requester_can_submit_consultation(): void
    {
        $payload = [
            'category' => 'psychological',
            'topic' => 'Butuh dukungan',
            'message' => 'Saya merasa kewalahan dan butuh konsultasi psikologis.',
            'is_anonymous' => 0,
        ];

        $this->actingAs($this->requester)->postJson('/api/v1/consultations', $payload)
            ->assertCreated();

        $this->assertDatabaseHas('consultations', [
            'requester_id' => $this->requester->id,
            'category' => 'psychological',
            'status' => 'pending',
        ]);
    }

    public function test_requester_cannot_respond(): void
    {
        $consultation = $this->makeConsultation();

        $this->actingAs($this->requester)
            ->patchJson("/api/v1/consultations/{$consultation->id}/respond", [
                'response' => 'Mencoba membalas tanpa hak.',
                'status' => 'responded',
            ])
            ->assertForbidden();
    }

    public function test_manager_can_respond(): void
    {
        $consultation = $this->makeConsultation();

        $this->actingAs($this->manager)
            ->patchJson("/api/v1/consultations/{$consultation->id}/respond", [
                'response' => 'Jadwal stase Anda dimulai pekan depan.',
                'status' => 'responded',
            ])
            ->assertOk();

        $this->assertDatabaseHas('consultations', [
            'id' => $consultation->id,
            'status' => 'responded',
            'responded_by' => $this->manager->id,
        ]);
    }

    public function test_form_options_accessible_to_requester(): void
    {
        $this->actingAs($this->requester)
            ->getJson('/api/v1/consultations/form-options')
            ->assertOk()
            ->assertJsonStructure(['data' => ['categories']]);
    }
}
