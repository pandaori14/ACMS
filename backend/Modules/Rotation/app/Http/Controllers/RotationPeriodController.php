<?php

namespace Modules\Rotation\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Rotation\Models\RotationPeriod;

class RotationPeriodController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => RotationPeriod::with('program')->orderBy('start_date', 'desc')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'program_id' => 'required|uuid|exists:programs,id',
            'name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'status' => 'required|string|in:draft,published,active,completed',
        ]);

        $period = RotationPeriod::create($validated);

        return response()->json([
            'data' => $period,
            'message' => 'Rotation Period created successfully',
        ], 201);
    }

    public function show($id)
    {
        $period = RotationPeriod::with('program')->findOrFail($id);

        return response()->json(['data' => $period]);
    }

    public function update(Request $request, $id)
    {
        $period = RotationPeriod::findOrFail($id);

        $validated = $request->validate([
            'program_id' => 'required|uuid|exists:programs,id',
            'name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'status' => 'required|string|in:draft,published,active,completed',
        ]);

        $period->update($validated);

        return response()->json([
            'data' => $period,
            'message' => 'Rotation Period updated successfully',
        ]);
    }

    public function destroy($id)
    {
        $period = RotationPeriod::findOrFail($id);
        $period->delete();

        return response()->json(['message' => 'Rotation Period deleted successfully']);
    }
}
