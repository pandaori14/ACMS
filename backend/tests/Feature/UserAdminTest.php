<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

/**
 * Regresi manajemen pengguna — import massal ber-role, guard Super Admin,
 * dan nonaktifkan akun (status inactive).
 */
class UserAdminTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('Admin Prodi');

        $this->student = User::factory()->create();
        $this->student->assignRole('Mahasiswa');
    }

    private function importCsv(string $csv, string $role)
    {
        $file = UploadedFile::fake()->createWithContent('pengguna.csv', $csv);

        return $this->actingAs($this->admin)->post('/api/users/import', [
            'file' => $file,
            'role' => $role,
        ], ['Accept' => 'application/json']);
    }

    public function test_import_creates_users_with_role_and_reports_skipped(): void
    {
        $csv = "nama,email,password,nim\n".
            "dr. Baru Satu,dokter1@rs.test,,197001010001\n".
            "Tanpa Email,,,197001010002\n".
            "dr. Baru Satu,dokter1@rs.test,,197001010001\n"; // duplikat baris 1

        $res = $this->importCsv($csv, 'Dodiknis');

        $res->assertOk()->assertJsonPath('data.created', 1);
        $this->assertCount(2, $res->json('data.skipped'));

        $user = User::where('email', 'dokter1@rs.test')->firstOrFail();
        $this->assertTrue($user->hasRole('Dodiknis'));
        $this->assertSame('active', $user->status);
    }

    public function test_import_cannot_create_super_admin(): void
    {
        $this->importCsv("nama,email\nPenyusup,root@evil.test\n", 'Super Admin')
            ->assertStatus(422);
    }

    public function test_import_requires_manage_users_permission(): void
    {
        $file = UploadedFile::fake()->createWithContent('x.csv', "nama,email\nA,a@b.test\n");

        $this->actingAs($this->student)->post('/api/users/import', [
            'file' => $file,
            'role' => 'Dodiknis',
        ], ['Accept' => 'application/json'])->assertForbidden();
    }

    public function test_admin_can_deactivate_user_via_update(): void
    {
        $target = User::factory()->create();
        $target->assignRole('Dosen');

        $this->actingAs($this->admin)->putJson("/api/users/{$target->id}", [
            'name' => $target->name,
            'email' => $target->email,
            'status' => 'inactive',
            'roles' => ['Dosen'],
        ])->assertOk();

        $this->assertSame('inactive', $target->fresh()->status);
    }
}
