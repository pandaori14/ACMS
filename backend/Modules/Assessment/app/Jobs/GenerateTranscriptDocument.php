<?php

namespace Modules\Assessment\Jobs;

use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Writer\SvgWriter;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Modules\Assessment\Models\ClinicalAssessment;
use Modules\Assessment\Models\GeneratedDocument;
use Modules\Assessment\Models\StaseGrade;
use Modules\Assessment\Notifications\DocumentReadyNotification;
use Modules\Clinical\Models\LogbookEntry;

/**
 * Job latar belakang pembuatan Transkrip Resmi (Yudisium):
 * render PDF (sampul + daftar stase + rekap keterampilan) ber-QR verifikasi,
 * simpan ke storage, tandai ready, dan beri tahu pemiliknya.
 */
class GenerateTranscriptDocument implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public string $documentId) {}

    public function handle(): void
    {
        $document = GeneratedDocument::find($this->documentId);
        if (! $document) {
            return;
        }

        try {
            $user = User::with(['program', 'student'])->findOrFail($document->user_id);

            // Nilai stase terbit (stase_grades.student_id = users.id)
            $grades = StaseGrade::with(['rotationAssignment.stase', 'rotationAssignment.hospital'])
                ->where('student_id', $user->id)
                ->where('status', 'published')
                ->orderBy('created_at')
                ->get();

            $average = $grades->count() > 0 ? round((float) $grades->avg('final_score'), 2) : null;

            // Rekap keterampilan: penilaian acknowledged per tipe instrumen
            $skills = ClinicalAssessment::with('template')
                ->where('student_id', $user->id)
                ->where('status', 'acknowledged')
                ->get()
                ->groupBy(fn ($a) => $a->template?->type ?? 'lainnya')
                ->map(fn ($group, $type) => [
                    'type' => strtoupper($type),
                    'count' => $group->count(),
                    'average' => round((float) $group->avg('total_score'), 2),
                ])->values();

            // Logbook terverifikasi per stase (logbook_entries.student_id = students.id!)
            $logbookCounts = collect();
            if ($user->student) {
                $logbookCounts = LogbookEntry::with('rotationAssignment.stase')
                    ->where('student_id', $user->student->id)
                    ->where('status', 'verified')
                    ->get()
                    ->groupBy(fn ($e) => $e->rotationAssignment?->stase?->name ?? '-')
                    ->map(fn ($group) => $group->count());
            }

            // QR verifikasi publik (SVG — tanpa ekstensi GD, aman di CLI/queue)
            $verifyUrl = rtrim(config('app.url'), '/').'/verify/'.$document->verification_code;
            $qrDataUri = (new Builder(
                writer: new SvgWriter,
                data: $verifyUrl,
                size: 140,
                margin: 6,
            ))->build()->getDataUri();

            $pdf = Pdf::loadView('assessment::pdf.yudisium', [
                'user' => $user,
                'grades' => $grades,
                'skills' => $skills,
                'logbookCounts' => $logbookCounts,
                'average' => $average,
                'qrDataUri' => $qrDataUri,
                'verifyUrl' => $verifyUrl,
                'verificationCode' => $document->verification_code,
                'generatedAt' => now(),
            ]);

            $path = "documents/{$user->id}/{$document->verification_code}.pdf";
            Storage::put($path, $pdf->output());

            $document->update([
                'status' => 'ready',
                'file_path' => $path,
                'meta' => [
                    'name' => $user->name,
                    'nim' => $user->identity_number,
                    'program' => $user->program?->name,
                    'average' => $average,
                    'stase_count' => $grades->count(),
                ],
            ]);

            $user->notify(new DocumentReadyNotification($document));
        } catch (\Throwable $e) {
            Log::error('Gagal generate transkrip yudisium: '.$e->getMessage(), [
                'document_id' => $this->documentId,
            ]);
            $document->update(['status' => 'failed']);
        }
    }
}
