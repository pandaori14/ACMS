<?php

namespace Modules\Auth\Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

/**
 * Regresi siklus akun mandiri — lupa password (tanpa bocor status email),
 * reset via token, ganti password sendiri, dan update profil.
 */
class AuthSelfServiceTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'email' => 'koass@student.test',
            'password' => Hash::make('PasswordLama123'),
        ]);
    }

    public function test_forgot_password_creates_token_and_does_not_leak_email_status(): void
    {
        $resKnown = $this->postJson('/api/auth/forgot-password', ['email' => 'koass@student.test']);
        $resUnknown = $this->postJson('/api/auth/forgot-password', ['email' => 'tidak-terdaftar@student.test']);

        // Respons identik untuk email terdaftar & tidak (anti user-enumeration)
        $resKnown->assertOk();
        $resUnknown->assertOk();
        $this->assertSame($resKnown->json('message'), $resUnknown->json('message'));

        // Token benar-benar dibuat untuk email terdaftar
        $this->assertDatabaseHas('password_reset_tokens', ['email' => 'koass@student.test']);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'tidak-terdaftar@student.test']);
    }

    public function test_reset_password_with_valid_token(): void
    {
        $token = Password::broker()->createToken($this->user);

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'koass@student.test',
            'password' => 'PasswordBaru456',
            'password_confirmation' => 'PasswordBaru456',
        ])->assertOk();

        $this->assertTrue(Hash::check('PasswordBaru456', $this->user->fresh()->password));
    }

    public function test_reset_password_with_invalid_token_fails(): void
    {
        $this->postJson('/api/auth/reset-password', [
            'token' => 'token-palsu',
            'email' => 'koass@student.test',
            'password' => 'PasswordBaru456',
            'password_confirmation' => 'PasswordBaru456',
        ])->assertStatus(422);

        $this->assertTrue(Hash::check('PasswordLama123', $this->user->fresh()->password));
    }

    public function test_change_password_requires_correct_current_password(): void
    {
        $this->actingAs($this->user)->postJson('/api/auth/change-password', [
            'current_password' => 'SalahTotal',
            'password' => 'PasswordBaru456',
            'password_confirmation' => 'PasswordBaru456',
        ])->assertStatus(422);

        $this->actingAs($this->user)->postJson('/api/auth/change-password', [
            'current_password' => 'PasswordLama123',
            'password' => 'PasswordBaru456',
            'password_confirmation' => 'PasswordBaru456',
        ])->assertOk();

        $this->assertTrue(Hash::check('PasswordBaru456', $this->user->fresh()->password));
    }

    public function test_user_can_update_own_profile_name(): void
    {
        $this->actingAs($this->user)->putJson('/api/auth/profile', [
            'name' => 'Nama Baru Saya',
        ])->assertOk()
            ->assertJsonPath('user.name', 'Nama Baru Saya');

        $this->assertDatabaseHas('users', ['id' => $this->user->id, 'name' => 'Nama Baru Saya']);
    }

    public function test_guest_cannot_change_password_or_profile(): void
    {
        $this->postJson('/api/auth/change-password', [])->assertUnauthorized();
        $this->putJson('/api/auth/profile', [])->assertUnauthorized();
    }
}
