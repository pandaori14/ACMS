<?php

namespace Modules\Assessment\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Academic\Models\Student;
use Modules\Assessment\Jobs\CompileLogbookBookDocument;
use Modules\Assessment\Jobs\GenerateLetterDocument;
use Modules\Assessment\Jobs\GenerateTranscriptDocument;
use Modules\Assessment\Models\GeneratedDocument;
use Modules\Assessment\Services\YudisiumEligibilityService;

/**
 * Dokumen resmi (Yudisium): generate transkrip ber-QR di latar belakang,
 * daftar "Dokumen Saya", dan unduhan aman dari storage privat.
 */
class YudisiumController extends Controller
{
    /**
     * Mulai pembuatan transkrip resmi (job queue). Mahasiswa untuk dirinya
     * sendiri; pemegang view-transcripts boleh untuk mahasiswa lain.
     */
    public function generate(Request $request)
    {
        $request->validate(['student_id' => 'nullable|uuid|exists:users,id']);

        $user = $request->user();
        $targetId = $request->input('student_id', $user->id);

        if ($targetId !== $user->id && ! $user->can('view-transcripts')) {
            return response()->json(['message' => 'Anda tidak berhak membuat dokumen untuk mahasiswa lain.'], 403);
        }
        if ($user->hasRole('Mahasiswa') && $targetId !== $user->id) {
            return response()->json(['message' => 'Mahasiswa hanya dapat membuat transkrip miliknya sendiri.'], 403);
        }

        // Pembuatan PDF berat — batasi 3 permintaan/jam per user
        $throttleKey = 'yudisium|'.$user->id;
        if (RateLimiter::tooManyAttempts($throttleKey, 3)) {
            $minutes = (int) ceil(RateLimiter::availableIn($throttleKey) / 60);

            return response()->json([
                'message' => "Terlalu sering. Coba lagi dalam ±{$minutes} menit.",
            ], 429);
        }
        RateLimiter::hit($throttleKey, 3600);

        $document = GeneratedDocument::create([
            'user_id' => $targetId,
            'type' => 'transcript',
            'status' => 'processing',
            'verification_code' => Str::lower(Str::random(40)),
        ]);

        GenerateTranscriptDocument::dispatch($document->id);

        return response()->json([
            'message' => 'Transkrip sedang dibuat di latar belakang. Cek daftar dokumen dalam ±1 menit.',
            'data' => $document,
        ], 202);
    }

    /**
     * Checklist kelayakan yudisium: mahasiswa untuk dirinya sendiri,
     * pemegang view-transcripts boleh ?student_id (users.id).
     */
    public function eligibility(Request $request, YudisiumEligibilityService $service)
    {
        $request->validate(['student_id' => 'nullable|uuid|exists:users,id']);

        $targetId = $this->resolveTargetId($request);
        if ($targetId instanceof JsonResponse) {
            return $targetId;
        }

        $target = User::with(['student', 'program'])->findOrFail($targetId);
        $result = $service->checkFor($target);

        return response()->json([
            'data' => array_merge([
                'student' => [
                    'user_id' => $target->id,
                    'name' => $target->name,
                    'nim' => $target->identity_number,
                    'status' => $target->student?->status,
                ],
            ], $result),
        ]);
    }

    /**
     * Kelayakan massal per angkatan — panel admin sidang yudisium.
     * Digating manage-grades di routes.
     */
    public function eligibilityBatch(Request $request, YudisiumEligibilityService $service)
    {
        $validated = $request->validate(['cohort_id' => 'required|uuid|exists:cohorts,id']);

        $students = Student::with('user:id,name,identity_number')
            ->where('cohort_id', $validated['cohort_id'])
            ->get();

        $rows = $students->map(function (Student $profile) use ($service) {
            if (! $profile->user) {
                return null;
            }
            $result = $service->checkFor($profile->user->load('student'));

            return [
                'user_id' => $profile->user_id,
                'name' => $profile->user->name,
                'nim' => $profile->user->identity_number,
                'status' => $profile->status,
                'eligible' => $result['eligible'],
                'failed' => collect($result['requirements'])
                    ->reject(fn ($r) => $r['passed'])
                    ->pluck('label')
                    ->values(),
            ];
        })->filter()->values();

        return response()->json([
            'data' => [
                'total' => $rows->count(),
                'eligible' => $rows->where('eligible', true)->count(),
                'students' => $rows,
            ],
        ]);
    }

    /**
     * Buku logbook lengkap (mega-PDF, job antrean). Mahasiswa untuk dirinya
     * sendiri; pemegang view-transcripts boleh untuk mahasiswa lain.
     */
    public function generateLogbookBook(Request $request)
    {
        $request->validate(['student_id' => 'nullable|uuid|exists:users,id']);

        $targetId = $this->resolveTargetId($request);
        if ($targetId instanceof JsonResponse) {
            return $targetId;
        }
        if ($response = $this->throttleGenerate($request)) {
            return $response;
        }

        $document = GeneratedDocument::create([
            'user_id' => $targetId,
            'type' => 'logbook_book',
            'status' => 'processing',
            'verification_code' => Str::lower(Str::random(40)),
        ]);

        CompileLogbookBookDocument::dispatch($document->id);

        return response()->json([
            'message' => 'Buku logbook sedang dikompilasi di latar belakang. Cek daftar dokumen dalam ±1 menit.',
            'data' => $document,
        ], 202);
    }

    /**
     * Surat keterangan formal ber-QR: `active` (mahasiswa aktif) atau
     * `graduated` (lulus — status mahasiswa harus graduated).
     */
    public function generateLetter(Request $request)
    {
        $validated = $request->validate([
            'letter_type' => 'required|in:active,graduated',
            'student_id' => 'nullable|uuid|exists:users,id',
        ]);

        $targetId = $this->resolveTargetId($request);
        if ($targetId instanceof JsonResponse) {
            return $targetId;
        }

        $target = User::with('student')->findOrFail($targetId);
        $status = $target->student?->status;

        if ($validated['letter_type'] === 'active' && $status !== 'active') {
            return response()->json(['message' => 'Surat keterangan aktif hanya untuk mahasiswa berstatus aktif.'], 422);
        }
        if ($validated['letter_type'] === 'graduated' && $status !== 'graduated') {
            return response()->json(['message' => 'Surat keterangan lulus hanya untuk mahasiswa berstatus lulus.'], 422);
        }

        if ($response = $this->throttleGenerate($request)) {
            return $response;
        }

        $document = GeneratedDocument::create([
            'user_id' => $targetId,
            'type' => 'letter_'.$validated['letter_type'],
            'status' => 'processing',
            'verification_code' => Str::lower(Str::random(40)),
        ]);

        GenerateLetterDocument::dispatch($document->id);

        return response()->json([
            'message' => 'Surat sedang dibuat di latar belakang. Cek daftar dokumen dalam ±1 menit.',
            'data' => $document,
        ], 202);
    }

    /**
     * Resolusi target (users.id): default diri sendiri; ?student_id butuh
     * view-transcripts; Mahasiswa dikunci ke dirinya sendiri.
     */
    private function resolveTargetId(Request $request): string|JsonResponse
    {
        $user = $request->user();
        $targetId = $request->input('student_id', $user->id);

        if ($targetId !== $user->id && ! $user->can('view-transcripts')) {
            return response()->json(['message' => 'Anda tidak berhak mengakses data mahasiswa lain.'], 403);
        }
        if ($user->hasRole('Mahasiswa') && $targetId !== $user->id) {
            return response()->json(['message' => 'Mahasiswa hanya dapat mengakses miliknya sendiri.'], 403);
        }

        return $targetId;
    }

    /** Rate limit bersama semua pembuatan dokumen berat: 3/jam per user. */
    private function throttleGenerate(Request $request): ?JsonResponse
    {
        $throttleKey = 'yudisium|'.$request->user()->id;
        if (RateLimiter::tooManyAttempts($throttleKey, 3)) {
            $minutes = (int) ceil(RateLimiter::availableIn($throttleKey) / 60);

            return response()->json([
                'message' => "Terlalu sering. Coba lagi dalam ±{$minutes} menit.",
            ], 429);
        }
        RateLimiter::hit($throttleKey, 3600);

        return null;
    }

    /**
     * Daftar dokumen milik sendiri (admin ber-view-transcripts: ?student_id).
     */
    public function myDocuments(Request $request)
    {
        $user = $request->user();
        $targetId = $user->id;

        if ($request->filled('student_id') && $user->can('view-transcripts') && ! $user->hasRole('Mahasiswa')) {
            $targetId = $request->input('student_id');
        }

        return response()->json([
            'data' => GeneratedDocument::where('user_id', $targetId)
                ->orderByDesc('created_at')
                ->limit(20)
                ->get(),
        ]);
    }

    /**
     * Unduh PDF dari storage privat — pemilik atau pemegang view-transcripts.
     */
    public function download(Request $request, string $id)
    {
        $document = GeneratedDocument::findOrFail($id);
        $user = $request->user();

        if ($document->user_id !== $user->id && ! $user->can('view-transcripts')) {
            return response()->json(['message' => 'Anda tidak berhak mengunduh dokumen ini.'], 403);
        }
        if ($user->hasRole('Mahasiswa') && $document->user_id !== $user->id) {
            return response()->json(['message' => 'Anda hanya dapat mengunduh dokumen Anda sendiri.'], 403);
        }

        if ($document->status !== 'ready' || ! $document->file_path || ! Storage::exists($document->file_path)) {
            return response()->json(['message' => 'Dokumen belum siap atau berkas tidak ditemukan.'], 404);
        }

        $prefix = match ($document->type) {
            'logbook_book' => 'Buku_Logbook',
            'letter_active' => 'Surat_Keterangan_Aktif',
            'letter_graduated' => 'Surat_Keterangan_Lulus',
            default => 'Transkrip_Resmi',
        };
        $name = Str::slug($document->meta['name'] ?? 'dokumen', '_');

        return Storage::download($document->file_path, "{$prefix}_{$name}.pdf");
    }

    /**
     * Verifikasi PUBLIK (tanpa login): cek keaslian dokumen dari kode QR.
     * Tidak membocorkan data sensitif — NIM disamarkan.
     */
    public function verify(string $code)
    {
        $document = GeneratedDocument::where('verification_code', $code)
            ->where('status', 'ready')
            ->first();

        if (! $document) {
            return response()->json(['valid' => false]);
        }

        $nim = $document->meta['nim'] ?? null;
        $nimMasked = $nim ? str_repeat('•', max(strlen($nim) - 4, 0)).substr($nim, -4) : null;

        return response()->json([
            'valid' => true,
            'type' => $document->type,
            'name' => $document->meta['name'] ?? null,
            'nim_masked' => $nimMasked,
            'program' => $document->meta['program'] ?? null,
            'average' => $document->meta['average'] ?? null,
            'stase_count' => $document->meta['stase_count'] ?? null,
            'generated_at' => $document->created_at?->toIso8601String(),
        ]);
    }
}
