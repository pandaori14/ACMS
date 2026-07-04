<?php

namespace Modules\Finance\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

        return response()->json(['data' => $billings]);
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

        return response()->json([
            'message' => 'Status tagihan berhasil diperbarui.',
            'data' => $billing,
        ]);
    }

    /**
     * Catat pembayaran tagihan: tanggal, metode, referensi → status PAID.
     */
    public function recordPayment(Request $request, $id)
    {
        $validated = $request->validate([
            'paid_at' => 'nullable|date',
            'payment_method' => 'required|string|max:50',
            'payment_reference' => 'nullable|string|max:100',
        ]);

        $billing = Billing::findOrFail($id);

        if ($billing->status === 'PAID') {
            return response()->json(['message' => 'Tagihan ini sudah tercatat lunas.'], 422);
        }

        $billing->update([
            'status' => 'PAID',
            'paid_at' => $validated['paid_at'] ?? now(),
            'payment_method' => $validated['payment_method'],
            'payment_reference' => $validated['payment_reference'] ?? null,
        ]);

        return response()->json([
            'message' => 'Pembayaran tagihan berhasil dicatat.',
            'data' => $billing->load('hospital'),
        ]);
    }

    /**
     * Unduh invoice PDF. Nomor invoice dibuat sekali (INV/ACMS/tahun/urut).
     */
    public function invoice($id)
    {
        $billing = Billing::with('hospital')->findOrFail($id);

        if (! $billing->invoice_number) {
            DB::transaction(function () use ($billing) {
                $year = now()->format('Y');
                $count = Billing::whereNotNull('invoice_number')
                    ->where('invoice_number', 'like', "INV/ACMS/{$year}/%")
                    ->lockForUpdate()
                    ->count();
                $billing->update([
                    'invoice_number' => sprintf('INV/ACMS/%s/%04d', $year, $count + 1),
                ]);
            });
            $billing->refresh();
        }

        $pdf = Pdf::loadView('finance::pdf.invoice', compact('billing'));

        return $pdf->download('Invoice_'.str_replace('/', '-', $billing->invoice_number).'.pdf');
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
