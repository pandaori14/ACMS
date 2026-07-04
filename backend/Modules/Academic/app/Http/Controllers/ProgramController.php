<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Student;

class ProgramController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Program::with('faculty');

        if ($request->has('faculty_id')) {
            $query->where('faculty_id', $request->faculty_id);
        }

        return response()->json(['data' => $query->orderBy('name')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'faculty_id' => 'required|uuid|exists:faculties,id',
            'code' => 'required|string|max:20|unique:programs,code',
            'name' => 'required|string|max:255',
            'accreditation' => 'nullable|string|max:10',
        ]);

        $program = Program::create($validated);

        return response()->json([
            'message' => 'Program created successfully',
            'data' => $program,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $program = Program::findOrFail($id);

        $validated = $request->validate([
            'faculty_id' => 'sometimes|required|uuid|exists:faculties,id',
            'code' => 'sometimes|required|string|max:20|unique:programs,code,'.$program->id,
            'name' => 'sometimes|required|string|max:255',
            'accreditation' => 'nullable|string|max:10',
        ]);

        $program->update($validated);

        return response()->json([
            'message' => 'Program studi berhasil diperbarui.',
            'data' => $program->load('faculty'),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $program = Program::withCount('stases')->findOrFail($id);

        $studentsCount = Student::where('program_id', $program->id)->count();

        if ($program->stases_count > 0 || $studentsCount > 0) {
            return response()->json([
                'message' => "Program studi masih memiliki {$program->stases_count} stase dan {$studentsCount} mahasiswa — tidak dapat dihapus.",
            ], 422);
        }

        $program->delete();

        return response()->json([
            'message' => 'Program studi berhasil dihapus.',
        ]);
    }
}
