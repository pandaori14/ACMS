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
use Modules\Assessment\Models\GeneratedDocument;
use Modules\Assessment\Notifications\DocumentReadyNotification;
use Modules\Clinical\Models\LogbookEntry;

/**
 * Job kompilasi BUKU LOGBOOK: seluruh logbook terverifikasi seorang
 * mahasiswa (dikelompokkan per stase) menjadi satu PDF ber-QR verifikasi.
 * Dokumen yudisium pendamping transkrip.
 */
class CompileLogbookBookDocument implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Kompilasi bisa besar — beri waktu lebih. */
    public int $timeout = 300;

    public function __construct(public string $documentId) {}

    public function handle(): void
    {
        $document = GeneratedDocument::find($this->documentId);
        if (! $document) {
            return;
        }

        try {
            $user = User::with(['program', 'student'])->findOrFail($document->user_id);

            // logbook_entries.student_id = students.id (jebakan dual-ID)
            $entries = collect();
            if ($user->student) {
                $entries = LogbookEntry::with([
                    'rotationAssignment.stase:id,name',
                    'rotationAssignment.hospital:id,name',
                    'competency:id,name',
                    'preceptor:id,name',
                ])
                    ->where('student_id', $user->student->id)
                    ->where('status', 'verified')
                    ->orderBy('activity_date')
                    ->get();
            }

            $byStase = $entries->groupBy(
                fn ($e) => $e->rotationAssignment?->stase?->name ?? 'Tanpa Stase'
            );

            $verifyUrl = rtrim(config('app.url'), '/').'/verify/'.$document->verification_code;
            $qrDataUri = (new Builder(
                writer: new SvgWriter,
                data: $verifyUrl,
                size: 140,
                margin: 6,
            ))->build()->getDataUri();

            $pdf = Pdf::loadView('assessment::pdf.logbook-book', [
                'user' => $user,
                'byStase' => $byStase,
                'totalEntries' => $entries->count(),
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
                    'stase_count' => $byStase->count(),
                    'entry_count' => $entries->count(),
                ],
            ]);

            $user->notify(new DocumentReadyNotification($document));
        } catch (\Throwable $e) {
            Log::error('Gagal kompilasi buku logbook: '.$e->getMessage(), [
                'document_id' => $this->documentId,
            ]);
            $document->update(['status' => 'failed']);
        }
    }
}
