<?php

namespace Database\Seeders;

use App\Models\User;
use Carbon\Carbon;
use Faker\Factory as Faker;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MassiveDummySeeder extends Seeder
{
    public function run()
    {
        $faker = Faker::create('id_ID');

        // Disable query log to save memory for massive seeding
        DB::disableQueryLog();

        $this->command->info('Creating Faculties and Programs...');

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

        $this->command->info('Creating Stases and Competencies...');

        // 2. Stase
        $stases = [
            ['id' => Str::uuid()->toString(), 'code' => 'IPD', 'name' => 'Ilmu Penyakit Dalam', 'duration_weeks' => 10, 'passing_grade' => 75, 'is_mandatory' => 1, 'color_code' => '#FF5733'],
            ['id' => Str::uuid()->toString(), 'code' => 'IB', 'name' => 'Ilmu Bedah', 'duration_weeks' => 10, 'passing_grade' => 75, 'is_mandatory' => 1, 'color_code' => '#33FF57'],
            ['id' => Str::uuid()->toString(), 'code' => 'IKA', 'name' => 'Ilmu Kesehatan Anak', 'duration_weeks' => 10, 'passing_grade' => 75, 'is_mandatory' => 1, 'color_code' => '#3357FF'],
            ['id' => Str::uuid()->toString(), 'code' => 'OBG', 'name' => 'Obstetri dan Ginekologi', 'duration_weeks' => 10, 'passing_grade' => 75, 'is_mandatory' => 1, 'color_code' => '#F033FF'],
            ['id' => Str::uuid()->toString(), 'code' => 'IKM', 'name' => 'Ilmu Kesehatan Masyarakat', 'duration_weeks' => 8, 'passing_grade' => 70, 'is_mandatory' => 1, 'color_code' => '#FFC300'],
            ['id' => Str::uuid()->toString(), 'code' => 'NEU', 'name' => 'Ilmu Penyakit Saraf', 'duration_weeks' => 4, 'passing_grade' => 75, 'is_mandatory' => 1, 'color_code' => '#900C3F'],
            ['id' => Str::uuid()->toString(), 'code' => 'THT', 'name' => 'Ilmu THT-KL', 'duration_weeks' => 4, 'passing_grade' => 75, 'is_mandatory' => 1, 'color_code' => '#581845'],
            ['id' => Str::uuid()->toString(), 'code' => 'MATA', 'name' => 'Ilmu Kesehatan Mata', 'duration_weeks' => 4, 'passing_grade' => 75, 'is_mandatory' => 1, 'color_code' => '#00FFFF'],
            ['id' => Str::uuid()->toString(), 'code' => 'KULIT', 'name' => 'Dermatologi dan Venereologi', 'duration_weeks' => 4, 'passing_grade' => 75, 'is_mandatory' => 1, 'color_code' => '#FF00FF'],
            ['id' => Str::uuid()->toString(), 'code' => 'JIWA', 'name' => 'Ilmu Kedokteran Jiwa', 'duration_weeks' => 4, 'passing_grade' => 75, 'is_mandatory' => 1, 'color_code' => '#C0C0C0'],
        ];

        $staseData = [];
        foreach ($stases as $stase) {
            $staseData[] = [
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
            ];
        }
        DB::table('stases')->insert($staseData);

        // 3. Competencies (10 per stase)
        $competencyData = [];
        foreach ($stases as $stase) {
            for ($i = 0; $i < 10; $i++) {
                $competencyData[] = [
                    'id' => Str::uuid()->toString(),
                    'name' => 'Keterampilan / Penyakit '.$faker->words(3, true).' ('.$stase['code'].')',
                    'type' => $faker->randomElement(['disease', 'skill']),
                    'category' => $faker->randomElement(['SKDI 4A', 'SKDI 3B', 'SKDI 3A', 'SKDI 2']),
                    'level' => $faker->randomElement(['Mampu Tatalaksana', 'Mampu Mendiagnosis', 'Pernah Melihat']),
                    'stase_id' => $stase['id'],
                    'description' => $faker->sentence(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }
        // Insert chunks of competencies
        foreach (array_chunk($competencyData, 100) as $chunk) {
            DB::table('competencies')->insert($chunk);
        }

        $this->command->info('Creating Hospitals...');

        // 4. Hospitals (1 Utama, 9 Jejaring)
        $hospitals = [
            ['id' => Str::uuid()->toString(), 'code' => 'RSUD-UT', 'name' => 'RSUD Pendidikan Utama Provinsi', 'type' => 'Pendidikan Utama', 'address' => $faker->address()],
        ];
        for ($i = 1; $i <= 9; $i++) {
            $hospitals[] = [
                'id' => Str::uuid()->toString(),
                'code' => 'RSJ-'.$i,
                'name' => 'RS Jejaring Daerah '.$faker->city(),
                'type' => 'Jejaring',
                'address' => $faker->address(),
            ];
        }

        $hospitalData = [];
        foreach ($hospitals as $hosp) {
            $hospitalData[] = [
                'id' => $hosp['id'],
                'code' => $hosp['code'],
                'name' => $hosp['name'],
                'type' => $hosp['type'],
                'address' => $hosp['address'],
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        DB::table('hospitals')->insert($hospitalData);

        $this->command->info('Creating 100 Students and 30 Preceptors...');

        // 5. Users (100 Mahasiswa & 30 Dodiknis)
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
        $studentData = [];

        for ($i = 1; $i <= 100; $i++) {
            $user = User::create([
                'name' => $faker->name(),
                'email' => "koass$i@acms.id",
                'password' => Hash::make('password'),
                'identity_number' => 'NIM'.$faker->numerify('26########'),
                'status' => 'active',
                'program_id' => $programId,
            ]);
            $user->assignRole('Mahasiswa');
            $studentUsers[] = $user;

            $studentData[] = [
                'id' => Str::uuid()->toString(),
                'user_id' => $user->id,
                'program_id' => $programId,
                'cohort_id' => $cohortId,
                'status' => 'active',
                'enrollment_date' => Carbon::now()->subMonths(6)->format('Y-m-d'),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        foreach (array_chunk($studentData, 50) as $chunk) {
            DB::table('students')->insert($chunk);
        }

        // Map user ID to student DB records for easy access
        $studentRecords = DB::table('students')->get()->keyBy('user_id');

        $preceptorUsers = [];
        $hospitalUserData = [];
        for ($i = 1; $i <= 30; $i++) {
            $user = User::create([
                'name' => 'dr. '.$faker->lastName().', Sp.'.$faker->lexify('??'),
                'email' => "dodiknis$i@acms.id",
                'password' => Hash::make('password'),
                'identity_number' => 'NIP'.$faker->numerify('198#######'),
                'status' => 'active',
            ]);
            $user->assignRole('Dodiknis');

            // Assign to 1-2 random hospitals
            $assignedHospitals = $faker->randomElements($hospitals, rand(1, 2));
            foreach ($assignedHospitals as $hosp) {
                $hospitalUserData[] = [
                    'user_id' => $user->id,
                    'hospital_id' => $hosp['id'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            $preceptorUsers[] = $user;
        }

        foreach (array_chunk($hospitalUserData, 50) as $chunk) {
            DB::table('hospital_user')->insert($chunk);
        }

        $this->command->info('Creating Rotation Periods and Assignments...');

        // 6. Rotation Periods & Assignments
        // Create 2 periods: One active now, one past
        $periods = [
            [
                'id' => Str::uuid()->toString(),
                'program_id' => $programId,
                'name' => 'Periode Lalu '.now()->subMonths(3)->format('M Y'),
                'start_date' => now()->subMonths(3)->format('Y-m-d'),
                'end_date' => now()->subMonths(1)->format('Y-m-d'),
                'status' => 'completed',
            ],
            [
                'id' => Str::uuid()->toString(),
                'program_id' => $programId,
                'name' => 'Periode Aktif '.now()->format('M Y'),
                'start_date' => now()->subDays(15)->format('Y-m-d'),
                'end_date' => now()->addWeeks(6)->format('Y-m-d'),
                'status' => 'active',
            ],
        ];

        foreach ($periods as $period) {
            DB::table('rotation_periods')->insert(array_merge($period, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }

        $assignments = [];
        $assignmentData = [];

        // For each student, assign them to a past rotation and current rotation
        foreach ($studentUsers as $idx => $user) {
            $student = $studentRecords[$user->id];

            // Past Period Assignment
            $pastStase = $stases[($idx + 1) % count($stases)];
            $pastPreceptor = $faker->randomElement($preceptorUsers);
            $pastHospId = DB::table('hospital_user')->where('user_id', $pastPreceptor->id)->first()->hospital_id;

            $pastAssignmentId = Str::uuid()->toString();
            $assignmentData[] = [
                'id' => $pastAssignmentId,
                'rotation_period_id' => $periods[0]['id'],
                'student_id' => $student->id,
                'stase_id' => $pastStase['id'],
                'hospital_id' => $pastHospId,
                'preceptor_id' => $pastPreceptor->id,
                'status' => 'completed',
                'created_at' => now()->subMonths(3),
                'updated_at' => now()->subMonths(1),
            ];
            $assignments[] = [
                'id' => $pastAssignmentId,
                'period_type' => 'past',
                'student_id' => $student->id,
                'user_id' => $user->id,
                'preceptor_id' => $pastPreceptor->id,
                'stase_id' => $pastStase['id'],
            ];

            // Current Period Assignment
            $currStase = $stases[$idx % count($stases)];
            $currPreceptor = $faker->randomElement($preceptorUsers);
            $currHospId = DB::table('hospital_user')->where('user_id', $currPreceptor->id)->first()->hospital_id;

            $currAssignmentId = Str::uuid()->toString();
            $assignmentData[] = [
                'id' => $currAssignmentId,
                'rotation_period_id' => $periods[1]['id'],
                'student_id' => $student->id,
                'stase_id' => $currStase['id'],
                'hospital_id' => $currHospId,
                'preceptor_id' => $currPreceptor->id,
                'status' => 'active',
                'created_at' => now()->subDays(15),
                'updated_at' => now(),
            ];
            $assignments[] = [
                'id' => $currAssignmentId,
                'period_type' => 'current',
                'student_id' => $student->id,
                'user_id' => $user->id,
                'preceptor_id' => $currPreceptor->id,
                'stase_id' => $currStase['id'],
            ];
        }

        foreach (array_chunk($assignmentData, 100) as $chunk) {
            DB::table('rotation_assignments')->insert($chunk);
        }

        $this->command->info('Creating Diagnoses, Procedures and Logbooks...');

        // 7. Diagnoses & Procedures (Create 50 each)
        $diagnosesData = [];
        $diagnosesIds = [];
        for ($i = 0; $i < 50; $i++) {
            $id = Str::uuid()->toString();
            $diagnosesIds[] = $id;
            $diagnosesData[] = [
                'id' => $id,
                'icd_code' => $faker->bothify('?##.#'),
                'name' => $faker->words(4, true).' Disease',
                'category' => $faker->randomElement(['Infectious', 'Cardiovascular', 'Respiratory', 'Digestive', 'Nervous']),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        DB::table('diagnoses')->insert($diagnosesData);

        $proceduresData = [];
        $procedureIds = [];
        for ($i = 0; $i < 50; $i++) {
            $id = Str::uuid()->toString();
            $procedureIds[] = $id;
            $proceduresData[] = [
                'id' => $id,
                'code' => $faker->numerify('P-###'),
                'name' => 'Tindakan '.$faker->words(2, true),
                'category' => $faker->randomElement(['Clinical Skill', 'Surgical', 'Diagnostic', 'Therapeutic']),
                'description' => $faker->sentence(),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        DB::table('procedures')->insert($proceduresData);

        // 8. Logbooks
        // For past assignments, create ~20 logs each. For current, ~10 logs each. Total around 3000 logs.
        $logbookData = [];
        foreach ($assignments as $assign) {
            $logCount = $assign['period_type'] === 'past' ? rand(15, 25) : rand(5, 12);
            $baseDate = $assign['period_type'] === 'past' ? now()->subMonths(2) : now()->subDays(10);

            for ($j = 0; $j < $logCount; $j++) {
                $status = $assign['period_type'] === 'past'
                    ? $faker->randomElement(['approved', 'approved', 'approved', 'rejected'])
                    : $faker->randomElement(['pending', 'approved', 'pending']);

                $logbookData[] = [
                    'id' => Str::uuid()->toString(),
                    'rotation_assignment_id' => $assign['id'],
                    'student_id' => $assign['student_id'],
                    'preceptor_id' => $assign['preceptor_id'],
                    'activity_date' => (clone $baseDate)->addDays(rand(1, 40))->format('Y-m-d'),
                    'activity_type' => $faker->randomElement(['Case Report', 'Clinical Procedure', 'Morning Report', 'Journal Reading', 'Mini-CEX']),
                    'description' => $faker->sentence(10),
                    'patient_initials' => strtoupper($faker->lexify('??')),
                    'medical_record_no' => $faker->numerify('RM-######'),
                    'diagnosis_id' => $faker->randomElement($diagnosesIds),
                    'procedure_id' => rand(0, 1) ? $faker->randomElement($procedureIds) : null,
                    'competency_level' => $faker->randomElement(['Tingkat 1', 'Tingkat 2', 'Tingkat 3A', 'Tingkat 3B', 'Tingkat 4A']),
                    'status' => $status,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        foreach (array_chunk($logbookData, 250) as $chunk) {
            DB::table('logbook_entries')->insert($chunk);
        }

        $this->command->info('Creating Assessments and Exams...');

        // 9. Assessments
        $assessmentTemplateId = Str::uuid()->toString();
        DB::table('assessment_templates')->insert([
            'id' => $assessmentTemplateId,
            'type' => 'Mini-CEX',
            'name' => 'Format Mini-CEX Standar Nasional',
            'rubric_schema' => json_encode([
                'max_total_score' => 100,
                'indicators' => [
                    ['key' => 'anamnesis', 'label' => 'Kemampuan Anamnesis', 'max_score' => 100, 'weight' => 25],
                    ['key' => 'fisik', 'label' => 'Pemeriksaan Fisik', 'max_score' => 100, 'weight' => 25],
                    ['key' => 'profesionalisme', 'label' => 'Profesionalisme', 'max_score' => 100, 'weight' => 20],
                    ['key' => 'judgment', 'label' => 'Clinical Judgment', 'max_score' => 100, 'weight' => 30],
                ],
            ]),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $clinicalAssessments = [];
        foreach ($assignments as $assign) {
            if ($assign['period_type'] === 'past' || rand(0, 1)) {
                $clinicalAssessments[] = [
                    'id' => Str::uuid()->toString(),
                    'rotation_assignment_id' => $assign['id'],
                    'assessment_template_id' => $assessmentTemplateId,
                    'student_id' => $assign['user_id'], // Notice: controller uses user_id
                    'preceptor_id' => $assign['preceptor_id'],
                    'assessment_date' => now()->subDays(rand(1, 30))->format('Y-m-d'),
                    'total_score' => $faker->randomFloat(2, 65, 95),
                    'feedback_notes' => $faker->paragraph(),
                    'status' => 'completed',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }
        foreach (array_chunk($clinicalAssessments, 100) as $chunk) {
            DB::table('clinical_assessments')->insert($chunk);
        }

        // 10. Finances (Billing)
        // 1 bill per hospital per period
        $billings = [];
        foreach ($hospitals as $hosp) {
            foreach (['Q1-2026', 'Q2-2026'] as $billingPeriod) {
                $billings[] = [
                    'id' => Str::uuid()->toString(),
                    'hospital_id' => $hosp['id'],
                    'period' => $billingPeriod,
                    'amount' => $faker->randomFloat(2, 20000000, 150000000), // 20 - 150 mil
                    'status' => $billingPeriod === 'Q1-2026' ? 'PAID' : $faker->randomElement(['PENDING', 'PAID']),
                    'notes' => 'Tagihan rotasi koass',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }
        DB::table('billings')->insert($billings);

        // 11. Examinations (OSCE & CBT for all Stases)
        $exams = [];
        foreach ($stases as $stase) {
            $exams[] = ['id' => Str::uuid()->toString(), 'name' => 'OSCE Komprehensif '.$stase['code'], 'type' => 'OSCE', 'stase_id' => $stase['id'], 'status' => 'COMPLETED'];
            $exams[] = ['id' => Str::uuid()->toString(), 'name' => 'CBT Akhir Stase '.$stase['code'], 'type' => 'CBT', 'stase_id' => $stase['id'], 'status' => 'COMPLETED'];
        }

        $examData = [];
        foreach ($exams as $ex) {
            $examData[] = [
                'id' => $ex['id'],
                'name' => $ex['name'],
                'type' => $ex['type'],
                'stase_id' => $ex['stase_id'],
                'date' => now()->subDays(rand(5, 60))->format('Y-m-d'),
                'status' => $ex['status'],
                'description' => 'Ujian akhir stase.',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        DB::table('exams')->insert($examData);

        // Assign stations, assessors, participants, scores for OSCE
        foreach ($exams as $ex) {
            if ($ex['type'] === 'OSCE') {
                $stations = [];
                for ($k = 1; $k <= 4; $k++) {
                    $stationId = Str::uuid()->toString();
                    DB::table('exam_stations')->insert([
                        'id' => $stationId,
                        'exam_id' => $ex['id'],
                        'name' => 'Stasiun '.$k.' - '.$faker->word(),
                        'assessment_template_id' => $assessmentTemplateId,
                        'description' => 'Instruksi: Lakukan pemeriksaan...',
                        'order' => $k,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $stations[] = $stationId;
                }

                // Find students who had this stase in the past
                $staseParticipants = collect($assignments)->where('stase_id', $ex['stase_id'])->where('period_type', 'past')->take(10);

                $examParticipantIds = [];
                foreach ($staseParticipants as $sp) {
                    $participantId = Str::uuid()->toString();
                    DB::table('exam_participants')->insert([
                        'id' => $participantId,
                        'exam_id' => $ex['id'],
                        'student_id' => $sp['user_id'],
                        'final_score' => $faker->randomFloat(2, 60, 95),
                        'status' => 'COMPLETED',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $examParticipantIds[] = $participantId;
                }

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

                    foreach ($examParticipantIds as $partId) {
                        $scoreId = Str::uuid()->toString();
                        DB::table('exam_scores')->insert([
                            'id' => $scoreId,
                            'exam_participant_id' => $partId,
                            'exam_station_id' => $stationId,
                            'assessor_id' => $assessor->id,
                            'score' => $faker->randomFloat(2, 65, 95),
                            'feedback' => $faker->sentence(),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);

                        // Insert score details based on the template
                        DB::table('exam_score_details')->insert([
                            ['id' => Str::uuid()->toString(), 'exam_score_id' => $scoreId, 'rubric_key' => 'anamnesis', 'score' => rand(65, 95)],
                            ['id' => Str::uuid()->toString(), 'exam_score_id' => $scoreId, 'rubric_key' => 'fisik', 'score' => rand(65, 95)],
                            ['id' => Str::uuid()->toString(), 'exam_score_id' => $scoreId, 'rubric_key' => 'profesionalisme', 'score' => rand(65, 95)],
                            ['id' => Str::uuid()->toString(), 'exam_score_id' => $scoreId, 'rubric_key' => 'judgment', 'score' => rand(65, 95)],
                        ]);
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

        $this->command->info('Database seeding completed successfully!');
    }
}
