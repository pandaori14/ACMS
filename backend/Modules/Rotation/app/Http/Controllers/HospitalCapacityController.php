<?php

namespace Modules\Rotation\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Rotation\Models\HospitalCapacity;
use Modules\Rotation\Models\RotationAssignment;

/**
 * Kuota mahasiswa per RS per stase (opsional per periode).
 * Dipakai guard kapasitas saat penempatan rotasi.
 */
class HospitalCapacityController extends Controller
{
    public function index(Request $request)
    {
        $query = HospitalCapacity::with(['hospital', 'stase', 'rotationPeriod']);

        if ($request->filled('hospital_id')) {
            $query->where('hospital_id', $request->hospital_id);
        }
        if ($request->filled('stase_id')) {
            $query->where('stase_id', $request->stase_id);
        }

        $capacities = $query->get()->map(function (HospitalCapacity $cap) {
            // Okupansi: jumlah penempatan aktif pada slot RS+stase (semua periode
            // bila baris kuota umum, atau periode tsb bila spesifik).
            $occupied = RotationAssignment::where('hospital_id', $cap->hospital_id)
                ->where('stase_id', $cap->stase_id)
                ->when($cap->rotation_period_id, fn ($q) => $q->where('rotation_period_id', $cap->rotation_period_id))
                ->count();

            return array_merge($cap->toArray(), ['occupied' => $occupied]);
        });

        return response()->json(['data' => $capacities]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'hospital_id' => 'required|uuid|exists:hospitals,id',
            'stase_id' => 'required|uuid|exists:stases,id',
            'rotation_period_id' => 'nullable|uuid|exists:rotation_periods,id',
            'max_students' => 'required|integer|min:1|max:1000',
        ]);

        $capacity = HospitalCapacity::updateOrCreate(
            [
                'hospital_id' => $validated['hospital_id'],
                'stase_id' => $validated['stase_id'],
                'rotation_period_id' => $validated['rotation_period_id'] ?? null,
            ],
            ['max_students' => $validated['max_students']]
        );

        return response()->json([
            'message' => 'Kuota kapasitas disimpan.',
            'data' => $capacity->load(['hospital', 'stase', 'rotationPeriod']),
        ], 201);
    }

    public function destroy($id)
    {
        HospitalCapacity::findOrFail($id)->delete();

        return response()->json(['message' => 'Kuota kapasitas dihapus.']);
    }
}
