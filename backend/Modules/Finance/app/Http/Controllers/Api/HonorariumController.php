<?php

namespace Modules\Finance\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Finance\Jobs\CalculatePreceptorHonorarium;
use Modules\Finance\Models\Honorarium;

class HonorariumController extends Controller
{
    public function index(Request $request)
    {
        $query = Honorarium::with(['preceptor']);

        $user = $request->user();
        if ($user->hasRole('Dodiknis')) {
            $query->where('preceptor_id', $user->id);
        }

        if ($request->has('period')) {
            $query->where('period', $request->period);
        }

        $honorariums = $query->orderBy('created_at', 'desc')->get();

        return response()->json($honorariums);
    }

    public function generateForPeriod(Request $request)
    {
        $request->validate([
            'period' => 'required|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'guidance_rate' => 'required|numeric|min:0',
            'exam_rate' => 'required|numeric|min:0',
        ]);

        // Dispatch background job to avoid UI freezing
        CalculatePreceptorHonorarium::dispatch(
            $request->period,
            $request->start_date,
            $request->end_date,
            $request->guidance_rate,
            $request->exam_rate
        );

        return response()->json([
            'message' => 'Proses kalkulasi honorarium preceptor sedang berjalan di latar belakang. Silakan muat ulang halaman ini dalam beberapa saat.',
            'data' => [],
        ], 202);
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:PENDING,PAID',
        ]);

        $honorarium = Honorarium::findOrFail($id);
        $honorarium->update(['status' => $request->status]);

        return response()->json($honorarium);
    }
}
