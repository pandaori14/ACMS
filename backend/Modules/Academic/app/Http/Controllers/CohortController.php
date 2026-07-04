<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Academic\Models\Cohort;

class CohortController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Cohort::with('program')->withCount('students');

        if ($request->filled('program_id')) {
            $query->where('program_id', $request->program_id);
        }

        return response()->json([
            'data' => $query->orderByDesc('year')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'program_id' => 'required|uuid|exists:programs,id',
            'name' => 'required|string|max:255',
            'year' => 'required|integer|min:2000|max:2100',
        ]);

        $cohort = Cohort::create($validated);

        return response()->json([
            'message' => 'Angkatan berhasil ditambahkan.',
            'data' => $cohort->load('program'),
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $cohort = Cohort::with('program')->withCount('students')->findOrFail($id);

        return response()->json(['data' => $cohort]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $cohort = Cohort::findOrFail($id);

        $validated = $request->validate([
            'program_id' => 'sometimes|required|uuid|exists:programs,id',
            'name' => 'sometimes|required|string|max:255',
            'year' => 'sometimes|required|integer|min:2000|max:2100',
        ]);

        $cohort->update($validated);

        return response()->json([
            'message' => 'Angkatan berhasil diperbarui.',
            'data' => $cohort->load('program'),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $cohort = Cohort::withCount('students')->findOrFail($id);

        if ($cohort->students_count > 0) {
            return response()->json([
                'message' => "Angkatan masih memiliki {$cohort->students_count} mahasiswa dan tidak dapat dihapus.",
            ], 422);
        }

        $cohort->delete();

        return response()->json([
            'message' => 'Angkatan berhasil dihapus.',
        ]);
    }
}
