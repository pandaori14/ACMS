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
use Modules\Assessment\Models\StaseGrade;
use Modules\Assessment\Notifications\DocumentReadyNotification;

/**
 * Job pembuatan SURAT KETERANGAN formal ber-QR:
 * - letter_active   : Surat Keterangan Mahasiswa Aktif
 * - letter_graduated: Surat Keterangan Lulus (menyertakan IPK klinis)
 * Nomor surat berurutan per jenis per tahun.
 */
class GenerateLetterDocument implements ShouldQueue
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
            $user = User::with(['program', 'student.cohort'])->findOrFail($document->user_id);
            $letterType = str_replace('letter_', '', $document->type);

            // Nomor surat: urutan dokumen sejenis tahun berjalan
            $sequence = GeneratedDocument::where('type', $document->type)
                ->whereYear('created_at', now()->year)
                ->where('created_at', '<=', $document->created_at)
                ->count();
            $codeMap = ['active' => 'SKA', 'graduated' => 'SKL'];
            $letterNumber = sprintf(
                '%03d/%s/ACMS-FK/%s/%d',
                $sequence,
                $codeMap[$letterType] ?? 'SK',
                $this->romanMonth((int) now()->format('n')),
                now()->year
            );

            // IPK klinis untuk surat lulus
            $average = null;
            if ($letterType === 'graduated') {
                $grades = StaseGrade::where('student_id', $user->id)
                    ->where('status', 'published')
                    ->get();
                $average = $grades->count() > 0 ? round((float) $grades->avg('final_score'), 2) : null;
            }

            $verifyUrl = rtrim(config('app.url'), '/').'/verify/'.$document->verification_code;
            $qrDataUri = (new Builder(
                writer: new SvgWriter,
                data: $verifyUrl,
                size: 120,
                margin: 6,
            ))->build()->getDataUri();

            $pdf = Pdf::loadView('assessment::pdf.letter', [
                'user' => $user,
                'letterType' => $letterType,
                'letterNumber' => $letterNumber,
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
                    'letter_number' => $letterNumber,
                    'average' => $average,
                ],
            ]);

            $user->notify(new DocumentReadyNotification($document));
        } catch (\Throwable $e) {
            Log::error('Gagal generate surat keterangan: '.$e->getMessage(), [
                'document_id' => $this->documentId,
            ]);
            $document->update(['status' => 'failed']);
        }
    }

    private function romanMonth(int $month): string
    {
        return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][$month - 1];
    }
}
