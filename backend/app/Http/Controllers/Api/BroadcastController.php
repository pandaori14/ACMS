<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Broadcast;
use App\Models\User;
use App\Notifications\BroadcastAnnouncement;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Modules\Academic\Models\Student;

/**
 * Broadcast pesan massal (permission send-broadcasts di routes):
 * target semua user aktif / per peran / per angkatan / per RS.
 * Selalu masuk notifikasi in-app; email ikut bila enable_email_broadcasts.
 */
class BroadcastController extends Controller
{
    private const MAX_RECIPIENTS = 2000;

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Broadcast::with('sender:id,name')
                ->orderByDesc('created_at')
                ->limit(50)
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'body' => 'required|string|max:5000',
            'target_type' => 'required|in:all,role,cohort,hospital',
            'target_id' => 'required_unless:target_type,all|nullable|string|max:100',
        ]);

        // Kiriman massal berat — batasi 5 broadcast/jam per pengirim
        $throttleKey = 'broadcast|'.$request->user()->id;
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $minutes = (int) ceil(RateLimiter::availableIn($throttleKey) / 60);

            return response()->json(['message' => "Terlalu sering. Coba lagi dalam ±{$minutes} menit."], 429);
        }

        $recipients = $this->resolveRecipients($validated['target_type'], $validated['target_id'] ?? null);

        if ($recipients->isEmpty()) {
            return response()->json(['message' => 'Target tidak memiliki penerima.'], 422);
        }
        if ($recipients->count() > self::MAX_RECIPIENTS) {
            return response()->json([
                'message' => 'Penerima melebihi batas '.self::MAX_RECIPIENTS.' — persempit target.',
            ], 422);
        }

        RateLimiter::hit($throttleKey, 3600);

        $broadcast = Broadcast::create([
            'sender_id' => $request->user()->id,
            'subject' => $validated['subject'],
            'body' => $validated['body'],
            'target_type' => $validated['target_type'],
            'target_id' => $validated['target_id'] ?? null,
            'recipients_count' => $recipients->count(),
        ]);

        // Queued per penerima (ShouldQueue) — tidak memblokir respons
        Notification::send($recipients, new BroadcastAnnouncement($validated['subject'], $validated['body']));

        AuditService::log('broadcast.sent', $broadcast, [], [
            'target' => $validated['target_type'].($validated['target_id'] ? ':'.$validated['target_id'] : ''),
            'recipients' => $recipients->count(),
        ]);

        return response()->json([
            'message' => "Broadcast terkirim ke {$recipients->count()} penerima.",
            'data' => $broadcast,
        ], 201);
    }

    /** @return Collection<int, User> */
    private function resolveRecipients(string $targetType, ?string $targetId)
    {
        return match ($targetType) {
            'all' => User::where('status', 'active')->get(),
            'role' => User::role($targetId)->where('status', 'active')->get(),
            'cohort' => User::whereIn(
                'id',
                Student::where('cohort_id', $targetId)->pluck('user_id')
            )->where('status', 'active')->get(),
            'hospital' => User::whereIn(
                'id',
                DB::table('hospital_user')->where('hospital_id', $targetId)->pluck('user_id')
            )->where('status', 'active')->get(),
            default => collect(),
        };
    }
}
