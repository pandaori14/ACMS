<?php

namespace Modules\Clinical\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Academic\Models\Competency;
use Modules\Academic\Models\Student;
use Modules\Clinical\Models\LogbookEntry;
use Modules\Rotation\Models\RotationAssignment;

/**
 * Progres kompetensi per mahasiswa: target (min_cases pada master
 * kompetensi per stase) vs capaian nyata (logbook TERVERIFIKASI yang
 * menautkan kompetensi tsb).
 */
class CompetencyProgressController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Tentukan profil mahasiswa target (students.id — jebakan dual-ID)
        $profile = $this->resolveTargetProfile($request);
        if ($profile instanceof JsonResponse) {
            return $profile;
        }

        // Stase yang pernah/sedang dijalani mahasiswa
        $assignments = RotationAssignment::with('stase:id,name')
            ->where('student_id', $profile->id)
            ->get();

        $staseIds = $assignments->pluck('stase_id')->unique()->values();

        if ($staseIds->isEmpty()) {
            return response()->json([
                'data' => ['student' => $this->studentSummary($profile), 'stases' => [], 'overall' => null],
            ]);
        }

        // Capaian: logbook VERIFIED per kompetensi
        $achieved = LogbookEntry::where('student_id', $profile->id)
            ->where('status', 'verified')
            ->whereNotNull('competency_id')
            ->select('competency_id', DB::raw('count(*) as total'))
            ->groupBy('competency_id')
            ->pluck('total', 'competency_id');

        $competencies = Competency::whereIn('stase_id', $staseIds)
            ->orderBy('name')
            ->get();

        $totalTargets = 0;
        $totalFulfilled = 0;

        $stases = $assignments->unique('stase_id')->values()->map(function ($assignment) use ($competencies, $achieved, &$totalTargets, &$totalFulfilled) {
            $items = $competencies
                ->where('stase_id', $assignment->stase_id)
                ->values()
                ->map(function (Competency $c) use ($achieved, &$totalTargets, &$totalFulfilled) {
                    $count = (int) ($achieved[$c->id] ?? 0);
                    $fulfilled = $count >= $c->min_cases;
                    $totalTargets++;
                    if ($fulfilled) {
                        $totalFulfilled++;
                    }

                    return [
                        'id' => $c->id,
                        'name' => $c->name,
                        'type' => $c->type,
                        'level' => $c->level,
                        'min_cases' => $c->min_cases,
                        'achieved' => $count,
                        'fulfilled' => $fulfilled,
                    ];
                });

            return [
                'stase_id' => $assignment->stase_id,
                'stase_name' => $assignment->stase?->name,
                'competencies' => $items,
            ];
        })->filter(fn ($s) => count($s['competencies']) > 0)->values();

        return response()->json([
            'data' => [
                'student' => $this->studentSummary($profile),
                'stases' => $stases,
                'overall' => $totalTargets > 0
                    ? ['targets' => $totalTargets, 'fulfilled' => $totalFulfilled, 'percent' => round($totalFulfilled / $totalTargets * 100)]
                    : null,
            ],
        ]);
    }

    /**
     * Mahasiswa → profil sendiri. Dodiknis → hanya mahasiswa di RS-nya.
     * Peran lain (admin/kaprodi) → bebas via ?student_id (users.id ATAU students.id).
     *
     * @return Student|JsonResponse
     */
    private function resolveTargetProfile(Request $request)
    {
        $user = $request->user();

        if ($user->hasRole('Mahasiswa')) {
            $profile = Student::with('user:id,name,identity_number')->where('user_id', $user->id)->first();

            return $profile ?: response()->json(['message' => 'Profil mahasiswa tidak ditemukan.'], 404);
        }

        $studentParam = $request->input('student_id');
        if (! $studentParam) {
            return response()->json(['message' => 'Parameter student_id wajib untuk peran non-mahasiswa.'], 422);
        }

        $profile = Student::with('user:id,name,identity_number')
            ->where('id', $studentParam)
            ->orWhere('user_id', $studentParam)
            ->first();

        if (! $profile) {
            return response()->json(['message' => 'Mahasiswa tidak ditemukan.'], 404);
        }

        if ($user->hasRole('Dodiknis') && ! $user->hasAnyRole(['Super Admin', 'Admin Prodi', 'Kaprodi'])) {
            $hospitalIds = DB::table('hospital_user')->where('user_id', $user->id)->pluck('hospital_id');
            $atMyHospital = RotationAssignment::where('student_id', $profile->id)
                ->whereIn('hospital_id', $hospitalIds)
                ->exists();

            if (! $atMyHospital) {
                return response()->json(['message' => 'Mahasiswa ini tidak dirotasi di rumah sakit Anda.'], 403);
            }
        }

        return $profile;
    }

    private function studentSummary(Student $profile): array
    {
        return [
            'id' => $profile->id,
            'name' => $profile->user?->name,
            'identity_number' => $profile->user?->identity_number,
        ];
    }
}
