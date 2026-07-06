<?php

namespace Modules\Clinical\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Academic\Models\Student;
use Modules\Clinical\Models\SkillChecklistItem;
use Modules\Clinical\Models\StudentSkillRecord;
use Modules\Rotation\Models\RotationAssignment;

/**
 * Skill checklist per stase:
 * - Template item dikelola pemegang manage-stase (routes).
 * - Observasi diisi Dodiknis (create-assessments) untuk mahasiswa RS-nya;
 *   level dari system_references `skill_levels`; observasi ulang menimpa.
 * - Progres dibaca mahasiswa (diri sendiri) / Dodiknis (RS-nya) / admin.
 */
class SkillChecklistController extends Controller
{
    /** Daftar item checklist satu stase (semua user login). */
    public function items(Request $request): JsonResponse
    {
        $request->validate(['stase_id' => 'required|uuid|exists:stases,id']);

        return response()->json([
            'data' => SkillChecklistItem::where('stase_id', $request->stase_id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(),
        ]);
    }

    /** Tambah item template (manage-stase). */
    public function storeItem(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'stase_id' => 'required|uuid|exists:stases,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
        ]);

        $item = SkillChecklistItem::create($validated);

        return response()->json([
            'message' => 'Item skill checklist ditambahkan.',
            'data' => $item,
        ], 201);
    }

    /** Ubah item template (manage-stase). */
    public function updateItem(Request $request, string $id): JsonResponse
    {
        $item = SkillChecklistItem::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'is_active' => 'boolean',
        ]);

        $item->update($validated);

        return response()->json([
            'message' => 'Item skill checklist diperbarui.',
            'data' => $item,
        ]);
    }

    /** Hapus item template (manage-stase). Rekam observasi ikut terhapus (cascade). */
    public function destroyItem(string $id): JsonResponse
    {
        $item = SkillChecklistItem::findOrFail($id);

        if ($item->records()->exists()) {
            // Sudah ada observasi → nonaktifkan saja agar riwayat tidak hilang
            $item->update(['is_active' => false]);

            return response()->json([
                'message' => 'Item sudah memiliki observasi — dinonaktifkan (riwayat dipertahankan).',
            ]);
        }

        $item->delete();

        return response()->json(['message' => 'Item skill checklist dihapus.']);
    }

    /**
     * Observasi skill (Dodiknis untuk mahasiswa RS-nya / admin): satu baris
     * per item per mahasiswa — observasi ulang MENIMPA level sebelumnya.
     */
    public function assess(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_id' => 'required|uuid', // students.id ATAU users.id
            'skill_checklist_item_id' => 'required|uuid|exists:skill_checklist_items,id',
            'level' => 'required|exists:system_references,value,category,skill_levels',
            'notes' => 'nullable|string|max:1000',
        ]);

        $user = $request->user();

        $profile = Student::where('id', $validated['student_id'])
            ->orWhere('user_id', $validated['student_id'])
            ->first();
        if (! $profile) {
            return response()->json(['message' => 'Mahasiswa tidak ditemukan.'], 404);
        }

        // Dodiknis murni: hanya mahasiswa yang dirotasi di RS-nya
        if ($user->hasRole('Dodiknis') && ! $user->hasAnyRole(['Super Admin', 'Admin Prodi', 'Kaprodi'])) {
            $hospitalIds = DB::table('hospital_user')->where('user_id', $user->id)->pluck('hospital_id');
            $atMyHospital = RotationAssignment::where('student_id', $profile->id)
                ->whereIn('hospital_id', $hospitalIds)
                ->exists();

            if (! $atMyHospital) {
                return response()->json(['message' => 'Mahasiswa ini tidak dirotasi di rumah sakit Anda.'], 403);
            }
        }

        $record = StudentSkillRecord::updateOrCreate(
            [
                'skill_checklist_item_id' => $validated['skill_checklist_item_id'],
                'student_id' => $profile->id,
            ],
            [
                'level' => $validated['level'],
                'assessed_by' => $user->id,
                'assessed_at' => now(),
                'notes' => $validated['notes'] ?? null,
            ]
        );

        return response()->json([
            'message' => 'Observasi skill tersimpan.',
            'data' => $record->load('item:id,name,stase_id'),
        ]);
    }

    /**
     * Progres skill per mahasiswa, dikelompokkan per stase yang dijalani.
     * Scoping sama dengan progres kompetensi (self / RS-nya / admin bebas).
     */
    public function progress(Request $request): JsonResponse
    {
        $profile = $this->resolveTargetProfile($request);
        if ($profile instanceof JsonResponse) {
            return $profile;
        }

        $staseIds = RotationAssignment::where('student_id', $profile->id)
            ->pluck('stase_id')->unique()->values();

        $items = SkillChecklistItem::with('stase:id,name')
            ->whereIn('stase_id', $staseIds)
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $records = StudentSkillRecord::with('assessor:id,name')
            ->where('student_id', $profile->id)
            ->whereIn('skill_checklist_item_id', $items->pluck('id'))
            ->get()
            ->keyBy('skill_checklist_item_id');

        $stases = $items->groupBy(fn ($i) => $i->stase?->name ?? '-')
            ->map(function ($group, $staseName) use ($records) {
                $rows = $group->map(function (SkillChecklistItem $item) use ($records) {
                    $record = $records->get($item->id);

                    return [
                        'item_id' => $item->id,
                        'name' => $item->name,
                        'description' => $item->description,
                        'level' => $record?->level,
                        'notes' => $record?->notes,
                        'assessed_by' => $record?->assessor?->name,
                        'assessed_at' => $record?->assessed_at?->toIso8601String(),
                    ];
                })->values();

                return [
                    'stase' => $staseName,
                    'total' => $rows->count(),
                    'assessed' => $rows->whereNotNull('level')->count(),
                    'items' => $rows,
                ];
            })->values();

        return response()->json([
            'data' => [
                'student' => [
                    'id' => $profile->id,
                    'name' => $profile->user?->name,
                    'identity_number' => $profile->user?->identity_number,
                ],
                'stases' => $stases,
            ],
        ]);
    }

    /**
     * Mahasiswa → profil sendiri. Dodiknis → hanya mahasiswa di RS-nya.
     * Peran lain → bebas via ?student_id (users.id ATAU students.id).
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
}
