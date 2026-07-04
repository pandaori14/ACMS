<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Academic\Models\Faculty;

class FacultyController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Faculty::orderBy('name')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $faculty = Faculty::create($validated);

        return response()->json([
            'message' => 'Faculty created successfully',
            'data' => $faculty,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $faculty = Faculty::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $faculty->update($validated);

        return response()->json([
            'message' => 'Fakultas berhasil diperbarui.',
            'data' => $faculty,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $faculty = Faculty::withCount('programs')->findOrFail($id);

        if ($faculty->programs_count > 0) {
            return response()->json([
                'message' => "Fakultas masih memiliki {$faculty->programs_count} program studi dan tidak dapat dihapus.",
            ], 422);
        }

        $faculty->delete();

        return response()->json([
            'message' => 'Fakultas berhasil dihapus.',
        ]);
    }
}
