<?php

namespace Modules\Finance\Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Finance\Models\Billing;
use Modules\Finance\Models\Honorarium;
use Modules\Rotation\Models\Hospital;
use Tests\TestCase;

/**
 * Regresi Finance — pencatatan pembayaran tagihan/honorarium, nomor invoice,
 * dan RBAC manage-finance (mutasi tertutup untuk peran lain).
 */
class FinancePaymentTest extends TestCase
{
    use RefreshDatabase;

    protected User $finance;    // Keuangan — manage-finance

    protected User $student;    // Mahasiswa — tanpa akses finance

    protected User $preceptor;  // Dodiknis — hanya lihat honorarium sendiri

    protected Billing $billing;

    protected Honorarium $honorarium;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->finance = User::factory()->create();
        $this->finance->assignRole('Keuangan');

        $this->student = User::factory()->create();
        $this->student->assignRole('Mahasiswa');

        $this->preceptor = User::factory()->create();
        $this->preceptor->assignRole('Dodiknis');

        $hospital = Hospital::create(['code' => 'RSA', 'name' => 'RS A', 'type' => 'Utama']);

        $this->billing = Billing::create([
            'hospital_id' => $hospital->id,
            'period' => '2026-07',
            'amount' => 15000000,
            'status' => 'PENDING',
        ]);

        $this->honorarium = Honorarium::create([
            'preceptor_id' => $this->preceptor->id,
            'period' => '2026-07',
            'amount' => 2500000,
            'status' => 'PENDING',
        ]);
    }

    public function test_student_cannot_access_billing_endpoints(): void
    {
        $this->actingAs($this->student)->getJson('/api/v1/finance/billings')->assertForbidden();

        $this->actingAs($this->student)
            ->postJson("/api/v1/finance/billings/{$this->billing->id}/payment", ['payment_method' => 'Transfer'])
            ->assertForbidden();
    }

    public function test_finance_can_record_billing_payment(): void
    {
        $res = $this->actingAs($this->finance)->postJson("/api/v1/finance/billings/{$this->billing->id}/payment", [
            'payment_method' => 'Transfer Bank',
            'payment_reference' => 'TRX-001',
        ]);

        $res->assertOk()
            ->assertJsonPath('data.status', 'PAID')
            ->assertJsonPath('data.payment_reference', 'TRX-001');

        // Sudah lunas → tidak bisa dicatat dua kali
        $this->actingAs($this->finance)
            ->postJson("/api/v1/finance/billings/{$this->billing->id}/payment", ['payment_method' => 'Tunai'])
            ->assertStatus(422);
    }

    public function test_invoice_number_is_generated_once(): void
    {
        $this->actingAs($this->finance)
            ->get("/api/v1/finance/billings/{$this->billing->id}/invoice")
            ->assertOk();

        $first = $this->billing->fresh()->invoice_number;
        $this->assertNotNull($first);
        $this->assertStringStartsWith('INV/ACMS/', $first);

        // Unduh kedua kali → nomor tidak berubah
        $this->actingAs($this->finance)
            ->get("/api/v1/finance/billings/{$this->billing->id}/invoice")
            ->assertOk();
        $this->assertSame($first, $this->billing->fresh()->invoice_number);
    }

    public function test_finance_can_record_honorarium_payment(): void
    {
        $res = $this->actingAs($this->finance)->postJson("/api/v1/finance/honorariums/{$this->honorarium->id}/payment", [
            'payment_method' => 'Transfer Bank',
        ]);

        $res->assertOk()->assertJsonPath('data.status', 'PAID');
        $this->assertNotNull($this->honorarium->fresh()->paid_at);
    }

    public function test_preceptor_sees_only_own_honorarium_and_cannot_mutate(): void
    {
        Honorarium::create([
            'preceptor_id' => $this->finance->id, // milik orang lain
            'period' => '2026-07',
            'amount' => 1000000,
            'status' => 'PENDING',
        ]);

        $res = $this->actingAs($this->preceptor)->getJson('/api/v1/finance/honorariums');
        $res->assertOk()->assertJsonCount(1, 'data');

        $this->actingAs($this->preceptor)
            ->postJson("/api/v1/finance/honorariums/{$this->honorarium->id}/payment", ['payment_method' => 'Tunai'])
            ->assertForbidden();
    }
}
