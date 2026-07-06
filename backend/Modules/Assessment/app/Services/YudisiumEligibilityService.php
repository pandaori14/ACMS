<?php

namespace Modules\Assessment\Services;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Modules\Academic\Models\Competency;
use Modules\Academic\Models\Stase;
use Modules\Assessment\Models\ClinicalAssessment;
use Modules\Assessment\Models\StaseGrade;
use Modules\Attendance\Models\AttendanceRecord;
use Modules\Clinical\Models\LogbookEntry;
use Modules\Rotation\Models\RotationAssignment;

/**
 * Validator kelayakan yudisium: memeriksa seluruh syarat kelulusan seorang
 * mahasiswa terhadap data nyata sistem. Ambang minimum penilaian diambil
 * dari Settings (yudisium_min_*) — dapat dikonfigurasi Super Admin.
 *
 * Jebakan dual-ID: stase_grades & clinical_assessments memakai users.id;
 * logbook_entries, attendance_records & rotation_assignments memakai students.id.
 */
class YudisiumEligibilityService
{
    /**
     * Periksa seluruh syarat untuk satu mahasiswa (User ber-role Mahasiswa).
     *
     * @return array{eligible: bool, requirements: array<int, array{key:string,label:string,passed:bool,detail:string}>}
     */
    public function checkFor(User $user): array
    {
        $profile = $user->student;
        $programId = $profile?->program_id ?? $user->program_id;

        $requirements = [
            $this->checkStaseGrades($user, $programId),
            $this->checkLogbook($profile?->id),
            $this->checkCompetencies($profile?->id),
            $this->checkAssessments($user),
            $this->checkAttendance($profile?->id),
        ];

        return [
            'eligible' => collect($requirements)->every(fn ($r) => $r['passed']),
            'requirements' => $requirements,
        ];
    }

    /** Syarat 1: semua stase WAJIB program lulus (nilai published ≥ passing grade stase). */
    private function checkStaseGrades(User $user, ?string $programId): array
    {
        $mandatory = Stase::where('program_id', $programId)
            ->where('is_mandatory', true)
            ->get(['id', 'name', 'passing_grade']);

        if ($mandatory->isEmpty()) {
            return $this->requirement('stase_lulus', 'Semua stase wajib lulus', true, 'Program belum mendefinisikan stase wajib.');
        }

        $grades = StaseGrade::with('rotationAssignment:id,stase_id')
            ->where('student_id', $user->id)
            ->where('status', 'published')
            ->get()
            ->groupBy(fn ($g) => $g->rotationAssignment?->stase_id)
            ->map(fn ($group) => (float) $group->max('final_score'));

        $failing = $mandatory->filter(function ($stase) use ($grades) {
            $score = $grades->get($stase->id);

            return $score === null || $score < (float) $stase->passing_grade;
        });

        $passedCount = $mandatory->count() - $failing->count();

        return $this->requirement(
            'stase_lulus',
            'Semua stase wajib lulus',
            $failing->isEmpty(),
            $failing->isEmpty()
                ? "Lulus {$passedCount}/{$mandatory->count()} stase wajib."
                : 'Belum lulus: '.$failing->pluck('name')->implode(', ').'.'
        );
    }

    /** Syarat 2: tidak ada logbook menggantung & minimal ada logbook terverifikasi. */
    private function checkLogbook(?string $profileId): array
    {
        if (! $profileId) {
            return $this->requirement('logbook_bersih', 'Logbook terverifikasi seluruhnya', false, 'Profil mahasiswa tidak ditemukan.');
        }

        $counts = LogbookEntry::where('student_id', $profileId)
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $pending = (int) ($counts->get('draft', 0) + $counts->get('submitted', 0));
        $verified = (int) $counts->get('verified', 0);

        return $this->requirement(
            'logbook_bersih',
            'Logbook terverifikasi seluruhnya',
            $pending === 0 && $verified > 0,
            $pending > 0
                ? "{$pending} logbook masih draft/menunggu verifikasi."
                : ($verified > 0 ? "{$verified} logbook terverifikasi, tidak ada yang menggantung." : 'Belum ada logbook terverifikasi.')
        );
    }

    /** Syarat 3: semua target kompetensi (min_cases) stase yang dijalani terpenuhi. */
    private function checkCompetencies(?string $profileId): array
    {
        if (! $profileId) {
            return $this->requirement('kompetensi_tuntas', 'Target kompetensi terpenuhi', false, 'Profil mahasiswa tidak ditemukan.');
        }

        $staseIds = RotationAssignment::where('student_id', $profileId)
            ->pluck('stase_id')->unique();

        $targets = Competency::whereIn('stase_id', $staseIds)
            ->where('min_cases', '>', 0)
            ->get(['id', 'name', 'min_cases']);

        if ($targets->isEmpty()) {
            return $this->requirement('kompetensi_tuntas', 'Target kompetensi terpenuhi', true, 'Tidak ada target kompetensi ber-minimum kasus.');
        }

        $achieved = LogbookEntry::where('student_id', $profileId)
            ->where('status', 'verified')
            ->whereNotNull('competency_id')
            ->select('competency_id', DB::raw('count(*) as total'))
            ->groupBy('competency_id')
            ->pluck('total', 'competency_id');

        $unmet = $targets->filter(fn ($c) => (int) ($achieved[$c->id] ?? 0) < $c->min_cases);

        return $this->requirement(
            'kompetensi_tuntas',
            'Target kompetensi terpenuhi',
            $unmet->isEmpty(),
            $unmet->isEmpty()
                ? "Seluruh {$targets->count()} target kompetensi terpenuhi."
                : 'Belum terpenuhi: '.$unmet->pluck('name')->take(5)->implode(', ').($unmet->count() > 5 ? ' (+'.($unmet->count() - 5).' lagi)' : '').'.'
        );
    }

    /** Syarat 4: jumlah minimum penilaian acknowledged per instrumen (dari Settings). */
    private function checkAssessments(User $user): array
    {
        $minimums = [
            'mini-cex' => (int) Setting::getValue('yudisium_min_minicex', 1),
            'dops' => (int) Setting::getValue('yudisium_min_dops', 1),
            'cbd' => (int) Setting::getValue('yudisium_min_cbd', 1),
        ];

        $counts = ClinicalAssessment::with('template:id,type')
            ->where('student_id', $user->id)
            ->where('status', 'acknowledged')
            ->get()
            ->groupBy(fn ($a) => strtolower($a->template?->type ?? ''))
            ->map(fn ($group) => $group->count());

        $missing = [];
        foreach ($minimums as $type => $min) {
            $have = (int) ($counts->get($type, 0));
            if ($have < $min) {
                $missing[] = strtoupper($type)." ({$have}/{$min})";
            }
        }

        return $this->requirement(
            'penilaian_lengkap',
            'Penilaian klinis minimum terpenuhi',
            empty($missing),
            empty($missing)
                ? 'Jumlah Mini-CEX/DOPS/CBD acknowledged memenuhi ambang.'
                : 'Kurang: '.implode(', ', $missing).'.'
        );
    }

    /** Syarat 5: tidak ada presensi ber-flag yang belum diselesaikan. */
    private function checkAttendance(?string $profileId): array
    {
        if (! $profileId) {
            return $this->requirement('presensi_bersih', 'Presensi tanpa catatan menggantung', false, 'Profil mahasiswa tidak ditemukan.');
        }

        $flagged = AttendanceRecord::where('student_id', $profileId)
            ->where('is_flagged', true)
            ->count();

        return $this->requirement(
            'presensi_bersih',
            'Presensi tanpa catatan menggantung',
            $flagged === 0,
            $flagged === 0
                ? 'Tidak ada catatan presensi bermasalah.'
                : "{$flagged} catatan presensi ber-flag menunggu penyelesaian."
        );
    }

    /** @return array{key:string,label:string,passed:bool,detail:string} */
    private function requirement(string $key, string $label, bool $passed, string $detail): array
    {
        return ['key' => $key, 'label' => $label, 'passed' => $passed, 'detail' => $detail];
    }
}
