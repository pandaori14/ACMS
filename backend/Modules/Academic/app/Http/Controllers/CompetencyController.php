<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Academic\Models\Competency;

class CompetencyController extends Controller
{
    public function index(Request $request)
    {
        $query = Competency::query()->with('stase');

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%")
                ->orWhere('category', 'like', "%{$search}%");
        }

        if ($request->has('type') && $request->type) {
            $query->where('type', $request->type);
        }

        if ($request->has('stase_id') && $request->stase_id) {
            $query->where('stase_id', $request->stase_id);
        }

        $competencies = $query->paginate($request->per_page ?? 15);

        return response()->json($competencies);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:disease,skill,other',
            'category' => 'nullable|string|max:255',
            'level' => 'nullable|string|max:50',
            'stase_id' => 'nullable|exists:stases,id',
            'description' => 'nullable|string',
        ]);

        $competency = Competency::create($data);

        return response()->json([
            'message' => 'Kompetensi berhasil ditambahkan.',
            'data' => $competency->load('stase'),
        ], 201);
    }

    public function show(Competency $competency)
    {
        return response()->json([
            'data' => $competency->load('stase'),
        ]);
    }

    public function update(Request $request, Competency $competency)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:disease,skill,other',
            'category' => 'nullable|string|max:255',
            'level' => 'nullable|string|max:50',
            'stase_id' => 'nullable|exists:stases,id',
            'description' => 'nullable|string',
        ]);

        $competency->update($data);

        return response()->json([
            'message' => 'Kompetensi berhasil diperbarui.',
            'data' => $competency->load('stase'),
        ]);
    }

    public function destroy(Competency $competency)
    {
        $competency->delete();

        return response()->json([
            'message' => 'Kompetensi berhasil dihapus.',
        ]);
    }
}
