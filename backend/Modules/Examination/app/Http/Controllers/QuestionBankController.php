<?php

namespace Modules\Examination\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Examination\Models\Exam;
use Modules\Examination\Models\ExamAnswer;
use Modules\Examination\Models\ExamQuestion;
use Modules\Examination\Models\QuestionBankItem;

/**
 * Bank soal reusable lintas ujian (permission manage-examinations di routes):
 * CRUD + import Excel/CSV + salin ke ujian (copy, bukan referensi — ujian
 * menyimpan snapshot soalnya sendiri).
 */
class QuestionBankController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = QuestionBankItem::with(['stase:id,name', 'creator:id,name'])
            ->orderByDesc('created_at');

        if ($request->filled('stase_id')) {
            $query->where('stase_id', $request->stase_id);
        }
        if ($request->filled('difficulty')) {
            $query->where('difficulty', $request->difficulty);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('question_text', 'like', "%{$search}%")
                    ->orWhere('topic', 'like', "%{$search}%");
            });
        }

        $paginator = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateItem($request);
        $validated['created_by'] = $request->user()->id;

        $item = QuestionBankItem::create($validated);

        return response()->json([
            'message' => 'Soal ditambahkan ke bank.',
            'data' => $item,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $item = QuestionBankItem::findOrFail($id);
        $item->update($this->validateItem($request));

        return response()->json([
            'message' => 'Soal bank diperbarui.',
            'data' => $item,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        QuestionBankItem::findOrFail($id)->delete();

        return response()->json(['message' => 'Soal bank dihapus. Ujian yang sudah menyalinnya tidak terpengaruh.']);
    }

    /**
     * Import massal dari Excel/CSV. Heading:
     * question, option_a..option_e, correct (a-e), points?, topic?, difficulty?
     */
    public function import(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv,txt|max:5120',
            'stase_id' => 'nullable|uuid|exists:stases,id',
        ]);

        $import = new class implements ToCollection, WithHeadingRow
        {
            public Collection $rows;

            public function collection(Collection $rows): void
            {
                $this->rows = $rows;
            }
        };
        Excel::import($import, $validated['file']);

        $created = 0;
        $skipped = [];

        foreach ($import->rows as $i => $row) {
            $rowNo = $i + 2; // +1 heading, +1 index-0
            $question = trim((string) ($row['question'] ?? ''));
            $correct = strtolower(trim((string) ($row['correct'] ?? '')));

            if ($question === '' || $correct === '') {
                $skipped[] = ['row' => $rowNo, 'reason' => 'Kolom question/correct kosong.'];

                continue;
            }

            $options = [];
            foreach (['a', 'b', 'c', 'd', 'e'] as $key) {
                $text = trim((string) ($row["option_{$key}"] ?? ''));
                if ($text !== '') {
                    $options[] = ['option_text' => $text, 'is_correct' => $key === $correct];
                }
            }

            if (count($options) < 2 || collect($options)->where('is_correct', true)->count() !== 1) {
                $skipped[] = ['row' => $rowNo, 'reason' => 'Opsi < 2 atau kunci tidak menunjuk opsi yang ada.'];

                continue;
            }

            QuestionBankItem::create([
                'stase_id' => $validated['stase_id'] ?? null,
                'topic' => trim((string) ($row['topic'] ?? '')) ?: null,
                'difficulty' => trim((string) ($row['difficulty'] ?? '')) ?: null,
                'question_text' => $question,
                'options' => $options,
                'points' => max(1, (int) ($row['points'] ?? 1)),
                'created_by' => $request->user()->id,
            ]);
            $created++;
        }

        return response()->json([
            'message' => "Import selesai: {$created} soal masuk bank, ".count($skipped).' baris dilewati.',
            'data' => ['created' => $created, 'skipped' => $skipped],
        ]);
    }

    /** Template import (CSV, dibuka Excel). */
    public function importTemplate()
    {
        $csv = "question,option_a,option_b,option_c,option_d,option_e,correct,points,topic,difficulty\n".
            "Apa tatalaksana awal syok anafilaksis?,Epinefrin IM,Kortikosteroid IV,Antihistamin oral,Observasi,Infus RL,a,2,Kegawatdaruratan,medium\n";

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="template-import-bank-soal.csv"',
        ]);
    }

    /**
     * Salin soal terpilih dari bank ke satu ujian (menghormati lock:
     * ditolak bila sudah ada peserta yang menjawab).
     */
    public function copyToExam(Request $request, string $examId): JsonResponse
    {
        $validated = $request->validate([
            'item_ids' => 'required|array|min:1|max:100',
            'item_ids.*' => 'uuid|exists:question_bank_items,id',
        ]);

        $exam = Exam::findOrFail($examId);

        $hasAnswers = ExamAnswer::whereIn(
            'exam_question_id',
            $exam->questions()->pluck('id')
        )->exists();
        if ($hasAnswers) {
            return response()->json([
                'message' => 'Bank soal ujian terkunci: sudah ada peserta yang menjawab.',
            ], 422);
        }

        $items = QuestionBankItem::whereIn('id', array_unique($validated['item_ids']))->get();
        $copied = 0;

        DB::transaction(function () use ($exam, $items, &$copied) {
            $order = (int) ($exam->questions()->max('order') ?? 0);
            foreach ($items as $item) {
                $question = ExamQuestion::create([
                    'exam_id' => $exam->id,
                    'question_text' => $item->question_text,
                    'points' => $item->points,
                    'order' => ++$order,
                ]);
                foreach ($item->options as $i => $option) {
                    $question->options()->create([
                        'option_text' => $option['option_text'],
                        'is_correct' => (bool) $option['is_correct'],
                        'order' => $i + 1,
                    ]);
                }
                $copied++;
            }
        });

        return response()->json([
            'message' => "{$copied} soal disalin dari bank ke ujian.",
            'data' => ['copied' => $copied],
        ]);
    }

    /** @return array<string, mixed> */
    private function validateItem(Request $request): array
    {
        $validated = $request->validate([
            'stase_id' => 'nullable|uuid|exists:stases,id',
            'topic' => 'nullable|string|max:100',
            'difficulty' => 'nullable|exists:system_references,value,category,question_difficulties',
            'question_text' => 'required|string|max:5000',
            'points' => 'nullable|integer|min:1|max:100',
            'options' => 'required|array|min:2|max:6',
            'options.*.option_text' => 'required|string|max:2000',
            'options.*.is_correct' => 'required|boolean',
        ]);

        if (collect($validated['options'])->where('is_correct', true)->count() !== 1) {
            abort(response()->json(['message' => 'Tepat SATU opsi harus ditandai benar.'], 422));
        }

        $validated['points'] = $validated['points'] ?? 1;

        return $validated;
    }
}
