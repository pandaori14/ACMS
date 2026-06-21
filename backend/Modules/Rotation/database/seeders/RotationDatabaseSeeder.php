<?php

namespace Modules\Rotation\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Academic\Models\Program;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationPeriod;

class RotationDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Create Hospitals
        $hospitals = [
            ['code' => 'RSDM', 'name' => 'RSUD Dr. Moewardi', 'type' => 'Utama'],
            ['code' => 'RSUNS', 'name' => 'RS UNS', 'type' => 'Utama'],
            ['code' => 'RSOP', 'name' => 'RS Ortopedi Prof. Dr. R. Soeharso', 'type' => 'Utama'],
            ['code' => 'RSJD', 'name' => 'RSJD Surakarta', 'type' => 'Utama'],
            ['code' => 'RSUD-SRG', 'name' => 'RSUD Sragen', 'type' => 'Satelit'],
        ];

        foreach ($hospitals as $h) {
            Hospital::firstOrCreate(['code' => $h['code']], $h);
        }

        // 2. Create Rotation Periods
        $program = Program::where('code', 'PD')->first();
        if ($program) {
            RotationPeriod::firstOrCreate(
                ['name' => 'Periode 1 Ganjil 2026/2027'],
                [
                    'program_id' => $program->id,
                    'start_date' => '2026-07-01',
                    'end_date' => '2026-12-31',
                    'status' => 'draft',
                ]
            );
        }
    }
}
