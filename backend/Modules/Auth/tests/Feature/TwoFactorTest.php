<?php

namespace Modules\Auth\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

/**
 * Regresi 2FA TOTP — enable→confirm, login dua langkah (challenge),
 * recovery code sekali pakai, dan disable berpassword.
 */
class TwoFactorTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'email' => 'admin2fa@test.local',
            'password' => Hash::make('PasswordKuat123'),
        ]);
    }

    /**
     * Request guest ber-session: Sanctum statefulApi hanya memasang session
     * untuk request dengan Origin/Referer dari domain stateful (spt SPA asli).
     * Juga reset default guard ke 'web' — middleware auth:sanctum pada request
     * sebelumnya (actingAs) menggesernya via shouldUse('sanctum') dan itu
     * menempel di app instance tes (di produksi tiap request app baru).
     */
    private function guestJson(string $method, string $uri, array $data = [])
    {
        $this->app['auth']->shouldUse('web');
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Origin', config('app.url'))->json($method, $uri, $data);
    }

    /** Aktifkan+konfirmasi 2FA untuk user; return [secret, recoveryCodes]. */
    private function activateTwoFactor(): array
    {
        $enable = $this->actingAs($this->user)->postJson('/api/auth/two-factor/enable');
        $enable->assertOk();
        $secret = $enable->json('data.secret');
        $recovery = $enable->json('data.recovery_codes');

        $code = app(Google2FA::class)->getCurrentOtp($secret);
        $this->actingAs($this->user)->postJson('/api/auth/two-factor/confirm', ['code' => $code])
            ->assertOk();

        return [$secret, $recovery];
    }

    public function test_enable_and_confirm_flow(): void
    {
        [$secret, $recovery] = $this->activateTwoFactor();

        $this->assertNotNull($this->user->fresh()->two_factor_confirmed_at);
        $this->assertCount(8, $recovery);
        // Secret tersimpan terenkripsi (bukan plaintext)
        $this->assertNotSame($secret, $this->user->fresh()->two_factor_secret);
        $this->assertSame($secret, Crypt::decryptString($this->user->fresh()->two_factor_secret));
    }

    public function test_confirm_with_wrong_code_fails(): void
    {
        $this->actingAs($this->user)->postJson('/api/auth/two-factor/enable')->assertOk();

        $this->actingAs($this->user)
            ->postJson('/api/auth/two-factor/confirm', ['code' => '000000'])
            ->assertStatus(422);

        $this->assertNull($this->user->fresh()->two_factor_confirmed_at);
    }

    public function test_login_requires_challenge_then_succeeds_with_totp(): void
    {
        [$secret] = $this->activateTwoFactor();
        $this->app['auth']->forgetGuards();

        // Langkah 1: kredensial benar → two_factor_required, BELUM login
        $res = $this->guestJson('POST', '/api/auth/login', [
            'email' => 'admin2fa@test.local',
            'password' => 'PasswordKuat123',
        ]);
        $res->assertOk()->assertJsonPath('two_factor_required', true);
        $this->assertGuest();

        // Kode salah → 422, tetap guest
        $this->guestJson('POST', '/api/auth/two-factor-challenge', ['code' => '000000'])
            ->assertStatus(422);
        $this->assertGuest();

        // Kode benar → masuk
        $code = app(Google2FA::class)->getCurrentOtp($secret);
        $this->guestJson('POST', '/api/auth/two-factor-challenge', ['code' => $code])
            ->assertOk()
            ->assertJsonPath('user.email', 'admin2fa@test.local')
            ->assertJsonPath('user.two_factor_enabled', true);
        $this->assertAuthenticatedAs($this->user);
    }

    public function test_recovery_code_works_once(): void
    {
        [, $recovery] = $this->activateTwoFactor();
        $this->app['auth']->forgetGuards();

        $this->guestJson('POST', '/api/auth/login', [
            'email' => 'admin2fa@test.local',
            'password' => 'PasswordKuat123',
        ])->assertJsonPath('two_factor_required', true);

        $this->guestJson('POST', '/api/auth/two-factor-challenge', ['recovery_code' => $recovery[0]])
            ->assertOk();
        $this->assertAuthenticatedAs($this->user);

        // Kode yang sama tidak bisa dipakai lagi
        $this->guestJson('POST', '/api/auth/logout');
        $this->app['auth']->forgetGuards();
        $this->guestJson('POST', '/api/auth/login', [
            'email' => 'admin2fa@test.local',
            'password' => 'PasswordKuat123',
        ]);
        $this->guestJson('POST', '/api/auth/two-factor-challenge', ['recovery_code' => $recovery[0]])
            ->assertStatus(422);
    }

    public function test_disable_requires_correct_password(): void
    {
        $this->activateTwoFactor();

        $this->actingAs($this->user)
            ->deleteJson('/api/auth/two-factor', ['current_password' => 'Salah'])
            ->assertStatus(422);

        $this->actingAs($this->user)
            ->deleteJson('/api/auth/two-factor', ['current_password' => 'PasswordKuat123'])
            ->assertOk();

        $this->assertNull($this->user->fresh()->two_factor_secret);
        $this->assertNull($this->user->fresh()->two_factor_confirmed_at);
    }
}
