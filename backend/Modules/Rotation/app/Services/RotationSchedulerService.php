<?php

namespace Modules\Rotation\Services;

use App\Models\Setting;
use App\Services\NotificationService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Academic\Models\AcademicEvent;
use Modules\Academic\Models\Stase;
use Modules\Academic\Models\Student;
use Modules\Assessment\Models\StaseGrade;
use Modules\Rotation\Models\Hospital;
use Modules\Rotation\Models\HospitalCapacity;
use Modules\Rotation\Models\RotationAssignment;
use Modules\Rotation\Models\RotationPeriod;

/**
 * Mesin penjadwalan rotasi otomatis (round-robin):
 * distribusikan mahasiswa satu program/angkatan ke stase × RS pada satu
 * periode — hormati kuota kapasitas, hindari stase yang sudah pernah
 * dijalani, dan seimbangkan beban antar-stase & antar-RS.
 *
 * Juga menjadi satu-satunya sumber aturan konflik/kuota penempatan
 * (dipakai pula oleh RotationAssignmentController untuk penempatan manual).
 */
class RotationSchedulerService
{
    /**
     * Cek konflik penempatan tunggal: status mahasiswa non-aktif, periode
     * kena blackout kalender akademik, dobel di periode yang sama, prasyarat
     * stase belum selesai, atau kuota penuh.
     * Mengembalikan pesan alasan, atau null bila aman.
     */
    public function assignmentConflict(array $data): ?string
    {
        if ($reason = $this->studentInactive($data['student_id'])) {
            return $reason;
        }

        if ($reason = $this->periodBlackout($data['rotation_period_id'])) {
            return $reason;
        }

        $exists = RotationAssignment::where('rotation_period_id', $data['rotation_period_id'])
            ->where('student_id', $data['student_id'])
            ->exists();

        if ($exists) {
            return 'Mahasiswa sudah memiliki penempatan pada periode ini.';
        }

        if ($reason = $this->prerequisitesUnmet($data['student_id'], $data['stase_id'])) {
            return $reason;
        }

        if ($reason = $this->remedialGuard($data['student_id'], $data['stase_id'])) {
            return $reason;
        }

        return $this->capacityFull($data['hospital_id'], $data['stase_id'], $data['rotation_period_id']);
    }

    /**
     * Validasi tukar slot dua penempatan (swap): harus se-periode, keduanya
     * berstatus pending/confirmed (belum berjalan), dan masing-masing
     * mahasiswa memenuhi prasyarat + guard remedial untuk stase LAWANNYA.
     * Kapasitas netral (tukar 1:1). Return alasan gagal, atau null bila aman.
     */
    public function swapConflict(RotationAssignment $a, RotationAssignment $b): ?string
    {
        if ($a->id === $b->id) {
            return 'Tidak bisa menukar penempatan dengan dirinya sendiri.';
        }
        if ($a->rotation_period_id !== $b->rotation_period_id) {
            return 'Kedua penempatan harus berada pada periode rotasi yang sama.';
        }

        $swappable = ['pending', 'confirmed'];
        if (! in_array($a->status, $swappable, true) || ! in_array($b->status, $swappable, true)) {
            return 'Hanya penempatan berstatus pending/confirmed yang dapat ditukar.';
        }

        if ($a->stase_id !== $b->stase_id) {
            if ($reason = $this->prerequisitesUnmet($a->student_id, $b->stase_id)) {
                return "Pemohon: {$reason}";
            }
            if ($reason = $this->remedialGuard($a->student_id, $b->stase_id)) {
                return "Pemohon: {$reason}";
            }
            if ($reason = $this->prerequisitesUnmet($b->student_id, $a->stase_id)) {
                return "Mitra tukar: {$reason}";
            }
            if ($reason = $this->remedialGuard($b->student_id, $a->stase_id)) {
                return "Mitra tukar: {$reason}";
            }
        }

        return null;
    }

    /**
     * Guard remedial: mengulang stase hanya boleh bila BELUM lulus, dan
     * total percobaan tidak melampaui 1 + Settings `max_remedial_attempts`
     * (lewat batas → butuh keputusan akademik manual, bukan penempatan biasa).
     */
    private function remedialGuard(string $studentId, string $staseId): ?string
    {
        $priorAssignments = RotationAssignment::where('student_id', $studentId)
            ->where('stase_id', $staseId)
            ->get(['id']);

        if ($priorAssignments->isEmpty()) {
            return null;
        }

        // Sudah lulus (nilai published ≥ passing grade stase) → tak perlu mengulang
        $passingGrade = (float) Stase::whereKey($staseId)->value('passing_grade');
        $bestScore = StaseGrade::whereIn('rotation_assignment_id', $priorAssignments->pluck('id'))
            ->where('status', 'published')
            ->max('final_score');

        if ($bestScore !== null && (float) $bestScore >= $passingGrade) {
            return 'Mahasiswa sudah LULUS stase ini — penempatan ulang tidak diperlukan.';
        }

        $maxAttempts = 1 + (int) Setting::getValue('max_remedial_attempts', 2);
        if ($priorAssignments->count() >= $maxAttempts) {
            return "Batas maksimal {$maxAttempts} percobaan stase tercapai — perlu keputusan review akademik.";
        }

        return null;
    }

    /**
     * Guard siklus mahasiswa: hanya status `active` yang boleh ditempatkan
     * (cuti/lulus/DO ditolak — selaras kandidat auto-scheduler).
     */
    private function studentInactive(string $studentId): ?string
    {
        $status = Student::whereKey($studentId)->value('status');

        if ($status !== null && $status !== 'active') {
            return "Mahasiswa berstatus '{$status}' — hanya mahasiswa aktif yang dapat ditempatkan.";
        }

        return null;
    }

    /**
     * Guard kalender akademik: periode rotasi yang tumpang tindih event
     * blackout (blocks_rotation=true) tidak boleh menerima penempatan.
     */
    private function periodBlackout(string $periodId): ?string
    {
        // Tanpa memo instance: controller/service Laravel bisa hidup lintas
        // request (route caching, Octane) — memo akan basi.
        $period = RotationPeriod::find($periodId);
        if (! $period) {
            return null;
        }

        $event = AcademicEvent::where('blocks_rotation', true)
            ->where('start_date', '<=', $period->end_date)
            ->where('end_date', '>=', $period->start_date)
            ->first();

        return $event
            ? "Periode rotasi tumpang tindih blackout kalender akademik: {$event->title} ({$event->start_date->format('d/m/Y')}–{$event->end_date->format('d/m/Y')})."
            : null;
    }

    /**
     * Guard prasyarat stase: seluruh stase prasyarat harus sudah SELESAI
     * (assignment status `completed`) sebelum mahasiswa boleh masuk stase ini.
     */
    private function prerequisitesUnmet(string $studentId, string $staseId): ?string
    {
        $prereqIds = Stase::whereKey($staseId)->value('prerequisite_stase_ids') ?? [];
        if (empty($prereqIds)) {
            return null;
        }

        $completed = RotationAssignment::where('student_id', $studentId)
            ->whereIn('stase_id', $prereqIds)
            ->where('status', 'completed')
            ->pluck('stase_id')
            ->all();

        $missing = array_diff($prereqIds, $completed);
        if (empty($missing)) {
            return null;
        }

        $names = Stase::whereIn('id', $missing)->pluck('name')->implode(', ');

        return "Prasyarat stase belum selesai: {$names}.";
    }

    /**
     * Guard kuota RS per stase (hospital_capacities). Baris spesifik-periode
     * menang atas baris umum (period null). Tanpa baris = tidak dibatasi.
     */
    public function capacityFull(string $hospitalId, string $staseId, string $periodId): ?string
    {
        $max = $this->capacityLimit($hospitalId, $staseId, $periodId);
        if ($max === null) {
            return null;
        }

        $occupied = RotationAssignment::where('hospital_id', $hospitalId)
            ->where('stase_id', $staseId)
            ->where('rotation_period_id', $periodId)
            ->count();

        if ($occupied >= $max) {
            return "Kuota penuh: RS ini hanya menampung {$max} mahasiswa untuk stase tersebut pada periode ini.";
        }

        return null;
    }

    /**
     * Batas kuota efektif untuk slot RS×stase×periode (spesifik periode
     * menang atas umum). Null = tidak dibatasi.
     */
    private function capacityLimit(string $hospitalId, string $staseId, string $periodId): ?int
    {
        $capacity = HospitalCapacity::where('hospital_id', $hospitalId)
            ->where('stase_id', $staseId)
            ->where(function ($q) use ($periodId) {
                $q->where('rotation_period_id', $periodId)->orWhereNull('rotation_period_id');
            })
            ->orderByRaw('rotation_period_id IS NULL') // spesifik periode dulu
            ->first();

        return $capacity?->max_students;
    }

    /**
     * Notifikasi penempatan ke mahasiswa (Aturan C — via SMTP matrix).
     */
    public function notifyStudentAssigned(RotationAssignment $assignment): void
    {
        $assignment->loadMissing(['student.user', 'stase', 'hospital', 'rotationPeriod']);
        $email = $assignment->student?->user?->email;

        if (! $email) {
            return;
        }

        NotificationService::sendDynamicEmail(
            $email,
            'Penempatan Rotasi Klinik Anda',
            'email_template_rotation_assigned',
            'rotation_assigned',
            [
                'name' => $assignment->student->user->name,
                'stase' => $assignment->stase?->name ?? '-',
                'hospital' => $assignment->hospital?->name ?? '-',
                'period' => $assignment->rotationPeriod?->name ?? '-',
            ]
        );
    }

    /**
     * PREVIEW distribusi otomatis — TIDAK menulis DB.
     *
     * @return array{placements: array, unplaced: array, summary: array}
     */
    public function preview(string $periodId, ?string $cohortId = null): array
    {
        $period = RotationPeriod::findOrFail($periodId);

        // Blackout kalender akademik → tidak ada yang bisa dijadwalkan
        if ($reason = $this->periodBlackout($periodId)) {
            return [
                'placements' => [],
                'unplaced' => [],
                'summary' => ['candidates' => 0, 'placed' => 0, 'blocked_reason' => $reason],
            ];
        }

        // Kandidat: mahasiswa aktif program terkait yang BELUM ditempatkan pada periode ini
        $alreadyAssigned = RotationAssignment::where('rotation_period_id', $periodId)
            ->pluck('student_id');

        $students = Student::with('user:id,name,identity_number')
            ->where('program_id', $period->program_id)
            ->where('status', 'active')
            ->when($cohortId, fn ($q) => $q->where('cohort_id', $cohortId))
            ->whereNotIn('id', $alreadyAssigned)
            ->get();

        // Stase program (urut nama agar deterministik)
        $stases = Stase::where('program_id', $period->program_id)->orderBy('name')->get();

        if ($stases->isEmpty()) {
            return [
                'placements' => [],
                'unplaced' => $students->map(fn ($s) => [
                    'student_id' => $s->id,
                    'name' => $s->user?->name,
                    'reason' => 'Program belum memiliki stase.',
                ])->all(),
                'summary' => ['candidates' => $students->count(), 'placed' => 0],
            ];
        }

        // RS kandidat per stase = RS yang punya baris kuota utk stase tsb;
        // fallback: semua RS (tak dibatasi kuota).
        $capacities = HospitalCapacity::with('hospital:id,name')
            ->whereIn('stase_id', $stases->pluck('id'))
            ->where(function ($q) use ($periodId) {
                $q->where('rotation_period_id', $periodId)->orWhereNull('rotation_period_id');
            })
            ->get();

        $allHospitals = Hospital::orderBy('name')->get(['id', 'name']);

        // Okupansi berjalan (DB + draft yang sedang disusun)
        $occupancy = []; // "hospital|stase" => count
        RotationAssignment::where('rotation_period_id', $periodId)
            ->get(['hospital_id', 'stase_id'])
            ->each(function ($a) use (&$occupancy) {
                $key = $a->hospital_id.'|'.$a->stase_id;
                $occupancy[$key] = ($occupancy[$key] ?? 0) + 1;
            });

        // Beban stase (untuk pemerataan round-robin antar mahasiswa)
        $staseLoad = $stases->mapWithKeys(fn ($s) => [$s->id => 0])->all();

        // Riwayat stase per mahasiswa (lintas periode) — jangan diulang;
        // subset ber-status completed dipakai untuk cek prasyarat.
        $historyRows = RotationAssignment::whereIn('student_id', $students->pluck('id'))
            ->get(['student_id', 'stase_id', 'status']);
        $history = $historyRows->groupBy('student_id')
            ->map(fn ($rows) => $rows->pluck('stase_id')->all());
        $completedHistory = $historyRows->where('status', 'completed')
            ->groupBy('student_id')
            ->map(fn ($rows) => $rows->pluck('stase_id')->all());

        $placements = [];
        $unplaced = [];

        foreach ($students as $student) {
            $done = collect($history->get($student->id, []));
            $completed = collect($completedHistory->get($student->id, []));

            // Kandidat stase: belum pernah dijalani, prasyaratnya sudah selesai,
            // urut beban paling ringan
            $candidateStases = $stases
                ->reject(fn ($s) => $done->contains($s->id))
                ->reject(fn ($s) => collect($s->prerequisite_stase_ids ?? [])
                    ->diff($completed)->isNotEmpty())
                ->sortBy(fn ($s) => $staseLoad[$s->id])
                ->values();

            if ($candidateStases->isEmpty()) {
                $unplaced[] = [
                    'student_id' => $student->id,
                    'name' => $student->user?->name,
                    'reason' => 'Tidak ada stase tersedia: sudah dijalani semua atau prasyaratnya belum selesai.',
                ];

                continue;
            }

            $placed = false;
            foreach ($candidateStases as $stase) {
                $hospital = $this->pickHospital($stase->id, $periodId, $capacities, $allHospitals, $occupancy);
                if ($hospital === null) {
                    continue; // semua RS penuh utk stase ini → coba stase berikutnya
                }

                $key = $hospital['id'].'|'.$stase->id;
                $occupancy[$key] = ($occupancy[$key] ?? 0) + 1;
                $staseLoad[$stase->id]++;

                $placements[] = [
                    'student_id' => $student->id,
                    'student_name' => $student->user?->name,
                    'identity_number' => $student->user?->identity_number,
                    'stase_id' => $stase->id,
                    'stase_name' => $stase->name,
                    'hospital_id' => $hospital['id'],
                    'hospital_name' => $hospital['name'],
                ];
                $placed = true;
                break;
            }

            if (! $placed) {
                $unplaced[] = [
                    'student_id' => $student->id,
                    'name' => $student->user?->name,
                    'reason' => 'Kuota semua RS penuh untuk stase yang tersisa.',
                ];
            }
        }

        return [
            'placements' => $placements,
            'unplaced' => $unplaced,
            'summary' => [
                'candidates' => $students->count(),
                'placed' => count($placements),
            ],
        ];
    }

    /**
     * COMMIT hasil preview: transaksi + re-cek konflik/kuota per baris
     * (race guard) + notifikasi per mahasiswa.
     *
     * @param  array<int, array{student_id:string, stase_id:string, hospital_id:string}>  $placements
     * @return array{created:int, skipped:array}
     */
    public function commit(string $periodId, array $placements): array
    {
        $created = 0;
        $skipped = [];
        $toNotify = [];

        DB::transaction(function () use ($periodId, $placements, &$created, &$skipped, &$toNotify) {
            foreach ($placements as $p) {
                $data = [
                    'rotation_period_id' => $periodId,
                    'student_id' => $p['student_id'],
                    'stase_id' => $p['stase_id'],
                    'hospital_id' => $p['hospital_id'],
                    'status' => 'confirmed',
                ];

                if ($reason = $this->assignmentConflict($data)) {
                    $skipped[] = ['student_id' => $p['student_id'], 'reason' => $reason];

                    continue;
                }

                $toNotify[] = RotationAssignment::create($data);
                $created++;
            }
        });

        // Notifikasi di luar transaksi (email di-queue oleh NotificationService)
        foreach ($toNotify as $assignment) {
            $this->notifyStudentAssigned($assignment);
        }

        return ['created' => $created, 'skipped' => $skipped];
    }

    /**
     * Pilih RS untuk satu slot stase: RS ber-kuota dengan SISA terbanyak;
     * bila stase tak punya baris kuota sama sekali → RS mana pun (beban tersedikit).
     *
     * @return array{id:string, name:string}|null null bila semua penuh
     */
    private function pickHospital(
        string $staseId,
        string $periodId,
        Collection $capacities,
        Collection $allHospitals,
        array $occupancy
    ): ?array {
        $rows = $capacities->where('stase_id', $staseId);

        if ($rows->isEmpty()) {
            // Tak dibatasi kuota → seimbangkan beban antar semua RS
            $best = $allHospitals->sortBy(
                fn ($h) => $occupancy[$h->id.'|'.$staseId] ?? 0
            )->first();

            return $best ? ['id' => $best->id, 'name' => $best->name] : null;
        }

        // Baris spesifik periode menang atas baris umum utk RS yang sama
        $byHospital = $rows->groupBy('hospital_id')->map(function ($group) {
            return $group->firstWhere('rotation_period_id', '!=', null) ?? $group->first();
        });

        $best = null;
        $bestRemaining = 0;
        foreach ($byHospital as $hospitalId => $cap) {
            $used = $occupancy[$hospitalId.'|'.$staseId] ?? 0;
            $remaining = $cap->max_students - $used;
            if ($remaining > $bestRemaining) {
                $bestRemaining = $remaining;
                $best = ['id' => $hospitalId, 'name' => $cap->hospital?->name ?? '-'];
            }
        }

        return $best;
    }
}
