<?php

namespace Modules\Clinical\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Clinical\Models\Diagnosis;
use Modules\Clinical\Models\Procedure;

class ClinicalDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedProcedures();
        $this->seedDiagnoses();
    }

    private function seedProcedures(): void
    {
        $procedures = [
            ['code' => 'P001', 'name' => 'Pemasangan Infus (IV Line)', 'category' => 'therapeutic'],
            ['code' => 'P002', 'name' => 'Pengambilan Darah Vena (Venipuncture)', 'category' => 'diagnostic'],
            ['code' => 'P003', 'name' => 'Pemasangan NGT (Nasogastric Tube)', 'category' => 'therapeutic'],
            ['code' => 'P004', 'name' => 'Pemasangan Kateter Urin', 'category' => 'therapeutic'],
            ['code' => 'P005', 'name' => 'Injeksi Intramuskular (IM)', 'category' => 'therapeutic'],
            ['code' => 'P006', 'name' => 'Injeksi Subkutan (SC)', 'category' => 'therapeutic'],
            ['code' => 'P007', 'name' => 'Penjahitan Luka (Wound Suturing)', 'category' => 'minor_surgery'],
            ['code' => 'P008', 'name' => 'Insisi dan Drainase Abses', 'category' => 'minor_surgery'],
            ['code' => 'P009', 'name' => 'Resusitasi Jantung Paru (CPR)', 'category' => 'emergency'],
            ['code' => 'P010', 'name' => 'Intubasi Endotrakeal', 'category' => 'emergency'],
            ['code' => 'P011', 'name' => 'Pemeriksaan EKG', 'category' => 'diagnostic'],
            ['code' => 'P012', 'name' => 'Pemeriksaan Funduskopi', 'category' => 'diagnostic'],
            ['code' => 'P013', 'name' => 'Pemeriksaan Leopold (Obstetri)', 'category' => 'diagnostic'],
            ['code' => 'P014', 'name' => 'Pertolongan Persalinan Normal', 'category' => 'obstetric'],
            ['code' => 'P015', 'name' => 'Debridement Luka', 'category' => 'minor_surgery'],
            ['code' => 'P016', 'name' => 'Pemasangan Bidai/Splint', 'category' => 'therapeutic'],
            ['code' => 'P017', 'name' => 'Lumbal Pungsi', 'category' => 'diagnostic'],
            ['code' => 'P018', 'name' => 'Pemasangan Chest Tube', 'category' => 'emergency'],
            ['code' => 'P019', 'name' => 'Sirkumsisi', 'category' => 'minor_surgery'],
            ['code' => 'P020', 'name' => 'Pemeriksaan Pap Smear', 'category' => 'diagnostic'],
        ];

        foreach ($procedures as $proc) {
            Procedure::firstOrCreate(['code' => $proc['code']], $proc);
        }
    }

    private function seedDiagnoses(): void
    {
        $diagnoses = [
            ['icd_code' => 'A09', 'name' => 'Gastroenteritis dan Kolitis (Diare)', 'category' => 'Infectious'],
            ['icd_code' => 'A15', 'name' => 'Tuberkulosis Paru', 'category' => 'Infectious'],
            ['icd_code' => 'A90', 'name' => 'Demam Dengue (Dengue Fever)', 'category' => 'Infectious'],
            ['icd_code' => 'B20', 'name' => 'HIV/AIDS', 'category' => 'Infectious'],
            ['icd_code' => 'E10', 'name' => 'Diabetes Mellitus Tipe 1', 'category' => 'Endocrine'],
            ['icd_code' => 'E11', 'name' => 'Diabetes Mellitus Tipe 2', 'category' => 'Endocrine'],
            ['icd_code' => 'I10', 'name' => 'Hipertensi Esensial (Primer)', 'category' => 'Cardiovascular'],
            ['icd_code' => 'I21', 'name' => 'Infark Miokard Akut (AMI)', 'category' => 'Cardiovascular'],
            ['icd_code' => 'I50', 'name' => 'Gagal Jantung (Heart Failure)', 'category' => 'Cardiovascular'],
            ['icd_code' => 'J06', 'name' => 'ISPA (Infeksi Saluran Pernapasan Atas)', 'category' => 'Respiratory'],
            ['icd_code' => 'J18', 'name' => 'Pneumonia', 'category' => 'Respiratory'],
            ['icd_code' => 'J45', 'name' => 'Asma Bronkial', 'category' => 'Respiratory'],
            ['icd_code' => 'K25', 'name' => 'Ulkus Lambung (Gastric Ulcer)', 'category' => 'Digestive'],
            ['icd_code' => 'K35', 'name' => 'Apendisitis Akut', 'category' => 'Digestive'],
            ['icd_code' => 'K80', 'name' => 'Kolelitiasis (Batu Empedu)', 'category' => 'Digestive'],
            ['icd_code' => 'N18', 'name' => 'Penyakit Ginjal Kronis (CKD)', 'category' => 'Genitourinary'],
            ['icd_code' => 'N39', 'name' => 'Infeksi Saluran Kemih (ISK)', 'category' => 'Genitourinary'],
            ['icd_code' => 'O80', 'name' => 'Persalinan Spontan Normal', 'category' => 'Obstetric'],
            ['icd_code' => 'O14', 'name' => 'Pre-eklampsia', 'category' => 'Obstetric'],
            ['icd_code' => 'R50', 'name' => 'Demam yang Belum Diketahui Sebabnya (FUO)', 'category' => 'General'],
            ['icd_code' => 'S72', 'name' => 'Fraktur Femur', 'category' => 'Injury'],
            ['icd_code' => 'G40', 'name' => 'Epilepsi', 'category' => 'Neurological'],
            ['icd_code' => 'I63', 'name' => 'Stroke Iskemik', 'category' => 'Neurological'],
            ['icd_code' => 'D50', 'name' => 'Anemia Defisiensi Besi', 'category' => 'Hematology'],
            ['icd_code' => 'L50', 'name' => 'Urtikaria (Biduran)', 'category' => 'Dermatology'],
        ];

        foreach ($diagnoses as $dx) {
            Diagnosis::firstOrCreate(['icd_code' => $dx['icd_code']], $dx);
        }
    }
}
