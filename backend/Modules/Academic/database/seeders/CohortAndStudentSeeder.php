<?php

namespace Modules\Academic\Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Modules\Academic\Models\Cohort;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Student;

class CohortAndStudentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $program = Program::where('code', 'PD')->first();

        if (! $program) {
            return;
        }

        $cohort = Cohort::firstOrCreate(
            ['program_id' => $program->id, 'year' => 2026],
            ['name' => 'Angkatan 2026']
        );

        // Create 5 dummy students
        for ($i = 1; $i <= 5; $i++) {
            $user = User::firstOrCreate(
                ['email' => "koass0{$i}@acms.id"],
                [
                    'name' => "Koass Dummy {$i}",
                    'password' => Hash::make('password'),
                    'status' => 'active',
                ]
            );

            $user->assignRole('Mahasiswa');

            Student::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'program_id' => $program->id,
                    'cohort_id' => $cohort->id,
                    'status' => 'active',
                    'enrollment_date' => now()->subMonths(2)->format('Y-m-d'),
                ]
            );
        }
    }
}
