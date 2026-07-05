<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

/**
 * Ekspor rekap presensi (baris SUDAH ter-scope oleh controller sesuai
 * peran pemanggil — Dodiknis/Admin RS hanya cakupannya sendiri).
 */
class AttendanceRecapExport implements FromCollection, WithHeadings
{
    public function __construct(private Collection $records) {}

    public function collection(): Collection
    {
        return $this->records->map(function ($record) {
            $assignment = $record->rotationAssignment;

            return [
                'Tanggal' => optional($record->date)->format('Y-m-d'),
                'NIM' => $assignment?->student?->user?->identity_number ?? '-',
                'Nama' => $assignment?->student?->user?->name ?? '-',
                'Rumah Sakit' => $assignment?->hospital?->name ?? '-',
                'Stase' => $assignment?->stase?->name ?? '-',
                'Check-in' => $record->check_in_time ?? '-',
                'Check-out' => $record->check_out_time ?? '-',
                'Status' => $record->status,
                'Ditandai' => $record->is_flagged ? 'YA' : '',
                'Catatan' => $record->flag_reason ?? $record->notes ?? '',
            ];
        });
    }

    public function headings(): array
    {
        return ['Tanggal', 'NIM', 'Nama', 'Rumah Sakit', 'Stase', 'Check-in', 'Check-out', 'Status', 'Ditandai', 'Catatan'];
    }
}
