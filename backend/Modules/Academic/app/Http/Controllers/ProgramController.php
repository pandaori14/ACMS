<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Academic\Models\Program;

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
}
