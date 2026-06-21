<?php

namespace Modules\Academic\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Stase;

class StaseSeeder extends Seeder
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

        $stases = [
            ['code' => 'IPD', 'name' => 'Ilmu Penyakit Dalam', 'duration_weeks' => 10, 'passing_grade' => 70.00],
            ['code' => 'BED', 'name' => 'Ilmu Bedah', 'duration_weeks' => 10, 'passing_grade' => 70.00],
            ['code' => 'OBG', 'name' => 'Obstetri dan Ginekologi', 'duration_weeks' => 10, 'passing_grade' => 70.00],
            ['code' => 'IKA', 'name' => 'Ilmu Kesehatan Anak', 'duration_weeks' => 10, 'passing_grade' => 70.00],
        ];

        foreach ($stases as $stase) {
            Stase::firstOrCreate(
                ['code' => $stase['code']],
                array_merge($stase, ['program_id' => $program->id])
            );
        }
    }
}
