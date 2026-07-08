<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Incident\Services\IncidentFormService;

class IncidentFormTemplateSeeder extends Seeder
{
    public function __construct(private readonly IncidentFormService $formService) {}

    public function run(): void
    {
        // 1. Template K3
        $k3Template = $this->formService->createTemplate([
            'incident_type' => 'k3',
            'name' => 'Formulir K3 Dokter Muda',
            'description' => 'Formulir pelaporan Keselamatan dan Kesehatan Kerja untuk Dokter Muda FK UMS.',
            'header_title' => 'Formulir K3 Dokter Muda FK UMS',
            'header_subtitle' => 'Keselamatan Pasien, Keselamatan Mahasiswa, dan K3',
            'theme_color' => '#6B21A8', // Ungu K3
            'sections' => [
                [
                    'title' => '1. Data Pelapor',
                    'icon' => 'user',
                    'fields' => [
                        ['label' => 'Nama & NIM', 'field_key' => 'nama_nim', 'field_type' => 'text', 'is_required' => true, 'placeholder' => 'Ketik Nama dan NIM Anda', 'grid_cols' => 2],
                        ['label' => 'No. Telepon / WA', 'field_key' => 'no_telp', 'field_type' => 'tel', 'is_required' => true, 'placeholder' => '08xxxxxxxx', 'grid_cols' => 2],
                        ['label' => 'Email', 'field_key' => 'email', 'field_type' => 'email', 'is_required' => true, 'placeholder' => 'email@domain.com', 'grid_cols' => 2],
                        ['label' => 'Stase Saat Ini', 'field_key' => 'stase', 'field_type' => 'text', 'is_required' => true, 'placeholder' => 'Cth: Stase Ilmu Penyakit Dalam', 'grid_cols' => 2],
                        ['label' => 'Tempat Stase (RS/Puskesmas)', 'field_key' => 'tempat_stase', 'field_type' => 'text', 'is_required' => true, 'placeholder' => 'Cth: RSUD Sukoharjo', 'grid_cols' => 2],
                    ],
                ],
                [
                    'title' => '2. Deskripsi Insiden',
                    'icon' => 'alert-triangle',
                    'fields' => [
                        ['label' => 'Uraian Singkat Kejadian', 'field_key' => 'uraian_kejadian', 'field_type' => 'textarea', 'is_required' => true, 'placeholder' => 'Jelaskan bagaimana insiden terjadi...'],
                        ['label' => 'Akibat Kejadian', 'field_key' => 'akibat', 'field_type' => 'text', 'is_required' => true, 'placeholder' => 'Cth: Luka memar, tertusuk jarum, dll'],
                        ['label' => 'Tindakan yang Telah Dilakukan', 'field_key' => 'tindakan', 'field_type' => 'textarea', 'is_required' => true, 'placeholder' => 'Apa yang langsung Anda lakukan setelah kejadian?'],
                    ],
                ],
                [
                    'title' => '3. Bukti Pendukung',
                    'icon' => 'paperclip',
                    'fields' => [
                        ['label' => 'Foto / Bukti Kejadian (Opsional)', 'field_key' => 'bukti', 'field_type' => 'file', 'is_required' => false],
                    ],
                ],
                [
                    'title' => 'Pernyataan',
                    'icon' => 'file-check',
                    'fields' => [
                        ['label' => 'Saya menyatakan bahwa data yang saya laporkan adalah benar.', 'field_key' => 'pernyataan', 'field_type' => 'statement', 'is_required' => true],
                    ],
                ],
            ]
        ]);
        $this->formService->activateTemplate($k3Template->id);

        // 2. Template Perundungan
        $bullyingTemplate = $this->formService->createTemplate([
            'incident_type' => 'bullying',
            'name' => 'Formulir Pelaporan Perundungan & Kekerasan',
            'description' => 'Formulir rahasia pelaporan perundungan atau kekerasan.',
            'header_title' => 'Pelaporan Perundungan & Kekerasan',
            'header_subtitle' => 'Identitas pelapor akan dijamin kerahasiaannya',
            'theme_color' => '#166534', // Hijau Perundungan
            'sections' => [
                [
                    'title' => '1. Status Pelapor',
                    'icon' => 'user',
                    'fields' => [
                        [
                            'label' => 'Posisi Anda dalam insiden ini',
                            'field_key' => 'posisi',
                            'field_type' => 'radio',
                            'is_required' => true,
                            'options' => [
                                ['value' => 'korban', 'label' => 'Saya adalah Korban'],
                                ['value' => 'saksi', 'label' => 'Saya adalah Saksi'],
                            ]
                        ],
                    ],
                ],
                [
                    'title' => '2. Data Korban',
                    'icon' => 'user',
                    'fields' => [
                        ['label' => 'Nama Korban (Jika Diketahui)', 'field_key' => 'nama_korban', 'field_type' => 'text', 'is_required' => false, 'placeholder' => 'Kosongkan jika Anda tidak tahu', 'grid_cols' => 2],
                    ],
                ],
                [
                    'title' => '3. Data Pelaku',
                    'icon' => 'user',
                    'fields' => [
                        ['label' => 'Nama Pelaku (Terdakwa)', 'field_key' => 'nama_pelaku', 'field_type' => 'text', 'is_required' => true, 'placeholder' => 'Nama atau inisial pelaku', 'grid_cols' => 2],
                        ['label' => 'Jabatan/Status Pelaku', 'field_key' => 'status_pelaku', 'field_type' => 'text', 'is_required' => true, 'placeholder' => 'Cth: Konsulen, Residen, Perawat...', 'grid_cols' => 2],
                    ],
                ],
                [
                    'title' => '4. Kronologi',
                    'icon' => 'alert-triangle',
                    'fields' => [
                        ['label' => 'Bentuk Perundungan/Kekerasan', 'field_key' => 'bentuk', 'field_type' => 'multiselect', 'is_required' => true, 'options' => [
                            ['value' => 'fisik', 'label' => 'Fisik (Dipukul, didorong, dll)'],
                            ['value' => 'verbal', 'label' => 'Verbal (Dimaki, dihina, dll)'],
                            ['value' => 'psikologis', 'label' => 'Psikologis (Dikucilkan, dll)'],
                            ['value' => 'seksual', 'label' => 'Pelecehan Seksual'],
                            ['value' => 'cyber', 'label' => 'Cyberbullying'],
                            ['value' => 'lainnya', 'label' => 'Lainnya'],
                        ]],
                        ['label' => 'Ceritakan Kronologi Kejadian', 'field_key' => 'kronologi_insiden', 'field_type' => 'textarea', 'is_required' => true, 'placeholder' => 'Jelaskan sejelas mungkin...'],
                    ],
                ],
                [
                    'title' => '5. Bukti',
                    'icon' => 'paperclip',
                    'fields' => [
                        ['label' => 'Lampirkan Bukti (Tangkapan layar, foto, dll)', 'field_key' => 'bukti_perundungan', 'field_type' => 'file', 'is_required' => false],
                    ],
                ],
                [
                    'title' => 'Pernyataan Kerahasiaan',
                    'icon' => 'shield-alert',
                    'fields' => [
                        ['label' => 'Laporan ini bersifat rahasia dan akan ditangani oleh tim khusus.', 'field_key' => 'pernyataan_rahasia', 'field_type' => 'statement', 'is_required' => true],
                    ],
                ],
            ]
        ]);
        $this->formService->activateTemplate($bullyingTemplate->id);
    }
}
