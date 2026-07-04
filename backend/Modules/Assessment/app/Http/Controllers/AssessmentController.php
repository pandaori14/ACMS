<?php

namespace Modules\Assessment\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Assessment\Models\AssessmentScore;
use Modules\Assessment\Models\AssessmentTemplate;
use Modules\Assessment\Models\ClinicalAssessment;

class AssessmentController extends Controller
{
    /**
     * Get list of active assessment templates.
     */
    public function getTemplates()
    {
        $templates = AssessmentTemplate::where('is_active', true)->get();

        return response()->json(['data' => $templates]);
    }

    public function storeTemplate(Request $request)
    {
        $request->validate([
            'type' => 'required|string',
            'name' => 'required|string',
            'rubric_schema' => 'required|array',
            'is_active' => 'boolean',
        ]);

        $template = AssessmentTemplate::create($request->all());

        return response()->json(['message' => 'Template created', 'data' => $template], 201);
    }

    public function updateTemplate(Request $request, $id)
    {
        $template = AssessmentTemplate::findOrFail($id);

        $request->validate([
            'type' => 'string',
            'name' => 'string',
            'rubric_schema' => 'array',
            'is_active' => 'boolean',
        ]);

        $template->update($request->all());

        return response()->json(['message' => 'Template updated', 'data' => $template]);
    }

    public function destroyTemplate($id)
    {
        $template = AssessmentTemplate::findOrFail($id);
        $template->delete();

        return response()->json(['message' => 'Template deleted']);
    }

    /**
     * Get assessments based on role (student sees their own, preceptor sees ones they created).
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = ClinicalAssessment::with(['template', 'student', 'preceptor', 'scores']);

        if ($user->hasRole('Mahasiswa')) {
            $query->where('student_id', $user->id);
        } elseif ($user->hasRole('Dodiknis') || $user->hasRole('Dosen')) {
            $query->where('preceptor_id', $user->id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $assessments = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json([
            'data' => $assessments->items(),
            'meta' => [
                'current_page' => $assessments->currentPage(),
                'last_page' => $assessments->lastPage(),
                'per_page' => $assessments->perPage(),
                'total' => $assessments->total(),
            ],
        ]);
    }

    /**
     * Store a new assessment (performed by preceptor).
     */
    public function store(Request $request)
    {
        $request->validate([
            'rotation_assignment_id' => 'required|uuid|exists:rotation_assignments,id',
            'assessment_template_id' => 'required|uuid|exists:assessment_templates,id',
            'student_id' => 'required|uuid|exists:users,id',
            'assessment_date' => 'required|date',
            'scores' => 'required|array', // key => score
            'feedback_notes' => 'required|string',
            'status' => 'required|in:draft,submitted',
        ]);

        $user = $request->user();
        if (! $user->hasRole(['Dodiknis', 'Dosen', 'Super Admin', 'Admin Prodi'])) {
            return response()->json(['message' => 'Unauthorized to create assessments.'], 403);
        }

        // Dodiknis RLS Check
        if ($user->hasRole('Dodiknis')) {
            $hospitalIds = DB::table('hospital_user')->where('user_id', $user->id)->pluck('hospital_id');
            $assignment = DB::table('rotation_assignments')->where('id', $request->rotation_assignment_id)->first();
            if (! $assignment || ! $hospitalIds->contains($assignment->hospital_id)) {
                return response()->json(['message' => 'Unauthorized. You cannot assess a student not assigned to your hospital.'], 403);
            }
        }

        DB::beginTransaction();
        try {
            // Strict Validation: Validate scores against the template rubric_schema
            $template = AssessmentTemplate::findOrFail($request->assessment_template_id);
            [$validScores, $totalScore] = $this->computeScores($template, $request->scores);

            $assessment = ClinicalAssessment::create([
                'rotation_assignment_id' => $request->rotation_assignment_id,
                'assessment_template_id' => $request->assessment_template_id,
                'student_id' => $request->student_id,
                'preceptor_id' => $user->id,
                'assessment_date' => $request->assessment_date,
                'total_score' => $totalScore,
                'feedback_notes' => $request->feedback_notes,
                'status' => $request->status,
            ]);

            foreach ($validScores as $key => $scoreValue) {
                AssessmentScore::create([
                    'clinical_assessment_id' => $assessment->id,
                    'rubric_key' => $key,
                    'score' => $scoreValue,
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Assessment created successfully',
                'data' => $assessment->load('scores'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Failed to create assessment'], 500);
        }
    }

    /**
     * Get a specific assessment.
     */
    public function show(Request $request, $id)
    {
        $assessment = ClinicalAssessment::with(['template', 'student', 'preceptor', 'scores'])->findOrFail($id);

        $user = $request->user();
        // RLS Check for Mahasiswa
        if ($user->hasRole('Mahasiswa')) {
            $student = DB::table('students')->where('user_id', $user->id)->first();
            if (! $student || $assessment->student_id !== $student->id) {
                return response()->json(['message' => 'Unauthorized to view this assessment.'], 403);
            }
        }

        // RLS Check for Dodiknis/Dosen (only their own assessments or assigned students)
        if ($user->hasRole(['Dodiknis', 'Dosen']) && $assessment->preceptor_id !== $user->id) {
            // Alternatively, allow if the student is assigned to their hospital
            return response()->json(['message' => 'Unauthorized. This assessment was done by another preceptor.'], 403);
        }

        return response()->json(['data' => $assessment]);
    }

    /**
     * Update an assessment (creator preceptor or admin) — locked once acknowledged.
     */
    public function update(Request $request, $id)
    {
        $assessment = ClinicalAssessment::with('scores')->findOrFail($id);
        $user = $request->user();

        if (! $this->canManage($user, $assessment)) {
            return response()->json(['message' => 'Anda tidak berhak mengubah penilaian ini.'], 403);
        }

        if ($assessment->status === 'acknowledged' && ! $user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Penilaian yang sudah di-acknowledge mahasiswa terkunci dan tidak dapat diubah.'], 422);
        }

        $request->validate([
            'assessment_date' => 'sometimes|required|date',
            'scores' => 'sometimes|required|array',
            'feedback_notes' => 'sometimes|required|string',
            'status' => 'sometimes|required|in:draft,submitted',
        ]);

        DB::beginTransaction();
        try {
            $data = $request->only(['assessment_date', 'feedback_notes', 'status']);

            if ($request->has('scores')) {
                $template = AssessmentTemplate::findOrFail($assessment->assessment_template_id);
                [$validScores, $totalScore] = $this->computeScores($template, $request->scores);

                $assessment->scores()->delete();
                foreach ($validScores as $key => $scoreValue) {
                    AssessmentScore::create([
                        'clinical_assessment_id' => $assessment->id,
                        'rubric_key' => $key,
                        'score' => $scoreValue,
                    ]);
                }
                $data['total_score'] = $totalScore;
            }

            $assessment->update($data);
            DB::commit();

            return response()->json([
                'message' => 'Penilaian berhasil diperbarui.',
                'data' => $assessment->fresh(['template', 'student', 'preceptor', 'scores']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['message' => 'Gagal memperbarui penilaian.'], 500);
        }
    }

    /**
     * Delete an assessment — locked once acknowledged (except Super Admin).
     */
    public function destroy(Request $request, $id)
    {
        $assessment = ClinicalAssessment::findOrFail($id);
        $user = $request->user();

        if (! $this->canManage($user, $assessment)) {
            return response()->json(['message' => 'Anda tidak berhak menghapus penilaian ini.'], 403);
        }

        if ($assessment->status === 'acknowledged' && ! $user->hasRole('Super Admin')) {
            return response()->json(['message' => 'Penilaian yang sudah di-acknowledge mahasiswa terkunci dan tidak dapat dihapus.'], 422);
        }

        DB::transaction(function () use ($assessment) {
            $assessment->scores()->delete();
            $assessment->delete();
        });

        return response()->json(['message' => 'Penilaian berhasil dihapus.']);
    }

    /**
     * Kreator penilaian, atau admin (Super Admin/Admin Prodi), boleh mengelola.
     */
    private function canManage($user, ClinicalAssessment $assessment): bool
    {
        return $assessment->preceptor_id === $user->id
            || $user->hasRole(['Super Admin', 'Admin Prodi']);
    }

    /**
     * Validasi skor terhadap rubric_schema template; kembalikan [skor valid, total].
     *
     * @return array{0: array<string, float>, 1: float}
     */
    private function computeScores(AssessmentTemplate $template, array $scores): array
    {
        $indicators = $template->rubric_schema['indicators'] ?? [];
        $validScores = [];
        $totalScore = 0;

        foreach ($indicators as $indicator) {
            $key = $indicator['key'];
            $weight = $indicator['weight'] ?? 0;
            $maxScore = $indicator['max_score'] ?? 100;

            $submittedScore = $scores[$key] ?? 0;
            $submittedScore = min(max(0, (float) $submittedScore), (float) $maxScore);

            $validScores[$key] = $submittedScore;

            if (isset($indicator['weight'])) {
                $totalScore += ($submittedScore / $maxScore) * $weight;
            } else {
                $totalScore += $submittedScore;
            }
        }

        return [$validScores, $totalScore];
    }

    /**
     * Acknowledge an assessment (performed by student).
     */
    public function acknowledge(Request $request, $id)
    {
        $user = $request->user();
        $assessment = ClinicalAssessment::findOrFail($id);

        if ($assessment->student_id !== $user->id) {
            return response()->json(['message' => 'You can only acknowledge your own assessments.'], 403);
        }

        if ($assessment->status !== 'submitted') {
            return response()->json(['message' => 'Only submitted assessments can be acknowledged.'], 400);
        }

        $assessment->update([
            'status' => 'acknowledged',
            'acknowledged_at' => now(),
        ]);

        return response()->json(['message' => 'Assessment acknowledged successfully', 'data' => $assessment]);
    }
}
