<?php

namespace Modules\Evaluation\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Modules\Evaluation\Models\EvaluationQuestion;
use Modules\Evaluation\Models\EvaluationSubmission;
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
}
