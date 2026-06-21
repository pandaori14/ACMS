<?php

namespace Modules\Academic\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Academic\Models\Faculty;
use Modules\Academic\Models\Program;

class AcademicDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $faculty = Faculty::firstOrCreate(
            ['name' => 'Fakultas Kedokteran']
        );

        Program::firstOrCreate(
            ['code' => 'PD'],
            [
                'faculty_id' => $faculty->id,
                'name' => 'Program Studi Profesi Dokter',
                'accreditation' => 'A',
            ]
        );

        Program::firstOrCreate(
            ['code' => 'KG'],
            [
                'faculty_id' => $faculty->id,
                'name' => 'Program Studi Profesi Dokter Gigi',
                'accreditation' => 'B',
            ]
        );

        $this->call([
            StaseSeeder::class,
            CohortAndStudentSeeder::class,
        ]);
    }
}
