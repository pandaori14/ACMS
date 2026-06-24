<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeder PRODUKSI — AMAN untuk go-live.
 *
 * HANYA data esensial: role, permission, referensi sistem (dropdown/enum), dan
 * setting. TIDAK memuat data dummy (mahasiswa/RS/insiden palsu) dan TIDAK membuat
 * akun default berpassword "password" (lihat UserSeeder yang khusus dev).
 *
 * Super Admin dibuat dari .env (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME).
 *
 * Pakai:  php artisan db:seed --class=ProductionSeeder --force
 */
class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        // Tulang punggung sistem (idempotent — aman dijalankan berulang).
        $this->call([
            RoleSeeder::class,
            RolePermissionSeeder::class,
            SystemReferenceSeeder::class,
            SettingSeeder::class,
        ]);

        // Super Admin nyata dari .env — TANPA password default.
        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');
        $name = env('ADMIN_NAME', 'Administrator');

        if (! $email || ! $password) {
            $this->command->warn('  ADMIN_EMAIL / ADMIN_PASSWORD belum di-set di .env — pembuatan Super Admin dilewati.');
            $this->command->warn('  Set keduanya lalu jalankan ulang: php artisan db:seed --class=ProductionSeeder --force');

            return;
        }

        $user = User::firstOrCreate(
            ['email' => $email],
            ['name' => $name, 'password' => Hash::make($password)]
        );

        if (! $user->hasRole('Super Admin')) {
            $user->assignRole('Super Admin');
        }

        $this->command->info("  Super Admin siap: {$email}");
    }
}
