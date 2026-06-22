<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Modules\Academic\Models\Stase;

class StaseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $programId = $request->get('program_id', 'all');
        $cacheKey = "stases_list_{$programId}";

        $data = Cache::remember($cacheKey, 86400, function () use ($request) {
            $query = Stase::with('program');
            if ($request->has('program_id')) {
                $query->where('program_id', $request->program_id);
            }

            return $query->orderBy('name')->get();
        });

        return response()->json(['data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'program_id' => 'required|uuid|exists:programs,id',
            'code' => 'required|string|max:20',
            'name' => 'required|string|max:255',
            'duration_weeks' => 'required|integer|min:1',
            'passing_grade' => 'required|numeric|min:0|max:100',
            'is_mandatory' => 'boolean',
            'color_code' => 'nullable|string|max:7',
        ]);

        $stase = Stase::create($validated);

        return response()->json([
            'message' => 'Stase created successfully',
            'data' => $stase,
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $stase = Stase::with('program')->findOrFail($id);

        return response()->json(['data' => $stase]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $stase = Stase::findOrFail($id);

        $validated = $request->validate([
            'program_id' => 'sometimes|required|uuid|exists:programs,id',
            'code' => 'sometimes|required|string|max:20',
            'name' => 'sometimes|required|string|max:255',
            'duration_weeks' => 'sometimes|required|integer|min:1',
            'passing_grade' => 'sometimes|required|numeric|min:0|max:100',
            'is_mandatory' => 'boolean',
            'color_code' => 'nullable|string|max:7',
        ]);

        $stase->update($validated);

        return response()->json([
            'message' => 'Stase updated successfully',
            'data' => $stase,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $stase = Stase::findOrFail($id);
        $stase->delete();

        return response()->json([
            'message' => 'Stase deleted successfully',
        ]);
    }
}
