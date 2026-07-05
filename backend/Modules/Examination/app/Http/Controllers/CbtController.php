<?php

namespace Modules\Examination\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Examination\Models\Exam;
use Modules\Examination\Models\ExamAnswer;
use Modules\Examination\Models\ExamQuestion;
use Modules\Examination\Services\CbtService;

/**
 * CBT online: bank soal (admin) + pengerjaan ujian mahasiswa (attempt).
 */
class CbtController extends Controller
{
    public function __construct(private CbtService $cbt) {}

    // ─────────────── Bank soal (permission manage-examinations) ───────────────

    public function questions(string $examId)
    {
        $exam = Exam::findOrFail($examId);

        return response()->json([
            'data' => $exam->questions()->with('options')->get(),
            'meta' => [
                'total_points' => (int) $exam->questions()->sum('points'),
                'has_answers' => $this->examHasAnswers($exam),
            ],
        ]);
    }

    public function storeQuestion(Request $request, string $examId)
    {
        $exam = Exam::findOrFail($examId);
        if ($resp = $this->guardQuestionMutation($exam)) {
            return $resp;
        }

        $validated = $this->validateQuestion($request);

        $question = DB::transaction(function () use ($exam, $validated) {
            $question = ExamQuestion::create([
                'exam_id' => $exam->id,
                'question_text' => $validated['question_text'],
                'points' => $validated['points'] ?? 1,
                'order' => ($exam->questions()->max('order') ?? 0) + 1,
            ]);
            $this->syncOptions($question, $validated['options']);

            return $question;
        });

        return response()->json([
            'message' => 'Soal ditambahkan.',
            'data' => $question->load('options'),
        ], 201);
    }

    public function updateQuestion(Request $request, string $examId, string $questionId)
    {
        $exam = Exam::findOrFail($examId);
        if ($resp = $this->guardQuestionMutation($exam)) {
            return $resp;
        }

        $question = ExamQuestion::where('exam_id', $exam->id)->findOrFail($questionId);
        $validated = $this->validateQuestion($request);

        DB::transaction(function () use ($question, $validated) {
            $question->update([
                'question_text' => $validated['question_text'],
                'points' => $validated['points'] ?? 1,
            ]);
            $question->options()->delete();
            $this->syncOptions($question, $validated['options']);
        });

        return response()->json([
            'message' => 'Soal diperbarui.',
            'data' => $question->fresh('options'),
        ]);
    }

    public function destroyQuestion(string $examId, string $questionId)
    {
        $exam = Exam::findOrFail($examId);
        if ($resp = $this->guardQuestionMutation($exam)) {
            return $resp;
        }

        ExamQuestion::where('exam_id', $exam->id)->findOrFail($questionId)->delete();

        return response()->json(['message' => 'Soal dihapus.']);
    }

    // ─────────────── Attempt mahasiswa (guard peserta di service) ───────────────

    public function attemptState(Request $request, string $examId)
    {
        $exam = Exam::with('stase')->findOrFail($examId);

        return $this->respond($this->cbt->attemptState($exam, $request->user()));
    }

    public function startAttempt(Request $request, string $examId)
    {
        $exam = Exam::with('stase')->findOrFail($examId);

        return $this->respond($this->cbt->startAttempt($exam, $request->user()));
    }

    public function saveAnswer(Request $request, string $examId)
    {
        $validated = $request->validate([
            'question_id' => 'required|uuid',
            'option_id' => 'required|uuid',
        ]);

        $exam = Exam::findOrFail($examId);

        return $this->respond(
            $this->cbt->saveAnswer($exam, $request->user(), $validated['question_id'], $validated['option_id'])
        );
    }

    public function submitAttempt(Request $request, string $examId)
    {
        $exam = Exam::with('stase')->findOrFail($examId);

        return $this->respond($this->cbt->submit($exam, $request->user()));
    }

    // ─────────────── helpers ───────────────

    private function respond(array $result)
    {
        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], $result['code'] ?? 422);
        }

        return response()->json(['data' => $result]);
    }

    private function validateQuestion(Request $request): array
    {
        $validated = $request->validate([
            'question_text' => 'required|string|max:5000',
            'points' => 'nullable|integer|min:1|max:100',
            'options' => 'required|array|min:2|max:6',
            'options.*.option_text' => 'required|string|max:2000',
            'options.*.is_correct' => 'required|boolean',
        ]);

        $correctCount = collect($validated['options'])->where('is_correct', true)->count();
        if ($correctCount !== 1) {
            abort(response()->json(['message' => 'Tepat SATU opsi harus ditandai benar.'], 422));
        }

        return $validated;
    }

    private function syncOptions(ExamQuestion $question, array $options): void
    {
        foreach ($options as $i => $option) {
            $question->options()->create([
                'option_text' => $option['option_text'],
                'is_correct' => (bool) $option['is_correct'],
                'order' => $i + 1,
            ]);
        }
    }

    /**
     * Soal terkunci setelah ada peserta yang menjawab (jaga fairness).
     */
    private function guardQuestionMutation(Exam $exam)
    {
        if ($this->examHasAnswers($exam)) {
            return response()->json([
                'message' => 'Bank soal terkunci: sudah ada peserta yang menjawab.',
            ], 422);
        }

        return null;
    }

    private function examHasAnswers(Exam $exam): bool
    {
        return ExamAnswer::whereIn(
            'exam_question_id',
            $exam->questions()->pluck('id')
        )->exists();
    }
}
