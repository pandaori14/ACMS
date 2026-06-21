<?php

namespace Database\Seeders;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Stase;
use Modules\Academic\Models\Student;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationAssignment;
use Modules\Rotation\Models\RotationPeriod;

class DummyDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $program = Program::first();
        if (! $program) {
            return;
        }

        // Ensure we have some stase
        $stases = Stase::all();
        if ($stases->count() < 2) {
            return;
        }

        // Ensure we have some hospitals
        $hospitals = Hospital::all();
        if ($hospitals->count() < 2) {
            return;
        }

        // Create an active rotation period (starts 1 week ago, ends in 3 weeks)
        $activePeriod = RotationPeriod::create([
            'name' => 'Rotasi Aktif '.Carbon::now()->format('F Y'),
            'start_date' => Carbon::now()->subWeek()->format('Y-m-d'),
            'end_date' => Carbon::now()->addWeeks(3)->format('Y-m-d'),
            'status' => 'active',
            'program_id' => $program->id,
        ]);

        // Get students and preceptors
        $students = Student::all();
        $preceptors = User::role('Dodiknis')->get();

        if ($students->count() < 2 || $preceptors->count() < 1) {
            return;
        }

        // Assign some students to active rotation
        $count = 0;
        foreach ($students as $student) {
            // Assign 4 students max
            if ($count >= 4) {
                break;
            }

            // Pick a random stase and hospital
            $stase = $stases->random();
            $hospital = $hospitals->random();
            $preceptor = $preceptors->random();

            RotationAssignment::create([
                'rotation_period_id' => $activePeriod->id,
                'student_id' => $student->id, // student table
                'stase_id' => $stase->id,
                'hospital_id' => $hospital->id,
                'preceptor_id' => $preceptor->id, // users table
                'status' => 'active',
            ]);

            $count++;
        }
    }
}
