<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Assessment\Models\StudentGrade;
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
        // Load student
        $student = User::findOrFail($studentId);

        // Load grades
        $grades = StudentGrade::with(['stase', 'components'])->where('student_id', $studentId)->get();

        $data = [
            'student' => $student,
            'grades' => $grades,
            'date' => date('d F Y'),
        ];

        $pdf = Pdf::loadView('exports.transcript', $data);

        return $pdf->download('Transkrip_Klinis_'.$student->name.'.pdf');
    }

    public function exportBillingExcel(Request $request)
    {
        $period = $request->query('period', 'Q1-2026');

        return Excel::download(new BillingsExport($period), 'Tagihan_RS_'.$period.'.xlsx');
    }
}
