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
}
