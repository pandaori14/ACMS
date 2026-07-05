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

    /**
     * Admin RS murni (tanpa peran admin global) dibatasi: tidak boleh
     * membuat/menghapus RS, dan hanya boleh mengubah RS miliknya sendiri.
     */
    private function isScopedHospitalAdmin(Request $request): bool
    {
        $user = $request->user();

        return $user->hasRole('Admin RS')
            && ! $user->hasAnyRole(['Super Admin', 'Admin Prodi']);
    }

    public function store(Request $request)
    {
        if ($this->isScopedHospitalAdmin($request)) {
            return response()->json(['message' => 'Admin RS tidak dapat menambah rumah sakit baru.'], 403);
        }

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

        if ($this->isScopedHospitalAdmin($request)
            && ! $request->user()->linkedHospitalIds()->contains($hospital->id)) {
            return response()->json(['message' => 'Anda hanya dapat mengubah data rumah sakit Anda sendiri.'], 403);
        }

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

    public function destroy(Request $request, $id)
    {
        if ($this->isScopedHospitalAdmin($request)) {
            return response()->json(['message' => 'Admin RS tidak dapat menghapus rumah sakit.'], 403);
        }

        $hospital = Hospital::findOrFail($id);
        $hospital->delete();

        return response()->json(['message' => 'Hospital deleted successfully']);
    }
}
