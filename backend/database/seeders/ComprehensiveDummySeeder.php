<?php

namespace Database\Seeders;

use App\Models\User;
use Carbon\Carbon;
use Faker\Factory as Faker;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ComprehensiveDummySeeder extends Seeder
{
    public function run()
    {
        $faker = Faker::create('id_ID');

        // 1. Faculties & Programs
        $facultyId = Str::uuid()->toString();
        DB::table('faculties')->insert([
            'id' => $facultyId,
            'name' => 'Fakultas Kedokteran',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $programId = Str::uuid()->toString();
        DB::table('programs')->insert([
            'id' => $programId,
            'faculty_id' => $facultyId,
            'code' => 'PD01',
            'name' => 'Profesi Dokter',
            'accreditation' => 'A',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Stase
        $stases = [
            ['id' => Str::uuid()->toString(), 'code' => 'IPD', 'name' => 'Ilmu Penyakit Dalam', 'duration_weeks' => 10, 'passing_grade' => 75, 'is_mandatory' => 1, 'color_code' => '#FF5733'],
            ['id' => Str::uuid()->toString(), 'code' => 'IB', 'name' => 'Ilmu Bedah', 'duration_weeks' => 10, 'passing_grade' => 75, 'is_mandatory' => 1, 'color_code' => '#33FF57'],
            ['id' => Str::uuid()->toString(), 'code' => 'IKA', 'name' => 'Ilmu Kesehatan Anak', 'duration_weeks' => 10, 'passing_grade' => 75, 'is_mandatory' => 1, 'color_code' => '#3357FF'],
            ['id' => Str::uuid()->toString(), 'code' => 'OBG', 'name' => 'Obstetri dan Ginekologi', 'duration_weeks' => 10, 'passing_grade' => 75, 'is_mandatory' => 1, 'color_code' => '#F033FF'],
        ];

        foreach ($stases as $stase) {
            DB::table('stases')->insert([
                'id' => $stase['id'],
                'program_id' => $programId,
                'code' => $stase['code'],
                'name' => $stase['name'],
                'duration_weeks' => $stase['duration_weeks'],
                'passing_grade' => $stase['passing_grade'],
                'is_mandatory' => $stase['is_mandatory'],
                'color_code' => $stase['color_code'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 3. Competencies
        foreach ($stases as $stase) {
            for ($i = 0; $i < 5; $i++) {
                DB::table('competencies')->insert([
                    'id' => Str::uuid()->toString(),
                    'name' => 'Penyakit/Keterampilan '.$faker->word().' ('.$stase['code'].')',
                    'type' => $faker->randomElement(['disease', 'skill']),
                    'category' => 'SKDI 4A',
                    'level' => 'Mampu Tatalaksana',
                    'stase_id' => $stase['id'],
                    'description' => $faker->sentence(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // 4. Hospitals
        $hospitals = [
            ['id' => Str::uuid()->toString(), 'code' => 'RSUD', 'name' => 'RSUD Pendidikan Utama', 'type' => 'Pendidikan Utama', 'address' => $faker->address()],
            ['id' => Str::uuid()->toString(), 'code' => 'RSJ1', 'name' => 'RS Jejaring 1', 'type' => 'Jejaring', 'address' => $faker->address()],
            ['id' => Str::uuid()->toString(), 'code' => 'RSJ2', 'name' => 'RS Jejaring 2', 'type' => 'Jejaring', 'address' => $faker->address()],
        ];

        foreach ($hospitals as $hosp) {
            DB::table('hospitals')->insert([
                'id' => $hosp['id'],
                'code' => $hosp['code'],
                'name' => $hosp['name'],
                'type' => $hosp['type'],
                'address' => $hosp['address'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 5. Users (Mahasiswa & Dodiknis)
        $cohortId = Str::uuid()->toString();
        DB::table('cohorts')->insert([
            'id' => $cohortId,
            'program_id' => $programId,
            'name' => 'Angkatan 2026',
            'year' => 2026,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $studentUsers = [];
        for ($i = 1; $i <= 10; $i++) {
            $user = User::create([
                'name' => 'Mahasiswa Koass '.$i,
                'email' => "koass$i@acms.id",
                'password' => Hash::make('password'),
                'identity_number' => 'NIM'.$faker->numerify('########'),
                'status' => 'active',
                'program_id' => $programId,
            ]);
            $user->assignRole('Mahasiswa');
            $studentUsers[] = $user;

            DB::table('students')->insert([
                'id' => Str::uuid()->toString(),
                'user_id' => $user->id,
                'program_id' => $programId,
                'cohort_id' => $cohortId,
                'status' => 'active',
                'enrollment_date' => Carbon::now()->subMonths(6)->format('Y-m-d'),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $preceptorUsers = [];
        for ($i = 1; $i <= 5; $i++) {
            $user = User::create([
                'name' => 'dr. Dodiknis '.$i.', Sp.PD',
                'email' => "dodiknis$i@acms.id",
                'password' => Hash::make('password'),
                'identity_number' => 'NIP'.$faker->numerify('########'),
                'status' => 'active',
            ]);
            $user->assignRole('Dodiknis');

            // Assign to hospital
            $hosp = $faker->randomElement($hospitals);
            DB::table('hospital_user')->insert([
                'user_id' => $user->id,
                'hospital_id' => $hosp['id'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $preceptorUsers[] = $user;
        }

        // 6. Rotation Period & Assignments
        $rotationPeriodId = Str::uuid()->toString();
        DB::table('rotation_periods')->insert([
            'id' => $rotationPeriodId,
            'program_id' => $programId,
            'name' => 'Periode Aktif '.now()->format('M Y'),
            'start_date' => now()->subDays(10)->format('Y-m-d'),
            'end_date' => now()->addWeeks(8)->format('Y-m-d'),
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $assignments = [];
        foreach ($studentUsers as $idx => $user) {
            $stase = $stases[$idx % count($stases)];
            $preceptor = $preceptorUsers[$idx % count($preceptorUsers)];
            $hosp = DB::table('hospital_user')->where('user_id', $preceptor->id)->first();
            $hospId = $hosp ? $hosp->hospital_id : $hospitals[0]['id'];

            $student = DB::table('students')->where('user_id', $user->id)->first();

            $assignmentId = Str::uuid()->toString();
            DB::table('rotation_assignments')->insert([
                'id' => $assignmentId,
                'rotation_period_id' => $rotationPeriodId,
                'student_id' => $student->id,
                'stase_id' => $stase['id'],
                'hospital_id' => $hospId,
                'preceptor_id' => $preceptor->id,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $assignments[] = [
                'id' => $assignmentId,
                'student_id' => $student->id,
                'preceptor_id' => $preceptor->id,
            ];
        }

        // 7. Diagnoses & Procedures
        $diagnosisId = Str::uuid()->toString();
        DB::table('diagnoses')->insert([
            'id' => $diagnosisId,
            'icd_code' => 'A09',
            'name' => 'Infectious gastroenteritis and colitis, unspecified',
            'category' => 'Infections',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $procedureId = Str::uuid()->toString();
        DB::table('procedures')->insert([
            'id' => $procedureId,
            'code' => 'P01',
            'name' => 'Pemasangan Infus',
            'category' => 'Clinical Skill',
            'description' => 'Memasang IV line',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 8. Logbooks
        foreach ($assignments as $assign) {
            for ($j = 0; $j < 3; $j++) {
                DB::table('logbook_entries')->insert([
                    'id' => Str::uuid()->toString(),
                    'rotation_assignment_id' => $assign['id'],
                    'student_id' => $assign['student_id'],
                    'preceptor_id' => $assign['preceptor_id'],
                    'activity_date' => now()->subDays(rand(1, 7))->format('Y-m-d'),
                    'activity_type' => $faker->randomElement(['Case Report', 'Clinical Procedure', 'Morning Report']),
                    'description' => 'Anamnesis dan pemeriksaan fisik pada pasien '.$faker->name(),
                    'patient_initials' => strtoupper($faker->lexify('??')),
                    'medical_record_no' => $faker->numerify('RM-######'),
                    'diagnosis_id' => $diagnosisId,
                    'procedure_id' => $procedureId,
                    'competency_level' => 'Tingkat 4A',
                    'status' => $faker->randomElement(['pending', 'approved', 'rejected']),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // 9. Assessments
        $assessmentTemplateId = Str::uuid()->toString();
        DB::table('assessment_templates')->insert([
            'id' => $assessmentTemplateId,
            'type' => 'Mini-CEX',
            'name' => 'Format Mini-CEX Penyakit Dalam',
            'rubric_schema' => json_encode(['components' => ['Anamnesis', 'Pemeriksaan Fisik', 'Profesionalisme', 'Clinical Judgment']]),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ($assignments as $assign) {
            $studentRec = DB::table('students')->where('id', $assign['student_id'])->first();
            DB::table('clinical_assessments')->insert([
                'id' => Str::uuid()->toString(),
                'rotation_assignment_id' => $assign['id'],
                'assessment_template_id' => $assessmentTemplateId,
                'student_id' => $studentRec->user_id,
                'preceptor_id' => $assign['preceptor_id'],
                'assessment_date' => now()->subDays(2)->format('Y-m-d'),
                'total_score' => $faker->randomFloat(2, 70, 95),
                'feedback_notes' => 'Kerja bagus, pertahankan.',
                'status' => 'completed',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 10. Finances (Billing)
        foreach ($hospitals as $hosp) {
            DB::table('billings')->insert([
                'id' => Str::uuid()->toString(),
                'hospital_id' => $hosp['id'],
                'period' => 'Q'.ceil(now()->month / 3).'-'.now()->year,
                'amount' => 50000000,
                'status' => $faker->randomElement(['PENDING', 'PAID']),
                'notes' => 'Tagihan rotasi mahasiswa periode ini',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 11. Examinations (OSCE & CBT)
        $exams = [
            ['id' => Str::uuid()->toString(), 'name' => 'OSCE Akhir Stase IPD', 'type' => 'OSCE', 'stase_id' => $stases[0]['id'], 'status' => 'ONGOING'],
            ['id' => Str::uuid()->toString(), 'name' => 'CBT Ilmu Bedah', 'type' => 'CBT', 'stase_id' => $stases[1]['id'], 'status' => 'DRAFT'],
        ];

        foreach ($exams as $ex) {
            DB::table('exams')->insert([
                'id' => $ex['id'],
                'name' => $ex['name'],
                'type' => $ex['type'],
                'stase_id' => $ex['stase_id'],
                'date' => now()->addDays(rand(-5, 10))->format('Y-m-d'),
                'status' => $ex['status'],
                'description' => 'Ujian akhir komprehensif untuk stase terkait.',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // If OSCE, add stations
            $stations = [];
            if ($ex['type'] === 'OSCE') {
                for ($k = 1; $k <= 4; $k++) {
                    $stationId = Str::uuid()->toString();
                    DB::table('exam_stations')->insert([
                        'id' => $stationId,
                        'exam_id' => $ex['id'],
                        'name' => 'Stasiun '.$k.' - '.$faker->word(),
                        'description' => 'Instruksi untuk penguji di stasiun ini...',
                        'order' => $k,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $stations[] = $stationId;
                }
            }

            // Assign participants
            $examParticipants = [];
            for ($k = 0; $k < 5; $k++) {
                $participantId = Str::uuid()->toString();
                DB::table('exam_participants')->insert([
                    'id' => $participantId,
                    'exam_id' => $ex['id'],
                    'student_id' => $studentUsers[$k]->id,
                    'final_score' => null,
                    'status' => 'REGISTERED',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $examParticipants[] = $participantId;
            }

            // Assign assessors
            if ($ex['type'] === 'OSCE') {
                foreach ($stations as $idx => $stationId) {
                    $assessor = $preceptorUsers[$idx % count($preceptorUsers)];
                    DB::table('exam_assessors')->insert([
                        'id' => Str::uuid()->toString(),
                        'exam_id' => $ex['id'],
                        'exam_station_id' => $stationId,
                        'assessor_id' => $assessor->id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    // Give some random scores
                    if ($ex['status'] === 'ONGOING') {
                        foreach ($examParticipants as $partId) {
                            if (rand(0, 1)) {
                                DB::table('exam_scores')->insert([
                                    'id' => Str::uuid()->toString(),
                                    'exam_participant_id' => $partId,
                                    'exam_station_id' => $stationId,
                                    'assessor_id' => $assessor->id,
                                    'score' => $faker->randomFloat(2, 60, 95),
                                    'feedback' => 'Penjelasan/komunikasi dengan pasien masih kurang.',
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ]);
                            }
                        }
                    }
                }
            } else {
                DB::table('exam_assessors')->insert([
                    'id' => Str::uuid()->toString(),
                    'exam_id' => $ex['id'],
                    'exam_station_id' => null,
                    'assessor_id' => $preceptorUsers[0]->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}
