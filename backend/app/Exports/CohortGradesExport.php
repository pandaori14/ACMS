<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

/**
 * Ekspor rekap nilai satu angkatan (format panjang: 1 baris = 1 nilai stase).
 */
class CohortGradesExport implements FromCollection, WithHeadings
{
    public function __construct(private Collection $grades) {}

    public function collection(): Collection
    {
        return $this->grades->map(function ($grade) {
            $assignment = $grade->rotationAssignment;

            return [
                'NIM' => $grade->student?->identity_number ?? '-',
                'Nama' => $grade->student?->name ?? '-',
                'Stase' => $assignment?->stase?->name ?? '-',
                'Rumah Sakit' => $assignment?->hospital?->name ?? '-',
                'Logbook' => $grade->logbook_score,
                'Mini-CEX' => $grade->minicex_score,
                'DOPS' => $grade->dops_score,
                'CBD' => $grade->cbd_score,
                'Nilai Akhir' => $grade->final_score,
                'Huruf' => $grade->letter_grade,
                'Status' => $grade->status,
            ];
        });
    }

    public function headings(): array
    {
        return ['NIM', 'Nama', 'Stase', 'Rumah Sakit', 'Logbook', 'Mini-CEX', 'DOPS', 'CBD', 'Nilai Akhir', 'Huruf', 'Status'];
    }
}
