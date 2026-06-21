<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Mengunci hardening keamanan Fase 2:
 * - rate limiting login (anti brute-force),
 * - error envelope JSON terstandar pada route API.
 */
class SecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_is_rate_limited(): void
    {
        $payload = ['email' => 'nobody@example.com', 'password' => 'salah'];

        // 6 percobaan pertama tidak di-throttle (boleh gagal 401/422).
        for ($i = 0; $i < 6; $i++) {
            $status = $this->postJson('/api/auth/login', $payload)->status();
            $this->assertNotSame(429, $status);
        }

        // Percobaan ke-7 harus 429 Too Many Requests.
        $this->postJson('/api/auth/login', $payload)->assertStatus(429);
    }

    public function test_unauthenticated_api_returns_json_401(): void
    {
        $this->getJson('/api/v1/incidents')
            ->assertStatus(401)
            ->assertJsonStructure(['message']);
    }

    public function test_validation_error_returns_json_envelope(): void
    {
        // Login tanpa field wajib → 422 dengan {message, errors}.
        $this->postJson('/api/auth/login', [])
            ->assertStatus(422)
            ->assertJsonStructure(['message', 'errors']);
    }

    public function test_security_headers_present(): void
    {
        $this->getJson('/api/v1/incidents')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }
}
