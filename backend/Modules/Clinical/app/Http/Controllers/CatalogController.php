<?php

namespace Modules\Clinical\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Clinical\Models\Diagnosis;
use Modules\Clinical\Models\Procedure;

class CatalogController extends Controller
{
    /**
     * List all procedures.
     */
    public function procedures(): JsonResponse
    {
        return response()->json([
            'data' => Procedure::orderBy('name')->get(),
        ]);
    }

    /**
     * List all diagnoses. Supports search by name/icd_code.
     */
    public function diagnoses(Request $request): JsonResponse
    {
        $query = Diagnosis::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('icd_code', 'like', "%{$search}%");
            });
        }

        return response()->json([
            'data' => $query->orderBy('name')->limit(50)->get(),
        ]);
    }
}
