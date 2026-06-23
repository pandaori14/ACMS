<?php

namespace App\Services;

use App\Models\User;
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
 * KONTEKS: endpoint AI dibatasi role:Super Admin (lihat routes/api.php). Super
 * Admin memang berwenang melihat seluruh data operasional sistem, sehingga tool
 * di sini boleh mengembalikan data nyata (termasuk nama) — bukan hanya agregat.
 *
 * KEAMANAN tetap dijaga:
 * - Read-only. Tidak ada SQL mentah; nama tool divalidasi terhadap whitelist.
 * - Tidak mengembalikan ID/UUID, password, token, atau data keuangan.
 * - Jumlah baris dibatasi (limit, maks 200) agar payload terkendali.
 */
class AiContextService
{
    private const MAX_ROWS = 200;

    private const DEFAULT_ROWS = 50;

    /** Whitelist nama tool yang boleh dieksekusi. */
    public function allowed(): array
    {
        return [
            'get_system_counts',
            'count_incidents_by_status',
            'count_logbooks_by_status',
            'count_exams_by_status',
            'get_active_rotation_periods',
            'list_students',
            'list_users',
            'list_hospitals',
            'list_programs',
            'list_stase',
            'list_exams',
            'list_recent_incidents',
        ];
    }

    /**
     * Definisi tool dalam format OpenAI function-calling.
     *
     * @return array<int, array<string, mixed>>
     */
    public function toolDefinitions(): array
    {
        $none = ['type' => 'object', 'properties' => (object) []];

        $listArgs = [
            'type' => 'object',
            'properties' => [
                'limit' => ['type' => 'integer', 'description' => 'Maksimum baris (default 50, maks 200).'],
                'search' => ['type' => 'string', 'description' => 'Filter berdasarkan nama (opsional).'],
            ],
        ];

        $userArgs = [
            'type' => 'object',
            'properties' => [
                'limit' => ['type' => 'integer', 'description' => 'Maksimum baris (default 50, maks 200).'],
                'search' => ['type' => 'string', 'description' => 'Filter nama (opsional).'],
                'role' => ['type' => 'string', 'description' => 'Filter peran, mis. "Dosen", "Mahasiswa", "Admin Prodi", "Dodiknis" (opsional).'],
            ],
        ];

        $examArgs = [
            'type' => 'object',
            'properties' => [
                'limit' => ['type' => 'integer', 'description' => 'Maksimum baris (default 50).'],
                'status' => ['type' => 'string', 'description' => 'Filter status ujian: DRAFT, ONGOING, COMPLETED (opsional).'],
            ],
        ];

        $incidentArgs = [
            'type' => 'object',
            'properties' => [
                'limit' => ['type' => 'integer', 'description' => 'Maksimum baris (default 50).'],
                'status' => ['type' => 'string', 'description' => 'Filter status insiden: submitted, investigating, resolved (opsional).'],
            ],
        ];

        return [
            $this->def('get_system_counts', 'Hitungan TOTAL entitas inti: mahasiswa, rumah sakit, program studi, stase, ujian, pengguna.', $none),
            $this->def('count_incidents_by_status', 'Jumlah TOTAL laporan insiden per status (akumulatif sepanjang waktu, BUKAN per tanggal).', $none),
            $this->def('count_logbooks_by_status', 'Jumlah TOTAL entri logbook klinis per status (akumulatif sepanjang waktu, BUKAN per tanggal/hari tertentu).', $none),
            $this->def('count_exams_by_status', 'Jumlah TOTAL ujian per status (DRAFT, ONGOING, COMPLETED).', $none),
            $this->def('get_active_rotation_periods', 'Daftar periode rotasi aktif (nama, tanggal mulai & selesai).', $none),
            $this->def('list_students', 'Daftar mahasiswa: nama, email, program studi, status. Dukung pencarian nama.', $listArgs),
            $this->def('list_users', 'Daftar pengguna sistem: nama, email, peran. Bisa difilter per peran.', $userArgs),
            $this->def('list_hospitals', 'Daftar rumah sakit/wahana: kode, nama, tipe, alamat.', $listArgs),
            $this->def('list_programs', 'Daftar program studi: kode, nama, akreditasi.', $listArgs),
            $this->def('list_stase', 'Daftar stase: kode, nama, durasi (minggu), nilai lulus, program.', $listArgs),
            $this->def('list_exams', 'Daftar ujian: nama, tipe, status, tanggal, stase.', $examArgs),
            $this->def('list_recent_incidents', 'Daftar insiden terbaru: tipe, severity, status, tanggal, lokasi, ringkasan. TANPA identitas pelapor (anonimitas dijaga).', $incidentArgs),
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

        $limit = min(max((int) ($args['limit'] ?? self::DEFAULT_ROWS), 1), self::MAX_ROWS);
        $search = trim((string) ($args['search'] ?? ''));
        $role = trim((string) ($args['role'] ?? ''));
        $status = trim((string) ($args['status'] ?? ''));

        return match ($name) {
            'get_system_counts' => [
                'students' => Student::count(),
                'hospitals' => Hospital::count(),
                'programs' => Program::count(),
                'stase' => Stase::count(),
                'exams' => Exam::count(),
                'users' => User::count(),
            ],
            'count_incidents_by_status' => $this->groupCount(IncidentReport::query(), 'status'),
            'count_logbooks_by_status' => $this->groupCount(LogbookEntry::query(), 'status'),
            'count_exams_by_status' => $this->groupCount(Exam::query(), 'status'),

            'get_active_rotation_periods' => RotationPeriod::where('status', 'ACTIVE')
                ->orderBy('start_date')
                ->limit($limit)
                ->get(['name', 'start_date', 'end_date'])
                ->map(fn ($p) => [
                    'name' => $p->name,
                    'start_date' => (string) $p->start_date,
                    'end_date' => (string) $p->end_date,
                ])
                ->toArray(),

            'list_students' => Student::with(['user:id,name,email', 'program:id,name'])
                ->when($search !== '', fn ($q) => $q->whereHas('user', fn ($u) => $u->where('name', 'like', "%{$search}%")))
                ->limit($limit)
                ->get()
                ->map(fn ($s) => [
                    'name' => $s->user?->name,
                    'email' => $s->user?->email,
                    'program' => $s->program?->name,
                    'status' => $s->status,
                ])
                ->toArray(),

            'list_users' => User::query()
                ->with('roles:id,name')
                ->when($role !== '', fn ($q) => $q->whereHas('roles', fn ($r) => $r->where('name', $role)))
                ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%"))
                ->limit($limit)
                ->get(['id', 'name', 'email'])
                ->map(fn ($u) => [
                    'name' => $u->name,
                    'email' => $u->email,
                    'roles' => $u->roles->pluck('name')->toArray(),
                ])
                ->toArray(),

            'list_hospitals' => Hospital::query()
                ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%"))
                ->limit($limit)
                ->get(['code', 'name', 'type', 'address'])
                ->map(fn ($h) => [
                    'code' => $h->code,
                    'name' => $h->name,
                    'type' => $h->type,
                    'address' => $h->address,
                ])
                ->toArray(),

            'list_programs' => Program::query()
                ->limit($limit)
                ->get(['code', 'name', 'accreditation'])
                ->map(fn ($p) => [
                    'code' => $p->code,
                    'name' => $p->name,
                    'accreditation' => $p->accreditation,
                ])
                ->toArray(),

            'list_stase' => Stase::with('program:id,name')
                ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%"))
                ->limit($limit)
                ->get()
                ->map(fn ($s) => [
                    'code' => $s->code,
                    'name' => $s->name,
                    'duration_weeks' => $s->duration_weeks,
                    'passing_grade' => $s->passing_grade,
                    'program' => $s->program?->name,
                ])
                ->toArray(),

            'list_exams' => Exam::with('stase:id,name')
                ->when($status !== '', fn ($q) => $q->where('status', $status))
                ->orderByDesc('date')
                ->limit($limit)
                ->get()
                ->map(fn ($e) => [
                    'name' => $e->name,
                    'type' => $e->type,
                    'status' => $e->status,
                    'date' => (string) $e->date,
                    'stase' => $e->stase?->name,
                ])
                ->toArray(),

            // Insiden: TANPA reporter_id/identitas pelapor (anonimitas dijaga).
            'list_recent_incidents' => IncidentReport::query()
                ->when($status !== '', fn ($q) => $q->where('status', $status))
                ->orderByDesc('incident_date')
                ->limit($limit)
                ->get(['incident_type', 'severity', 'status', 'incident_date', 'location', 'description', 'is_anonymous'])
                ->map(fn ($r) => [
                    'type' => $r->incident_type,
                    'severity' => $r->severity,
                    'status' => $r->status,
                    'date' => (string) $r->incident_date,
                    'location' => $r->location,
                    'summary' => mb_strimwidth((string) $r->description, 0, 160, '…'),
                    'anonymous' => (bool) $r->is_anonymous,
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
