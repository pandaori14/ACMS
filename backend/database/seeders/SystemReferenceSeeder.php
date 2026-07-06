<?php

namespace Database\Seeders;

use App\Models\SystemReference;
use Illuminate\Database\Seeder;

class SystemReferenceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $incidentTypes = [
            ['name' => 'Keamanan Mahasiswa', 'value' => 'student_safety'],
            ['name' => 'Keamanan Pasien', 'value' => 'patient_safety'],
            ['name' => 'Perundungan (Bullying)', 'value' => 'bullying'],
            ['name' => 'K3 (Keselamatan & Kesehatan Kerja)', 'value' => 'k3'],
            ['name' => 'Pelanggaran Kode Etik', 'value' => 'ethical_violation'],
            ['name' => 'Kekerasan Seksual', 'value' => 'sexual_harassment'],
            ['name' => 'Lainnya', 'value' => 'other'],
        ];

        foreach ($incidentTypes as $type) {
            SystemReference::updateOrCreate(
                [
                    'category' => 'incident_types',
                    'value' => $type['value'],
                ],
                [
                    'name' => $type['name'],
                    'is_active' => true,
                ]
            );
        }

        $consultationCategories = [
            ['name' => 'Konsultasi Akademik', 'value' => 'academic'],
            ['name' => 'Konsultasi Psikologis', 'value' => 'psychological'],
            ['name' => 'Konsultasi Karir Klinis', 'value' => 'career'],
            ['name' => 'Konsultasi Perundungan', 'value' => 'bullying_consult'],
            ['name' => 'Konsultasi K3', 'value' => 'k3_consult'],
            ['name' => 'Konsultasi Lainnya', 'value' => 'other'],
        ];

        foreach ($consultationCategories as $cat) {
            SystemReference::updateOrCreate(
                [
                    'category' => 'consultation_categories',
                    'value' => $cat['value'],
                ],
                [
                    'name' => $cat['name'],
                    'is_active' => true,
                ]
            );
        }

        // Tingkat keparahan insiden (dipindah dari hardcoded agar konfigurabel)
        $incidentSeverities = [
            ['name' => 'Kritis', 'value' => 'critical'],
            ['name' => 'Tinggi', 'value' => 'high'],
            ['name' => 'Sedang', 'value' => 'medium'],
            ['name' => 'Rendah', 'value' => 'low'],
        ];

        foreach ($incidentSeverities as $severity) {
            SystemReference::updateOrCreate(
                [
                    'category' => 'incident_severities',
                    'value' => $severity['value'],
                ],
                [
                    'name' => $severity['name'],
                    'is_active' => true,
                ]
            );
        }

        // Status mahasiswa (dipakai form CRUD & import mahasiswa)
        $studentStatuses = [
            ['name' => 'Aktif', 'value' => 'active'],
            ['name' => 'Cuti', 'value' => 'leave'],
            ['name' => 'Lulus', 'value' => 'graduated'],
            ['name' => 'Drop Out', 'value' => 'dropout'],
        ];

        foreach ($studentStatuses as $status) {
            SystemReference::updateOrCreate(
                [
                    'category' => 'student_statuses',
                    'value' => $status['value'],
                ],
                [
                    'name' => $status['name'],
                    'is_active' => true,
                ]
            );
        }

        // Tipe event Kalender Akademik (hari libur, blackout, ujian, kegiatan)
        $academicEventTypes = [
            ['name' => 'Hari Libur', 'value' => 'holiday'],
            ['name' => 'Periode Blackout', 'value' => 'blackout'],
            ['name' => 'Periode Ujian', 'value' => 'exam_period'],
            ['name' => 'Kegiatan Akademik', 'value' => 'academic_activity'],
        ];

        foreach ($academicEventTypes as $type) {
            SystemReference::updateOrCreate(
                [
                    'category' => 'academic_event_types',
                    'value' => $type['value'],
                ],
                [
                    'name' => $type['name'],
                    'is_active' => true,
                ]
            );
        }
    }
}
