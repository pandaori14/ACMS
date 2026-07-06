<?php

namespace Modules\Assessment\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Assessment\Models\GradeAppeal;
use Modules\Assessment\Models\StaseGrade;

/**
 * Banding nilai stase (hak keberatan mahasiswa):
 * - Mahasiswa mengajukan banding atas nilai PUBLISHED miliknya, satu kali per
 *   nilai, dalam jendela `appeal_window_days` sejak terbit, dan hanya bila
 *   Settings `allow_student_appeals` aktif.
 * - Pemegang manage-grades meninjau: accepted (nilai dibuka kembali ke
 *   approved untuk dikoreksi) / rejected. Keduanya ternotifikasi & teraudit.
 */
class GradeAppealController extends Controller
{
    /** Mahasiswa: ajukan banding. */
    public function store(Request $request, string $gradeId): JsonResponse
    {
        if (Setting::getValue('allow_student_appeals', 'true') !== 'true') {
            return response()->json(['message' => 'Banding nilai sedang tidak dibuka.'], 403);
        }

        $validated = $request->validate(['reason' => 'required|string|min:20|max:2000']);

        $grade = StaseGrade::with('rotationAssignment.stase')->findOrFail($gradeId);
        $user = $request->user();

        if ($grade->student_id !== $user->id) {
            return response()->json(['message' => 'Anda hanya dapat mengajukan banding atas nilai Anda sendiri.'], 403);
        }
        if ($grade->status !== 'published') {
            return response()->json(['message' => 'Banding hanya untuk nilai yang sudah terbit.'], 422);
        }

        $windowDays = (int) Setting::getValue('appeal_window_days', 14);
        $publishedAt = $grade->published_at ?? $grade->updated_at;
        if ($publishedAt && now()->greaterThan($publishedAt->copy()->addDays($windowDays))) {
            return response()->json([
                'message' => "Jendela banding ({$windowDays} hari sejak nilai terbit) telah lewat.",
            ], 422);
        }

        if (GradeAppeal::where('stase_grade_id', $grade->id)->exists()) {
            return response()->json(['message' => 'Nilai ini sudah pernah diajukan banding.'], 422);
        }

        $appeal = GradeAppeal::create([
            'stase_grade_id' => $grade->id,
            'student_id' => $user->id,
            'reason' => $validated['reason'],
            'status' => 'submitted',
        ]);

        AuditService::log('grade.appeal_submitted', $appeal, [], ['reason' => $validated['reason']]);

        // Aturan C: kabari pengelola nilai via matrix (notify_roles dikonfigurasi admin)
        NotificationService::sendDynamicEmail(
            $user->email,
            'Banding Nilai Diajukan',
            'email_template_appeal_submitted',
            'appeal_submitted',
            [
                'name' => $user->name,
                'stase' => $grade->rotationAssignment?->stase?->name ?? '-',
                'reason' => $validated['reason'],
            ]
        );

        return response()->json([
            'message' => 'Banding nilai terkirim. Anda akan diberi tahu hasil peninjauannya.',
            'data' => $appeal,
        ], 201);
    }

    /** Pengelola nilai: daftar banding (filter status). */
    public function index(Request $request): JsonResponse
    {
        $query = GradeAppeal::with([
            'student:id,name,identity_number',
            'staseGrade.rotationAssignment.stase:id,name',
            'reviewer:id,name',
        ])->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json(['data' => $query->limit(200)->get()]);
    }

    /** Pengelola nilai: putuskan banding. */
    public function decide(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'decision' => 'required|in:accepted,rejected',
            'decision_note' => 'required|string|min:5|max:2000',
        ]);

        $appeal = GradeAppeal::with(['staseGrade.rotationAssignment.stase', 'student'])->findOrFail($id);

        if ($appeal->status !== 'submitted') {
            return response()->json(['message' => 'Banding ini sudah diputuskan.'], 422);
        }

        $appeal->update([
            'status' => $validated['decision'],
            'reviewer_id' => $request->user()->id,
            'decision_note' => $validated['decision_note'],
            'decided_at' => now(),
        ]);

        // Diterima → nilai dibuka kembali (approved) agar bisa dikoreksi lalu
        // diterbitkan ulang lewat alur normal approve→publish.
        if ($validated['decision'] === 'accepted') {
            $appeal->staseGrade?->update(['status' => 'approved', 'published_at' => null]);
        }

        AuditService::log('grade.appeal_decided', $appeal, [], [
            'decision' => $validated['decision'],
            'note' => $validated['decision_note'],
        ]);

        if ($appeal->student?->email) {
            NotificationService::sendDynamicEmail(
                $appeal->student->email,
                'Hasil Banding Nilai Anda',
                'email_template_appeal_decided',
                'appeal_decided',
                [
                    'name' => $appeal->student->name,
                    'stase' => $appeal->staseGrade?->rotationAssignment?->stase?->name ?? '-',
                    'decision' => $validated['decision'] === 'accepted' ? 'DITERIMA' : 'DITOLAK',
                    'note' => $validated['decision_note'],
                ],
                ['decision' => $validated['decision']]
            );
        }

        return response()->json([
            'message' => 'Keputusan banding tersimpan dan mahasiswa diberi tahu.',
            'data' => $appeal->fresh(['student', 'reviewer', 'staseGrade']),
        ]);
    }
}
