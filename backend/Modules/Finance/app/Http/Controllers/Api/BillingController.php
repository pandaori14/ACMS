<?php

namespace Modules\Finance\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Finance\Jobs\CalculateHospitalBilling;
use Modules\Finance\Models\Billing;

class BillingController extends Controller
{
    public function index(Request $request)
    {
        $query = Billing::with(['hospital']);

        if ($request->has('period')) {
            $query->where('period', $request->period);
        }

        $billings = $query->orderBy('created_at', 'desc')->get();

        return response()->json($billings);
    }

    public function generateForPeriod(Request $request)
    {
        $request->validate([
            'period' => 'required|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'rate_per_student' => 'required|numeric|min:0',
        ]);

        // Dispatch background job to avoid UI freezing
        CalculateHospitalBilling::dispatch(
            $request->period,
            $request->start_date,
            $request->end_date,
            $request->rate_per_student
        );

        return response()->json([
            'message' => 'Proses kalkulasi tagihan rumah sakit sedang berjalan di latar belakang. Silakan muat ulang halaman ini dalam beberapa saat.',
            'data' => [],
        ], 202);
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:PENDING,PAID',
        ]);

        $billing = Billing::findOrFail($id);
        $billing->update(['status' => $request->status]);

        return response()->json($billing);
    }

    public function export(Request $request)
    {
        $query = Billing::with(['hospital']);

        if ($request->has('period')) {
            $query->where('period', $request->period);
        }

        $billings = $query->orderBy('created_at', 'desc')->get();

        $csvFileName = 'billings_export_'.date('Ymd_His').'.csv';
        $headers = [
            'Content-type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=$csvFileName",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($billings) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['ID', 'Hospital', 'Period', 'Amount', 'Status', 'Notes']);

            foreach ($billings as $billing) {
                fputcsv($file, [
                    $billing->id,
                    $billing->hospital ? $billing->hospital->name : '-',
                    $billing->period,
                    $billing->amount,
                    $billing->status,
                    $billing->notes,
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
