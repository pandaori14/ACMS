<?php

namespace Modules\Assessment\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Assessment\Jobs\GenerateTranscriptDocument;
use Modules\Assessment\Models\GeneratedDocument;

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

        $name = Str::slug($document->meta['name'] ?? 'transkrip', '_');

        return Storage::download($document->file_path, "Transkrip_Resmi_{$name}.pdf");
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
