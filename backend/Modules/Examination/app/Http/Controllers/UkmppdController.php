<?php

namespace Modules\Examination\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Academic\Models\Student;
use Modules\Assessment\Models\StaseGrade;
use Modules\Examination\Models\ExamParticipant;
use Modules\Examination\Models\UkmppdResult;

/**
 * Tracking UKMPPD (exit exam nasional):
 * - Admin ujian (manage-examinations): CRUD hasil per percobaan + rekap
 *   pass-rate per angkatan.
 * - Mahasiswa: riwayat percobaannya sendiri + readiness score (prediksi
 *   kesiapan dari nilai stase & CBT internal).
 */
class UkmppdController extends Controller
{
    /** Daftar hasil (admin): filter cohort/status. */
    public function index(Request $request): JsonResponse
    {
        $query = UkmppdResult::with('student:id,name,identity_number')
            ->orderByDesc('exam_date');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('cohort_id')) {
            $userIds = Student::where('cohort_id', $request->cohort_id)->pluck('user_id');
            $query->whereIn('student_id', $userIds);
        }

        $results = $query->limit(300)->get();

        return response()->json([
            'data' => $results,
            'meta' => [
                'total' => $results->count(),
                'passed' => $results->where('status', 'passed')->count(),
                // First-taker pass rate: % lulus pada percobaan pertama
                'first_take_pass' => $results->where('attempt_number', 1)->where('status', 'passed')->count(),
                'first_take_total' => $results->where('attempt_number', 1)->count(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateResult($request);

        $exists = UkmppdResult::where('student_id', $validated['student_id'])
            ->where('attempt_number', $validated['attempt_number'])
            ->exists();
        if ($exists) {
            return response()->json(['message' => 'Percobaan ke-'.$validated['attempt_number'].' mahasiswa ini sudah tercatat.'], 422);
        }

        $result = UkmppdResult::create($validated);

        return response()->json([
            'message' => 'Hasil UKMPPD tercatat.',
            'data' => $result->load('student:id,name,identity_number'),
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $result = UkmppdResult::findOrFail($id);
        $validated = $this->validateResult($request, $result);

        $result->update($validated);

        return response()->json([
            'message' => 'Hasil UKMPPD diperbarui.',
            'data' => $result->load('student:id,name,identity_number'),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        UkmppdResult::findOrFail($id)->delete();

        return response()->json(['message' => 'Hasil UKMPPD dihapus.']);
    }

    /**
     * Riwayat + readiness milik SENDIRI (mahasiswa) — atau mahasiswa lain
     * via ?student_id bagi pemegang manage-examinations (dicek di sini).
     */
    public function my(Request $request): JsonResponse
    {
        $user = $request->user();
        $targetId = $user->id;

        if ($request->filled('student_id') && $user->can('manage-examinations') && ! $user->hasRole('Mahasiswa')) {
            $targetId = $request->input('student_id');
        }

        $target = User::findOrFail($targetId);

        return response()->json([
            'data' => [
                'attempts' => UkmppdResult::where('student_id', $target->id)
                    ->orderBy('attempt_number')
                    ->get(),
                'readiness' => $this->readiness($target),
            ],
        ]);
    }

    /**
     * Readiness score (0–100): gabungan rata-rata nilai stase published
     * (bobot 60%) dan rata-rata skor CBT internal (bobot 40%). Bobot
     * dinormalkan ulang bila salah satu komponen belum ada datanya.
     *
     * @return array{score: float|null, components: array}
     */
    private function readiness(User $user): array
    {
        $avgStase = StaseGrade::where('student_id', $user->id)
            ->where('status', 'published')
            ->avg('final_score');

        $avgCbt = ExamParticipant::where('student_id', $user->id)
            ->whereNotNull('final_score')
            ->whereHas('exam', fn ($q) => $q->where('type', 'CBT'))
            ->avg('final_score');

        $parts = [];
        if ($avgStase !== null) {
            $parts[] = ['label' => 'Rata-rata nilai stase', 'value' => round((float) $avgStase, 2), 'weight' => 0.6];
        }
        if ($avgCbt !== null) {
            $parts[] = ['label' => 'Rata-rata CBT internal', 'value' => round((float) $avgCbt, 2), 'weight' => 0.4];
        }

        if (empty($parts)) {
            return ['score' => null, 'components' => []];
        }

        $totalWeight = array_sum(array_column($parts, 'weight'));
        $score = 0.0;
        foreach ($parts as $part) {
            $score += $part['value'] * ($part['weight'] / $totalWeight);
        }

        return ['score' => round($score, 2), 'components' => $parts];
    }

    /** @return array<string, mixed> */
    private function validateResult(Request $request, ?UkmppdResult $existing = null): array
    {
        $rules = [
            'attempt_number' => 'required|integer|min:1|max:10',
            'exam_date' => 'required|date',
            'cbt_score' => 'nullable|numeric|min:0|max:100',
            'osce_score' => 'nullable|numeric|min:0|max:100',
            'status' => 'required|exists:system_references,value,category,ukmppd_statuses',
            'notes' => 'nullable|string|max:1000',
        ];
        if (! $existing) {
            $rules['student_id'] = 'required|uuid|exists:users,id';
        }

        return $request->validate($rules);
    }
}
