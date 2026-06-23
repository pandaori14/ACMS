<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Stase;
use Modules\Academic\Models\Student;
use Modules\Clinical\Models\LogbookEntry;
use Modules\Examination\Models\Exam;
use Modules\Incident\Models\IncidentReport;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\RotationPeriod;

/**
 * Registry tool ber-WHITELIST untuk AI Assistant (function-calling).
 *
 * KEAMANAN: hanya agregat read-only & NON-PII. Tidak ada SQL mentah, tidak ada
 * data per-individu (nama/nilai), dan tidak ada angka keuangan (v1). Nama tool
 * yang dipanggil model selalu divalidasi terhadap whitelist sebelum dieksekusi.
 */
class AiContextService
{
    /** Whitelist nama tool yang boleh dieksekusi. */
    public function allowed(): array
    {
        return [
            'count_incidents_by_status',
            'count_logbooks_by_status',
            'count_exams_by_status',
            'get_system_counts',
            'get_active_rotation_periods',
        ];
    }

    /**
     * Definisi tool dalam format OpenAI function-calling.
     *
     * @return array<int, array<string, mixed>>
     */
    public function toolDefinitions(): array
    {
        $noArgs = ['type' => 'object', 'properties' => (object) [], 'required' => []];

        return [
            $this->def('count_incidents_by_status', 'Jumlah laporan insiden dikelompokkan per status (submitted, investigating, resolved).', $noArgs),
            $this->def('count_logbooks_by_status', 'Jumlah entri logbook klinis per status (draft, submitted, verified, rejected).', $noArgs),
            $this->def('count_exams_by_status', 'Jumlah ujian (OSCE/CBT/WRITTEN) per status (DRAFT, ONGOING, COMPLETED).', $noArgs),
            $this->def('get_system_counts', 'Hitungan entitas inti: mahasiswa, rumah sakit, program studi, stase, ujian.', $noArgs),
            $this->def('get_active_rotation_periods', 'Daftar periode rotasi aktif (nama, tanggal mulai & selesai).', $noArgs),
        ];
    }

    /**
     * Eksekusi tool ber-whitelist. Nama di luar whitelist ditolak.
     *
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>|array<int, mixed>
     */
    public function execute(string $name, array $args = []): array
    {
        if (! in_array($name, $this->allowed(), true)) {
            return ['error' => 'Tool tidak dikenal atau tidak diizinkan.'];
        }

        return match ($name) {
            'count_incidents_by_status' => $this->groupCount(IncidentReport::query(), 'status'),
            'count_logbooks_by_status' => $this->groupCount(LogbookEntry::query(), 'status'),
            'count_exams_by_status' => $this->groupCount(Exam::query(), 'status'),
            'get_system_counts' => [
                'students' => Student::count(),
                'hospitals' => Hospital::count(),
                'programs' => Program::count(),
                'stase' => Stase::count(),
                'exams' => Exam::count(),
            ],
            'get_active_rotation_periods' => RotationPeriod::where('status', 'ACTIVE')
                ->orderBy('start_date')
                ->get(['name', 'start_date', 'end_date'])
                ->map(fn ($p) => [
                    'name' => $p->name,
                    'start_date' => (string) $p->start_date,
                    'end_date' => (string) $p->end_date,
                ])
                ->toArray(),
            default => ['error' => 'Tool tidak dikenal.'],
        };
    }

    /**
     * @param  array<string, mixed>  $parameters
     * @return array<string, mixed>
     */
    private function def(string $name, string $description, array $parameters): array
    {
        return [
            'type' => 'function',
            'function' => [
                'name' => $name,
                'description' => $description,
                'parameters' => $parameters,
            ],
        ];
    }

    /**
     * Hitung jumlah baris dikelompokkan per kolom status (kolom internal, bukan input user).
     *
     * @param  Builder  $query
     * @return array<string, int>
     */
    private function groupCount($query, string $column): array
    {
        return $query->selectRaw("{$column}, COUNT(*) as c")
            ->groupBy($column)
            ->pluck('c', $column)
            ->map(fn ($c) => (int) $c)
            ->toArray();
    }
}
