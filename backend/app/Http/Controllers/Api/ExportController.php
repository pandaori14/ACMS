<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Assessment\Models\StaseGrade;
use Modules\Finance\Models\Billing;

class BillingsExport implements FromCollection, WithHeadings
{
    protected $period;

    public function __construct($period)
    {
        $this->period = $period;
    }

    public function collection()
    {
        return Billing::with('hospital')
            ->where('period', $this->period)
            ->get()
            ->map(function ($billing) {
                return [
                    'Rumah Sakit' => $billing->hospital->name,
                    'Periode' => $billing->period,
                    'Nominal' => $billing->amount,
                    'Status' => $billing->status,
                    'Catatan' => $billing->notes,
                ];
            });
    }

    public function headings(): array
    {
        return [
            'Rumah Sakit',
            'Periode',
            'Nominal',
            'Status',
            'Catatan',
        ];
    }
}

class ExportController extends Controller
{
    public function exportTranscriptPdf(Request $request, $studentId)
    {
        // Mahasiswa hanya boleh mengunduh transkrip miliknya sendiri
        $requester = $request->user();
        if ($requester->hasRole('Mahasiswa') && $requester->id !== $studentId) {
            return response()->json(['message' => 'Anda hanya dapat mengunduh transkrip Anda sendiri.'], 403);
        }

        $student = User::with('program')->findOrFail($studentId);

        // stase_grades.student_id merujuk USERS; stase lewat rotationAssignment
        $grades = StaseGrade::with('rotationAssignment.stase')
            ->where('student_id', $studentId)
            ->where('status', 'published')
            ->get();

        $average = $grades->count() > 0
            ? round((float) $grades->avg('final_score'), 2)
            : null;

        $data = [
            'student' => $student,
            'grades' => $grades,
            'average' => $average,
            'date' => date('d F Y'),
        ];

        $pdf = Pdf::loadView('exports.transcript', $data);

        return $pdf->download('Transkrip_Klinis_'.str_replace(' ', '_', $student->name).'.pdf');
    }

    public function exportBillingExcel(Request $request)
    {
        $period = $request->query('period', 'Q1-2026');

        return Excel::download(new BillingsExport($period), 'Tagihan_RS_'.$period.'.xlsx');
    }
}
