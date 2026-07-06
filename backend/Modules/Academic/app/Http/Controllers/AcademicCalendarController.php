<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Academic\Models\AcademicEvent;

/**
 * Kalender Akademik: hari libur, blackout, periode ujian, kegiatan.
 * Baca terbuka untuk semua user login (jadwal menyangkut semua peran);
 * mutasi digating manage-academic-master di routes (Aturan A).
 */
class AcademicCalendarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AcademicEvent::query()->orderBy('start_date');

        // Filter rentang: semua event yang tumpang tindih [from, to]
        if ($request->filled('from')) {
            $query->where('end_date', '>=', $request->date('from'));
        }
        if ($request->filled('to')) {
            $query->where('start_date', '<=', $request->date('to'));
        }
        if ($request->filled('event_type')) {
            $query->where('event_type', $request->event_type);
        }
        if ($request->boolean('blocking_only')) {
            $query->where('blocks_rotation', true);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatePayload($request);

        $event = AcademicEvent::create($validated);
        AuditService::log('academic_event.created', $event, [], $validated);

        return response()->json([
            'data' => $event,
            'message' => 'Event kalender berhasil dibuat.',
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $event = AcademicEvent::findOrFail($id);
        $validated = $this->validatePayload($request);

        $old = $event->only(array_keys($validated));
        $event->update($validated);
        AuditService::log('academic_event.updated', $event, $old, $validated);

        return response()->json([
            'data' => $event,
            'message' => 'Event kalender berhasil diperbarui.',
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $event = AcademicEvent::findOrFail($id);
        AuditService::log('academic_event.deleted', $event, $event->toArray(), []);
        $event->delete();

        return response()->json(['message' => 'Event kalender berhasil dihapus.']);
    }

    /** @return array<string, mixed> */
    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'title' => 'required|string|max:255',
            'event_type' => 'required|exists:system_references,value,category,academic_event_types',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'description' => 'nullable|string|max:2000',
            'blocks_rotation' => 'boolean',
        ]);
    }
}
