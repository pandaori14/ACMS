<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\UserNotificationPreference;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Preferensi notifikasi email per user: daftar event dari SMTP matrix
 * (dikurangi event kritis yang tidak bisa dimatikan) + toggle per event.
 */
class NotificationPreferenceController extends Controller
{
    /** Label ramah per event matrix (fallback: key mentah). */
    private const EVENT_LABELS = [
        'logbook_verified' => 'Logbook diverifikasi',
        'rotation_assigned' => 'Penempatan rotasi',
        'grade_published' => 'Nilai terbit',
        'honorarium_paid' => 'Honorarium dibayar',
        'student_status_changed' => 'Perubahan status akademik',
        'appeal_submitted' => 'Banding nilai diajukan',
        'appeal_decided' => 'Hasil banding nilai',
        'swap_requested' => 'Permintaan tukar jadwal',
        'swap_decided' => 'Hasil tukar jadwal',
        'at_risk_alert' => 'Peringatan mahasiswa berisiko',
        'finance_billing' => 'Tagihan keuangan',
        'consultation_submitted' => 'Konsultasi masuk',
        'consultation_responded' => 'Konsultasi dijawab',
        'incident_reported' => 'Insiden dilaporkan',
        'incident_status_updated' => 'Status insiden berubah',
    ];

    public function index(Request $request): JsonResponse
    {
        $matrix = json_decode((string) Setting::getValue('smtp_notification_matrix'), true) ?: [];

        $prefs = UserNotificationPreference::where('user_id', $request->user()->id)
            ->pluck('email_enabled', 'event_type');

        $events = collect(array_keys($matrix))
            ->reject(fn ($key) => in_array($key, NotificationService::CRITICAL_EVENTS, true))
            ->map(fn ($key) => [
                'event_type' => $key,
                'label' => self::EVENT_LABELS[$key] ?? $key,
                'email_enabled' => (bool) ($prefs[$key] ?? true),
            ])->values();

        return response()->json(['data' => $events]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'preferences' => 'required|array|max:50',
            'preferences.*.event_type' => 'required|string|max:60',
            'preferences.*.email_enabled' => 'required|boolean',
        ]);

        foreach ($validated['preferences'] as $pref) {
            // Event kritis diabaikan diam-diam (tidak bisa dimatikan)
            if (in_array($pref['event_type'], NotificationService::CRITICAL_EVENTS, true)) {
                continue;
            }

            UserNotificationPreference::updateOrCreate(
                ['user_id' => $request->user()->id, 'event_type' => $pref['event_type']],
                ['email_enabled' => $pref['email_enabled']]
            );
        }

        return response()->json(['message' => 'Preferensi notifikasi tersimpan.']);
    }
}
