<?php

namespace Modules\Rotation\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Rotation\Models\Hospital;

class HospitalController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => Hospital::orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:hospitals',
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:50',
            'address' => 'nullable|string',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'radius_tolerance_meters' => 'nullable|integer|min:10|max:5000',
        ]);

        $hospital = Hospital::create($validated);

        return response()->json([
            'data' => $hospital,
            'message' => 'Hospital created successfully',
        ], 201);
    }

    public function show($id)
    {
        $hospital = Hospital::findOrFail($id);

        return response()->json(['data' => $hospital]);
    }

    public function update(Request $request, $id)
    {
        $hospital = Hospital::findOrFail($id);

        $validated = $request->validate([
            'code' => 'required|string|unique:hospitals,code,'.$id,
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:50',
            'address' => 'nullable|string',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'radius_tolerance_meters' => 'nullable|integer|min:10|max:5000',
        ]);

        $hospital->update($validated);

        return response()->json([
            'data' => $hospital,
            'message' => 'Hospital updated successfully',
        ]);
    }

    public function destroy($id)
    {
        $hospital = Hospital::findOrFail($id);
        $hospital->delete();

        return response()->json(['message' => 'Hospital deleted successfully']);
    }
}
