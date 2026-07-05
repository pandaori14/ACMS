<?php

namespace Modules\Examination\Services;

use App\Models\User;
use Illuminate\Support\Carbon;
use Modules\Examination\Models\Exam;
use Modules\Examination\Models\ExamAnswer;
use Modules\Examination\Models\ExamParticipant;

/**
 * Mesin CBT/WRITTEN online: mulai attempt, simpan jawaban, auto-grading,
 * dan state (dengan auto-submit lazy saat deadline lewat).
 * Semua aturan waktu ditegakkan SERVER-SIDE.
 */
class CbtService
{
    private const GRACE_SECONDS = 30;

    /**
     * Peserta terdaftar untuk exam ini (exam_participants.student_id = users.id).
     */
    public function participantFor(Exam $exam, User $user): ?ExamParticipant
    {
        return ExamParticipant::where('exam_id', $exam->id)
            ->where('student_id', $user->id)
            ->first();
    }

    /**
     * Mulai (atau lanjutkan) attempt. Return payload soal TANPA kunci jawaban.
     *
     * @return array{error?: string, code?: int}|array<string, mixed>
     */
    public function startAttempt(Exam $exam, User $user): array
    {
        if (! in_array($exam->type, ['CBT', 'WRITTEN'], true)) {
            return ['error' => 'Ujian ini bukan tipe CBT/tertulis online.', 'code' => 422];
        }
        if ($exam->status !== 'ONGOING') {
            return ['error' => 'Ujian belum dibuka atau sudah ditutup.', 'code' => 422];
        }

        $participant = $this->participantFor($exam, $user);
        if (! $participant) {
            return ['error' => 'Anda tidak terdaftar sebagai peserta ujian ini.', 'code' => 403];
        }
        if ($participant->submitted_at) {
            return ['error' => 'Anda sudah mengumpulkan ujian ini.', 'code' => 422];
        }

        if (! $participant->started_at) {
            $participant->update([
                'started_at' => now(),
                'status' => 'IN_PROGRESS',
            ]);
            $participant->refresh();
        }

        return $this->attemptPayload($exam, $participant);
    }

    /**
     * Simpan/ubah satu jawaban (upsert). Ditolak setelah submit / lewat deadline.
     */
    public function saveAnswer(Exam $exam, User $user, string $questionId, string $optionId): array
    {
        $participant = $this->participantFor($exam, $user);
        if (! $participant || ! $participant->started_at) {
            return ['error' => 'Attempt belum dimulai.', 'code' => 422];
        }
        if ($participant->submitted_at) {
            return ['error' => 'Ujian sudah dikumpulkan — jawaban terkunci.', 'code' => 422];
        }

        $deadline = $this->deadlineFor($exam, $participant);
        if ($deadline && now()->greaterThan($deadline->copy()->addSeconds(self::GRACE_SECONDS))) {
            return ['error' => 'Waktu ujian telah habis.', 'code' => 422];
        }

        // Validasi soal & opsi milik exam ini
        $question = $exam->questions()->where('id', $questionId)->first();
        if (! $question || ! $question->options()->where('id', $optionId)->exists()) {
            return ['error' => 'Soal/opsi tidak valid untuk ujian ini.', 'code' => 422];
        }

        ExamAnswer::updateOrCreate(
            ['exam_participant_id' => $participant->id, 'exam_question_id' => $questionId],
            ['exam_question_option_id' => $optionId]
        );

        return ['saved' => true];
    }

    /**
     * Kumpulkan & auto-grade: skor = Σ poin benar / Σ poin × 100.
     */
    public function submit(Exam $exam, User $user): array
    {
        $participant = $this->participantFor($exam, $user);
        if (! $participant || ! $participant->started_at) {
            return ['error' => 'Attempt belum dimulai.', 'code' => 422];
        }
        if ($participant->submitted_at) {
            return $this->resultPayload($exam, $participant);
        }

        return $this->grade($exam, $participant);
    }

    /**
     * State attempt utk peserta; auto-submit lazy bila deadline lewat.
     */
    public function attemptState(Exam $exam, User $user): array
    {
        $participant = $this->participantFor($exam, $user);
        if (! $participant) {
            return ['error' => 'Anda tidak terdaftar sebagai peserta ujian ini.', 'code' => 403];
        }

        if ($participant->submitted_at) {
            return $this->resultPayload($exam, $participant);
        }

        if (! $participant->started_at) {
            return [
                'state' => 'not_started',
                'question_count' => $exam->questions()->count(),
                'duration_minutes' => $exam->duration_minutes,
            ];
        }

        $deadline = $this->deadlineFor($exam, $participant);
        if ($deadline && now()->greaterThan($deadline->copy()->addSeconds(self::GRACE_SECONDS))) {
            // Waktu habis → auto-submit dengan jawaban yang ada
            return $this->grade($exam, $participant);
        }

        return $this->attemptPayload($exam, $participant);
    }

    // ─────────────────────── internal ───────────────────────

    private function deadlineFor(Exam $exam, ExamParticipant $participant): ?Carbon
    {
        if (! $exam->duration_minutes || ! $participant->started_at) {
            return null;
        }

        return $participant->started_at->copy()->addMinutes($exam->duration_minutes);
    }

    private function attemptPayload(Exam $exam, ExamParticipant $participant): array
    {
        $questions = $exam->questions()->with('options')->get()->map(fn ($q) => [
            'id' => $q->id,
            'question_text' => $q->question_text,
            'points' => $q->points,
            'order' => $q->order,
            // TANPA is_correct — kunci tidak boleh bocor ke peserta
            'options' => $q->options->map(fn ($o) => [
                'id' => $o->id,
                'option_text' => $o->option_text,
                'order' => $o->order,
            ])->values(),
        ])->values();

        $answers = ExamAnswer::where('exam_participant_id', $participant->id)
            ->pluck('exam_question_option_id', 'exam_question_id');

        $deadline = $this->deadlineFor($exam, $participant);

        return [
            'state' => 'in_progress',
            'questions' => $questions,
            'answers' => $answers,
            'started_at' => $participant->started_at?->toIso8601String(),
            'deadline' => $deadline?->toIso8601String(),
            'remaining_seconds' => $deadline ? max(0, (int) now()->diffInSeconds($deadline, false)) : null,
        ];
    }

    private function grade(Exam $exam, ExamParticipant $participant): array
    {
        $questions = $exam->questions()->with('options')->get();
        $totalPoints = max(1, (int) $questions->sum('points'));

        $answers = ExamAnswer::where('exam_participant_id', $participant->id)
            ->pluck('exam_question_option_id', 'exam_question_id');

        $earned = 0;
        foreach ($questions as $question) {
            $chosen = $answers[$question->id] ?? null;
            if (! $chosen) {
                continue;
            }
            $correct = $question->options->firstWhere('is_correct', true);
            if ($correct && $correct->id === $chosen) {
                $earned += $question->points;
            }
        }

        $score = round($earned / $totalPoints * 100, 2);

        $participant->update([
            'final_score' => $score,
            'status' => 'SUBMITTED',
            'submitted_at' => now(),
        ]);

        return $this->resultPayload($exam, $participant->fresh());
    }

    private function resultPayload(Exam $exam, ExamParticipant $participant): array
    {
        $passing = $exam->effectivePassingScore();

        return [
            'state' => 'finished',
            'score' => (float) $participant->final_score,
            'passing_score' => $passing,
            'passed' => (float) $participant->final_score >= $passing,
            'submitted_at' => $participant->submitted_at?->toIso8601String(),
        ];
    }
}
