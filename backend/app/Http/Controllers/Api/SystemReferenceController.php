<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemReference;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SystemReferenceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = SystemReference::query();

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return response()->json($query->orderBy('category')->orderBy('name')->get());
    }

    /**
     * Referensi aktif per kategori — read-only untuk SEMUA user terautentikasi
     * (dipakai dropdown form lintas modul; manajemen tetap di manage-settings).
     */
    public function byCategory(string $category)
    {
        return response()->json([
            'data' => SystemReference::where('category', $category)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'category', 'name', 'value']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'category' => 'required|string|max:255',
            'name' => 'required|string|max:255',
            'value' => 'required|string|max:255',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first()], 422);
        }

        $ref = SystemReference::create([
            'category' => $request->category,
            'name' => $request->name,
            'value' => $request->value,
            'is_active' => $request->is_active ?? true,
        ]);

        return response()->json(['message' => 'Reference created', 'data' => $ref], 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $ref = SystemReference::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'category' => 'string|max:255',
            'name' => 'string|max:255',
            'value' => 'string|max:255',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first()], 422);
        }

        $ref->update($request->only(['category', 'name', 'value', 'is_active']));

        return response()->json(['message' => 'Reference updated', 'data' => $ref]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $ref = SystemReference::findOrFail($id);
        $ref->delete();

        return response()->json(['message' => 'Reference deleted']);
    }
}
