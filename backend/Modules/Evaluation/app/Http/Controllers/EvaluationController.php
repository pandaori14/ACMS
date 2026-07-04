<?php

namespace Modules\Evaluation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Modules\Evaluation\Models\EvaluationQuestion;
use Modules\Evaluation\Models\EvaluationSubmission;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationAssignment;

class EvaluationController extends Controller
{
    /**
     * Dapatkan daftar pertanyaan untuk evaluasi preceptor dan RS
     */
    public function questions(Request $request)
    {
        $questions = EvaluationQuestion::where('is_active', true)->get();

        return response()->json(['data' => $questions]);
    }

    /**
     * Submit kuesioner evaluasi
     */
    public function submit(Request $request)
    {
        $request->validate([
            'rotation_assignment_id' => 'required|uuid|exists:rotation_assignments,id',
            'evaluations' => 'required|array',
            'evaluations.*.question_id' => 'required|uuid|exists:evaluation_questions,id',
            'evaluations.*.target_id' => 'required|uuid',
            'evaluations.*.target_type' => 'required|string|in:App\Models\User,Modules\Rotation\Models\Hospital',
            'evaluations.*.rating' => 'required|integer|min:1|max:5',
            'evaluations.*.comment' => 'nullable|string',
        ]);

        $user = Auth::user();
        $studentId = $user->student ? $user->student->id : $user->id;

        // Verifikasi bahwa mahasiswa ini memang memiliki assignment tersebut
        $assignment = RotationAssignment::where('id', $request->rotation_assignment_id)
            ->where('student_id', $studentId)
            ->firstOrFail();

        // Cek apakah sudah pernah disubmit untuk mencegah double submission
        $existingSubmission = EvaluationSubmission::where('student_id', $studentId)
            ->where('rotation_assignment_id', $assignment->id)
            ->exists();

        if ($existingSubmission) {
            return response()->json(['message' => 'Anda sudah melakukan evaluasi untuk stase ini.'], 400);
        }

        // Insert semua jawaban
        $submissions = [];
        foreach ($request->evaluations as $eval) {
            $submissions[] = EvaluationSubmission::create([
                'student_id' => $studentId,
                'rotation_assignment_id' => $assignment->id,
                'target_id' => $eval['target_id'],
                'target_type' => $eval['target_type'],
                'evaluation_question_id' => $eval['question_id'],
                'rating' => $eval['rating'],
                'comment' => $eval['comment'] ?? null,
            ]);
        }

        return response()->json([
            'message' => 'Evaluasi berhasil disubmit. Terima kasih atas feedback Anda!',
            'data' => $submissions,
        ]);
    }

    /**
     * Cek status apakah mahasiswa sudah submit evaluasi untuk rotasi tertentu
     */
    public function status(Request $request, $assignment_id)
    {
        $user = Auth::user();
        $studentId = $user->student ? $user->student->id : $user->id;
        $isSubmitted = EvaluationSubmission::where('student_id', $studentId)
            ->where('rotation_assignment_id', $assignment_id)
            ->exists();

        return response()->json([
            'is_submitted' => $isSubmitted,
        ]);
    }

    /**
     * Laporan agregat ANONIM per target (preceptor/RS): rata-rata rating,
     * jumlah responden, rincian per pertanyaan, dan komentar tanpa identitas.
     * Target dengan responden < ambang anonimitas disembunyikan.
     */
    public function report(Request $request)
    {
        $minResponses = max(1, min(10, (int) $request->get('min_responses', 3)));

        $rows = EvaluationSubmission::with('question')
            ->when($request->filled('target_type'), function ($q) use ($request) {
                $type = $request->target_type === 'HOSPITAL'
                    ? Hospital::class
                    : User::class;
                $q->where('target_type', $type);
            })
            ->get();

        $report = $rows
            ->groupBy(fn ($r) => $r->target_type.'|'.$r->target_id)
            ->map(function ($group) {
                /** @var Collection $group */
                $first = $group->first();
                $isHospital = $first->target_type === Hospital::class;

                $targetName = $isHospital
                    ? Hospital::find($first->target_id)?->name
                    : User::find($first->target_id)?->name;

                $perQuestion = $group->groupBy('evaluation_question_id')->map(function ($answers) {
                    return [
                        'question' => $answers->first()->question?->question_text,
                        'average' => round($answers->avg('rating'), 2),
                        'count' => $answers->count(),
                    ];
                })->values();

                return [
                    'target_type' => $isHospital ? 'HOSPITAL' : 'PRECEPTOR',
                    'target_name' => $targetName ?? 'Tidak diketahui',
                    'respondents' => $group->pluck('student_id')->unique()->count(),
                    'average_rating' => round($group->avg('rating'), 2),
                    'per_question' => $perQuestion,
                    // Komentar anonim — tanpa identitas mahasiswa, urutan diacak
                    'comments' => $group->pluck('comment')->filter()->unique()->shuffle()->values(),
                ];
            })
            ->filter(fn ($t) => $t['respondents'] >= $minResponses)
            ->sortBy('target_name')
            ->values();

        return response()->json([
            'data' => $report,
            'meta' => [
                'min_responses' => $minResponses,
                'note' => 'Target dengan responden kurang dari ambang disembunyikan demi anonimitas.',
            ],
        ]);
    }

    // ---------- Bank pertanyaan (manage-academic-master) ----------

    public function allQuestions()
    {
        return response()->json([
            'data' => EvaluationQuestion::withCount('submissions')->orderBy('target_type')->get(),
        ]);
    }

    public function storeQuestion(Request $request)
    {
        $validated = $request->validate([
            'target_type' => 'required|in:PRECEPTOR,HOSPITAL',
            'question_text' => 'required|string|max:500',
            'is_active' => 'boolean',
        ]);

        $question = EvaluationQuestion::create($validated + ['is_active' => $validated['is_active'] ?? true]);

        return response()->json(['message' => 'Pertanyaan ditambahkan.', 'data' => $question], 201);
    }

    public function updateQuestion(Request $request, string $id)
    {
        $question = EvaluationQuestion::findOrFail($id);

        $validated = $request->validate([
            'target_type' => 'sometimes|required|in:PRECEPTOR,HOSPITAL',
            'question_text' => 'sometimes|required|string|max:500',
            'is_active' => 'boolean',
        ]);

        $question->update($validated);

        return response()->json(['message' => 'Pertanyaan diperbarui.', 'data' => $question]);
    }

    public function destroyQuestion(string $id)
    {
        $question = EvaluationQuestion::withCount('submissions')->findOrFail($id);

        if ($question->submissions_count > 0) {
            // Sudah dipakai jawaban → nonaktifkan saja agar data historis utuh
            $question->update(['is_active' => false]);

            return response()->json([
                'message' => 'Pertanyaan sudah memiliki jawaban — dinonaktifkan (tidak dihapus) agar data historis tetap utuh.',
            ]);
        }

        $question->delete();

        return response()->json(['message' => 'Pertanyaan dihapus.']);
    }
}
