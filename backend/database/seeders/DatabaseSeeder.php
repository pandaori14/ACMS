<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Esensial (role, permission, referensi/enum, setting) — wajib agar app berfungsi.
        // Lalu akun dummy + data dummy untuk DEV. (Produksi: pakai ProductionSeeder.)
        $this->call([
            RoleSeeder::class,
            RolePermissionSeeder::class,
            SystemReferenceSeeder::class,
            SettingSeeder::class,
            UserSeeder::class,
            MassiveDummySeeder::class,
        ]);
    }
}
