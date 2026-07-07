<?php

namespace Modules\Rotation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Academic\Models\Student;
use Modules\Rotation\Models\RotationAssignment;
use Modules\Rotation\Models\RotationSwapRequest;
use Modules\Rotation\Services\RotationSchedulerService;

/**
 * Tukar jadwal rotasi: mahasiswa mengajukan tukar slot dengan mahasiswa lain
 * se-periode → admin rotasi (manage-rotations) memutuskan → slot stase+RS
 * ditukar atomik dalam transaksi (validasi prasyarat/remedial dua arah).
 */
class SwapRequestController extends Controller
{
    public function __construct(private RotationSchedulerService $scheduler) {}

    /** Daftar permintaan: mahasiswa melihat miliknya (pemohon/mitra); admin semua. */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = RotationSwapRequest::with([
            'requesterAssignment.student.user:id,name,identity_number',
            'requesterAssignment.stase:id,name',
            'requesterAssignment.hospital:id,name',
            'targetAssignment.student.user:id,name,identity_number',
            'targetAssignment.stase:id,name',
            'targetAssignment.hospital:id,name',
            'decider:id,name',
        ])->orderByDesc('created_at');

        if ($user->hasRole('Mahasiswa')) {
            $profileId = $user->student?->id;
            $myAssignments = RotationAssignment::where('student_id', $profileId)->pluck('id');
            $query->where(function ($q) use ($myAssignments) {
                $q->whereIn('requester_assignment_id', $myAssignments)
                    ->orWhereIn('target_assignment_id', $myAssignments);
            });
        } elseif (! $user->can('manage-rotations')) {
            return response()->json(['message' => 'Anda tidak berhak melihat permintaan tukar.'], 403);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json(['data' => $query->limit(100)->get()]);
    }

    /**
     * Kandidat mitra tukar: penempatan lain pada periode yang sama
     * (data minimal — nama, stase, RS).
     */
    public function candidates(Request $request): JsonResponse
    {
        $request->validate(['rotation_period_id' => 'required|uuid|exists:rotation_periods,id']);

        $user = $request->user();
        $profileId = $user->student?->id;

        $rows = RotationAssignment::with([
            'student.user:id,name,identity_number',
            'stase:id,name',
            'hospital:id,name',
        ])
            ->where('rotation_period_id', $request->rotation_period_id)
            ->whereIn('status', ['pending', 'confirmed'])
            ->when($profileId, fn ($q) => $q->where('student_id', '!=', $profileId))
            ->limit(300)
            ->get()
            ->map(fn ($a) => [
                'assignment_id' => $a->id,
                'student_name' => $a->student?->user?->name,
                'stase' => $a->stase?->name,
                'hospital' => $a->hospital?->name,
            ]);

        return response()->json(['data' => $rows]);
    }

    /** Mahasiswa: ajukan tukar slot dengan penempatan target. */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target_assignment_id' => 'required|uuid|exists:rotation_assignments,id',
            'reason' => 'required|string|min:10|max:1000',
        ]);

        $user = $request->user();
        $profile = Student::where('user_id', $user->id)->first();
        if (! $profile) {
            return response()->json(['message' => 'Hanya mahasiswa yang dapat mengajukan tukar jadwal.'], 403);
        }

        $target = RotationAssignment::findOrFail($validated['target_assignment_id']);

        $mine = RotationAssignment::where('student_id', $profile->id)
            ->where('rotation_period_id', $target->rotation_period_id)
            ->first();
        if (! $mine) {
            return response()->json(['message' => 'Anda tidak memiliki penempatan pada periode yang sama dengan target.'], 422);
        }

        if ($reason = $this->scheduler->swapConflict($mine, $target)) {
            return response()->json(['message' => $reason], 422);
        }

        // Satu permintaan aktif per penempatan (dua arah)
        $pendingExists = RotationSwapRequest::where('status', 'submitted')
            ->where(function ($q) use ($mine, $target) {
                $q->whereIn('requester_assignment_id', [$mine->id, $target->id])
                    ->orWhereIn('target_assignment_id', [$mine->id, $target->id]);
            })->exists();
        if ($pendingExists) {
            return response()->json(['message' => 'Sudah ada permintaan tukar aktif yang melibatkan penempatan ini.'], 422);
        }

        $swap = RotationSwapRequest::create([
            'requester_assignment_id' => $mine->id,
            'target_assignment_id' => $target->id,
            'reason' => $validated['reason'],
            'status' => 'submitted',
        ]);

        AuditService::log('rotation.swap_requested', $swap, [], ['reason' => $validated['reason']]);

        // Aturan C: kabari pengelola rotasi via matrix (notify_roles diatur admin)
        NotificationService::sendDynamicEmail(
            $user->email,
            'Permintaan Tukar Jadwal Rotasi',
            'email_template_swap_requested',
            'swap_requested',
            [
                'name' => $user->name,
                'stase' => $mine->stase?->name ?? '-',
                'reason' => $validated['reason'],
            ]
        );

        return response()->json([
            'message' => 'Permintaan tukar terkirim — menunggu persetujuan admin rotasi.',
            'data' => $swap,
        ], 201);
    }

    /** Mahasiswa: batalkan permintaan miliknya yang masih menunggu. */
    public function cancel(Request $request, string $id): JsonResponse
    {
        $swap = RotationSwapRequest::with('requesterAssignment')->findOrFail($id);
        $profileId = $request->user()->student?->id;

        if ($swap->requesterAssignment?->student_id !== $profileId) {
            return response()->json(['message' => 'Hanya pemohon yang dapat membatalkan permintaannya.'], 403);
        }
        if ($swap->status !== 'submitted') {
            return response()->json(['message' => 'Permintaan ini sudah diputuskan.'], 422);
        }

        $swap->update(['status' => 'cancelled']);

        return response()->json(['message' => 'Permintaan tukar dibatalkan.']);
    }

    /** Admin rotasi: putuskan — approved menukar slot atomik. */
    public function decide(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'decision' => 'required|in:approved,rejected',
            'decision_note' => 'nullable|string|max:1000',
        ]);

        $swap = RotationSwapRequest::with([
            'requesterAssignment.student.user',
            'targetAssignment.student.user',
        ])->findOrFail($id);

        if ($swap->status !== 'submitted') {
            return response()->json(['message' => 'Permintaan ini sudah diputuskan.'], 422);
        }

        $a = $swap->requesterAssignment;
        $b = $swap->targetAssignment;

        if ($validated['decision'] === 'approved') {
            // Re-validasi saat keputusan (kondisi bisa berubah sejak diajukan)
            if ($reason = $this->scheduler->swapConflict($a, $b)) {
                return response()->json(['message' => "Tidak bisa disetujui: {$reason}"], 422);
            }

            DB::transaction(function () use ($a, $b) {
                $aSlot = ['stase_id' => $a->stase_id, 'hospital_id' => $a->hospital_id];
                $a->update(['stase_id' => $b->stase_id, 'hospital_id' => $b->hospital_id]);
                $b->update($aSlot);
            });
        }

        $swap->update([
            'status' => $validated['decision'],
            'decided_by' => $request->user()->id,
            'decision_note' => $validated['decision_note'] ?? null,
            'decided_at' => now(),
        ]);

        AuditService::log('rotation.swap_decided', $swap, [], [
            'decision' => $validated['decision'],
            'note' => $validated['decision_note'] ?? null,
        ]);

        // Kabari kedua mahasiswa
        foreach ([$a, $b] as $assignment) {
            $email = $assignment->student?->user?->email;
            if ($email) {
                NotificationService::sendDynamicEmail(
                    $email,
                    'Hasil Permintaan Tukar Jadwal Rotasi',
                    'email_template_swap_decided',
                    'swap_decided',
                    [
                        'name' => $assignment->student->user->name,
                        'decision' => $validated['decision'] === 'approved' ? 'DISETUJUI' : 'DITOLAK',
                        'note' => $validated['decision_note'] ?? '-',
                    ],
                    ['decision' => $validated['decision']]
                );
            }
        }

        return response()->json([
            'message' => $validated['decision'] === 'approved'
                ? 'Tukar jadwal disetujui — slot kedua mahasiswa telah ditukar.'
                : 'Permintaan tukar ditolak.',
            'data' => $swap->fresh(),
        ]);
    }
}
