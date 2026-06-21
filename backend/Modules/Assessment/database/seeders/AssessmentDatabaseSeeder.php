<?php

namespace Modules\Assessment\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Assessment\Models\AssessmentTemplate;

class AssessmentDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $miniCexRubric = [
            'indicators' => [
                ['key' => 'interview', 'label' => 'Kemampuan Wawancara Medis', 'max_score' => 10],
                ['key' => 'physical_exam', 'label' => 'Pemeriksaan Fisik', 'max_score' => 10],
                ['key' => 'professionalism', 'label' => 'Kualitas Humanistik/Profesionalisme', 'max_score' => 10],
                ['key' => 'clinical_judgment', 'label' => 'Keputusan Klinis (Clinical Judgment)', 'max_score' => 10],
                ['key' => 'counseling', 'label' => 'Kemampuan Konseling', 'max_score' => 10],
                ['key' => 'organization', 'label' => 'Organisasi/Efisiensi', 'max_score' => 10],
                ['key' => 'overall', 'label' => 'Kompetensi Klinis Keseluruhan', 'max_score' => 10],
            ],
            'max_total_score' => 70,
        ];

        $dopsRubric = [
            'indicators' => [
                ['key' => 'preparation', 'label' => 'Persiapan Tindakan', 'max_score' => 10],
                ['key' => 'consent', 'label' => 'Informed Consent', 'max_score' => 10],
                ['key' => 'technique', 'label' => 'Teknik Prosedural', 'max_score' => 10],
                ['key' => 'safety', 'label' => 'Keamanan dan Asepsis', 'max_score' => 10],
                ['key' => 'post_procedure', 'label' => 'Penanganan Pasca Tindakan', 'max_score' => 10],
                ['key' => 'overall', 'label' => 'Performa Keseluruhan', 'max_score' => 10],
            ],
            'max_total_score' => 60,
        ];

        $cbdRubric = [
            'indicators' => [
                ['key' => 'record_keeping', 'label' => 'Pencatatan Rekam Medis', 'max_score' => 10],
                ['key' => 'clinical_findings', 'label' => 'Interpretasi Temuan Klinis', 'max_score' => 10],
                ['key' => 'management_plan', 'label' => 'Rencana Penatalaksanaan', 'max_score' => 10],
                ['key' => 'follow_up', 'label' => 'Rencana Tindak Lanjut', 'max_score' => 10],
                ['key' => 'overall', 'label' => 'Performa Keseluruhan', 'max_score' => 10],
            ],
            'max_total_score' => 50,
        ];

        AssessmentTemplate::firstOrCreate(
            ['type' => 'mini-cex'],
            [
                'name' => 'Mini-CEX Standard',
                'rubric_schema' => $miniCexRubric,
            ]
        );

        AssessmentTemplate::firstOrCreate(
            ['type' => 'dops'],
            [
                'name' => 'DOPS Standard',
                'rubric_schema' => $dopsRubric,
            ]
        );

        AssessmentTemplate::firstOrCreate(
            ['type' => 'cbd'],
            [
                'name' => 'CBD Standard',
                'rubric_schema' => $cbdRubric,
            ]
        );
    }
}
