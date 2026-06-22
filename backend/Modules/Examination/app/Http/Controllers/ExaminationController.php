<?php

namespace Modules\Examination\Http\Controllers;

use App\Http\Controllers\Controller;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Examination\Models\Exam;
use Modules\Examination\Models\ExamAssessor;
use Modules\Examination\Models\ExamParticipant;
use Modules\Examination\Models\ExamScore;
use Modules\Examination\Models\ExamScoreDetail;
use Modules\Examination\Models\ExamStation;

class ExaminationController extends Controller
{
    /**
     * Display a listing of the exams.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Exam::with(['stase']);

        if ($user->hasRole('Mahasiswa')) {
            $query->whereHas('participants', function ($q) use ($user) {
                $q->where('student_id', $user->id);
            });
        } elseif ($user->hasRole(['Dodiknis', 'Dosen'])) {
            $query->whereHas('assessors', function ($q) use ($user) {
                $q->where('assessor_id', $user->id);
            });
        }

        $exams = $query->orderBy('date', 'desc')->get();

        return response()->json(['data' => $exams]);
    }

    /**
     * Store a newly created exam.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:OSCE,CBT,WRITTEN',
            'stase_id' => 'required|uuid|exists:stases,id',
            'date' => 'required|date',
            'description' => 'nullable|string',
            'stations' => 'nullable|array',
            'stations.*.name' => 'required|string',
            'stations.*.description' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $exam = Exam::create([
                'name' => $request->name,
                'type' => $request->type,
                'stase_id' => $request->stase_id,
                'date' => $request->date,
                'status' => 'DRAFT',
                'description' => $request->description,
            ]);

            if ($request->has('stations') && is_array($request->stations)) {
                foreach ($request->stations as $idx => $station) {
                    ExamStation::create([
                        'exam_id' => $exam->id,
                        'name' => $station['name'],
                        'description' => $station['description'] ?? null,
                        'order' => $idx + 1,
                    ]);
                }
            }

            DB::commit();

            return response()->json(['message' => 'Exam created successfully', 'data' => $exam->load('stations')], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Failed to create exam'], 500);
        }
    }

    /**
     * Show the specified exam with details.
     */
    public function show($id)
    {
        $exam = Exam::with([
            'stase',
            'stations.assessmentTemplate',
            'participants.student',
            'participants.scores',
            'assessors.assessor',
            'assessors.examStation.assessmentTemplate',
        ])->findOrFail($id);

        return response()->json(['data' => $exam]);
    }

    /**
     * Assign a participant to the exam.
     */
    public function assignParticipant(Request $request, $id)
    {
        $request->validate([
            'student_id' => 'required|uuid|exists:users,id',
        ]);

        $exam = Exam::findOrFail($id);

        $participant = ExamParticipant::firstOrCreate([
            'exam_id' => $exam->id,
            'student_id' => $request->student_id,
        ]);

        return response()->json(['message' => 'Participant assigned', 'data' => $participant->load('student')]);
    }

    /**
     * Assign an assessor to the exam/station.
     */
    public function assignAssessor(Request $request, $id)
    {
        $request->validate([
            'assessor_id' => 'required|uuid|exists:users,id',
            'exam_station_id' => 'nullable|uuid|exists:exam_stations,id',
        ]);

        $exam = Exam::findOrFail($id);

        $assessor = ExamAssessor::firstOrCreate([
            'exam_id' => $exam->id,
            'exam_station_id' => $request->exam_station_id,
            'assessor_id' => $request->assessor_id,
        ]);

        return response()->json(['message' => 'Assessor assigned', 'data' => $assessor->load(['assessor', 'examStation'])]);
    }

    public function storeScore(Request $request, $id)
    {
        $request->validate([
            'exam_participant_id' => 'required|uuid|exists:exam_participants,id',
            'exam_station_id' => 'nullable|uuid|exists:exam_stations,id',
            'score' => 'nullable|numeric|min:0|max:100', // Either score is provided directly
            'rubric_scores' => 'nullable|array', // Or rubric scores are provided
            'feedback' => 'nullable|string',
        ]);

        $exam = Exam::findOrFail($id);
        $user = $request->user();

        // Verify the user is an assigned assessor
        $isAssessor = ExamAssessor::where('exam_id', $exam->id)
            ->where('assessor_id', $user->id)
            ->when($request->exam_station_id, function ($q) use ($request) {
                return $q->where('exam_station_id', $request->exam_station_id);
            })
            ->exists();

        if (! $isAssessor && ! $user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized to score this station'], 403);
        }

        // Calculate score logic
        $finalScore = $request->score ?? 0;
        $detailsToSave = [];

        if ($request->exam_station_id && $request->has('rubric_scores')) {
            $station = ExamStation::with('assessmentTemplate')->find($request->exam_station_id);
            if ($station && $station->assessmentTemplate) {
                $template = $station->assessmentTemplate;
                $indicators = $template->rubric_schema['indicators'] ?? [];

                $calculatedScore = 0;
                foreach ($indicators as $indicator) {
                    $key = $indicator['key'];
                    $weight = $indicator['weight'] ?? 0; // percentage out of 100
                    $maxScore = $indicator['max_score'] ?? 100;

                    $submitted = $request->rubric_scores[$key] ?? 0;
                    $submitted = min(max(0, (float) $submitted), (float) $maxScore);

                    // If weight is specified, calculate weighted score. Otherwise, sum directly.
                    if (isset($indicator['weight'])) {
                        // normalized score * weight percentage
                        $calculatedScore += ($submitted / $maxScore) * $weight;
                    } else {
                        $calculatedScore += $submitted;
                    }

                    $detailsToSave[$key] = $submitted;
                }

                // If the template uses weight, the calculated score is already out of total weights (usually 100)
                $finalScore = $calculatedScore;
            }
        }

        DB::beginTransaction();
        try {
            $scoreRecord = ExamScore::updateOrCreate(
                [
                    'exam_participant_id' => $request->exam_participant_id,
                    'exam_station_id' => $request->exam_station_id,
                    'assessor_id' => $user->id,
                ],
                [
                    'score' => $finalScore,
                    'feedback' => $request->feedback,
                ]
            );

            // Store details
            foreach ($detailsToSave as $key => $val) {
                ExamScoreDetail::updateOrCreate(
                    [
                        'exam_score_id' => $scoreRecord->id,
                        'rubric_key' => $key,
                    ],
                    [
                        'score' => $val,
                    ]
                );
            }

            DB::commit();

            return response()->json(['message' => 'Score recorded', 'data' => $scoreRecord->load('details')]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Failed to save score'], 500);
        }
    }

    public function changeStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:DRAFT,ONGOING,COMPLETED',
        ]);

        $exam = Exam::findOrFail($id);
        $exam->status = $request->status;
        $exam->save();

        return response()->json(['message' => 'Status updated', 'data' => $exam]);
    }

    public function exportPdf($id)
    {
        $exam = Exam::with([
            'participants.student.user',
            'stations',
            'assessors.assessor',
            'participants.scores',
        ])->findOrFail($id);

        $pdf = Pdf::loadView('examination::pdf.report', compact('exam'));

        return $pdf->download('Berita_Acara_Ujian_'.str_replace(' ', '_', $exam->name).'.pdf');
    }
}
