<?php

namespace Modules\Finance\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NotificationService;
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

        return response()->json(['data' => $honorariums]);
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

        return response()->json([
            'message' => 'Status honorarium berhasil diperbarui.',
            'data' => $honorarium,
        ]);
    }

    /**
     * Catat pembayaran honorarium → PAID + notifikasi email ke preceptor
     * (Aturan C: dikonfigurasi via SMTP matrix, bukan hardcode penerima).
     */
    public function recordPayment(Request $request, $id)
    {
        $validated = $request->validate([
            'paid_at' => 'nullable|date',
            'payment_method' => 'required|string|max:50',
            'payment_reference' => 'nullable|string|max:100',
        ]);

        $honorarium = Honorarium::with('preceptor')->findOrFail($id);

        if ($honorarium->status === 'PAID') {
            return response()->json(['message' => 'Honorarium ini sudah tercatat dibayar.'], 422);
        }

        $honorarium->update([
            'status' => 'PAID',
            'paid_at' => $validated['paid_at'] ?? now(),
            'payment_method' => $validated['payment_method'],
            'payment_reference' => $validated['payment_reference'] ?? null,
        ]);

        if ($honorarium->preceptor && $honorarium->preceptor->email) {
            NotificationService::sendDynamicEmail(
                $honorarium->preceptor->email,
                'Honorarium Anda Telah Dibayarkan',
                'email_template_honorarium_paid',
                'honorarium_paid',
                [
                    'name' => $honorarium->preceptor->name,
                    'period' => $honorarium->period,
                    'amount' => 'Rp '.number_format((float) $honorarium->amount, 0, ',', '.'),
                ]
            );
        }

        return response()->json([
            'message' => 'Pembayaran honorarium berhasil dicatat.',
            'data' => $honorarium->load('preceptor'),
        ]);
    }
}
