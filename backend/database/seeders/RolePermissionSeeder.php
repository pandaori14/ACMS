<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Define all available modules / menu permissions
        $permissions = [
            'view-dashboard',
            'view-analytics',
            'manage-stase',
            'manage-hospitals',
            'view-rotations',
            'manage-rotations',
            'view-logbook',
            'verify-logbook',
            'take-examinations',
            'manage-examinations',
            'create-assessments',
            'view-assessments',
            'manage-grades',
            'view-transcripts',
            'report-incidents',
            'manage-incidents',
            'manage-finance',
            'manage-users',
            'manage-academic-master',
            'manage-settings',
            'view-incident-guide',
            'view-audit-logs',
            'view-attendance-recap',
            'manage-consultations',
            'submit-consultation',
            'configure-incident-form',
            'view-anonymous-identity',
            'view-executive-analytics',
            'send-broadcasts',
        ];

        // Create permissions
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // 2. Assign default permissions to existing roles

        // Super Admin gets everything (usually done via Gate::before in AuthServiceProvider, but we can also just assign)
        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $superAdmin->syncPermissions(Permission::all());

        // Admin Prodi
        $adminProdi = Role::firstOrCreate(['name' => 'Admin Prodi', 'guard_name' => 'web']);
        $adminProdi->syncPermissions([
            'view-dashboard', 'view-analytics', 'manage-stase', 'manage-hospitals',
            'view-rotations', 'manage-rotations', 'take-examinations', 'manage-examinations',
            'view-assessments', 'manage-grades', 'view-transcripts', 'report-incidents',
            'manage-finance', 'manage-users', 'manage-academic-master', 'view-attendance-recap',
            'manage-consultations', 'submit-consultation', 'configure-incident-form',
            'view-executive-analytics', 'send-broadcasts',
        ]);

        // Kaprodi — manage-grades WAJIB: Kaprodi satu-satunya peran (selain
        // Super Admin) yang boleh approve nilai; tanpa ini menu nilai tak muncul.
        $kaprodi = Role::firstOrCreate(['name' => 'Kaprodi', 'guard_name' => 'web']);
        $kaprodi->syncPermissions([
            'view-dashboard', 'view-analytics', 'view-transcripts', 'report-incidents', 'manage-incidents',
            'view-audit-logs', 'view-attendance-recap', 'manage-consultations', 'submit-consultation',
            'view-anonymous-identity', 'manage-grades', 'view-executive-analytics', 'send-broadcasts',
        ]);

        // Dodiknis
        $dodiknis = Role::firstOrCreate(['name' => 'Dodiknis', 'guard_name' => 'web']);
        $dodiknis->syncPermissions([
            'view-dashboard', 'verify-logbook', 'take-examinations', 'create-assessments', 'view-assessments', 'report-incidents',
            'view-attendance-recap', 'submit-consultation',
        ]);

        // Mahasiswa
        $mahasiswa = Role::firstOrCreate(['name' => 'Mahasiswa', 'guard_name' => 'web']);
        $mahasiswa->syncPermissions([
            'view-dashboard', 'view-rotations', 'view-logbook', 'take-examinations', 'view-transcripts', 'report-incidents',
            'submit-consultation',
        ]);

        // Keuangan
        $keuangan = Role::firstOrCreate(['name' => 'Keuangan', 'guard_name' => 'web']);
        $keuangan->syncPermissions([
            'view-dashboard', 'manage-finance', 'report-incidents', 'submit-consultation',
        ]);

        // Admin RS — view-rotations & view-attendance-recap agar bisa melihat
        // mahasiswa yang dirotasi & presensinya (di-scope ke RS-nya di controller)
        $adminRs = Role::firstOrCreate(['name' => 'Admin RS', 'guard_name' => 'web']);
        $adminRs->syncPermissions([
            'view-dashboard', 'manage-hospitals', 'report-incidents', 'submit-consultation',
            'view-rotations', 'view-attendance-recap',
        ]);

        // Dosen
        $dosen = Role::firstOrCreate(['name' => 'Dosen', 'guard_name' => 'web']);
        $dosen->syncPermissions([
            'view-dashboard', 'report-incidents', 'view-attendance-recap', 'submit-consultation',
        ]);
    }
}
