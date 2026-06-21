<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            'superadmin' => 'Super Admin',
            'adminprodi' => 'Admin Prodi',
            'kaprodi' => 'Kaprodi',
            'dosen' => 'Dosen',
            'dodiknis' => 'Dodiknis',
            'adminrs' => 'Admin RS',
            'mahasiswa' => 'Mahasiswa',
            'finance' => 'Finance',
        ];

        foreach ($roles as $prefix => $roleName) {
            $user = User::firstOrCreate(
                ['email' => "{$prefix}@acms.test"],
                [
                    'name' => "Dummy {$roleName}",
                    'password' => Hash::make('password'),
                ]
            );

            // Assign the role to the user
            if (! $user->hasRole($roleName)) {
                $user->assignRole($roleName);
            }
        }
    }
}
