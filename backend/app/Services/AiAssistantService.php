<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Klien LLM (OpenAI-compatible) untuk AI Assistant Super Admin.
 *
 * - Config resolusi: tabel `settings` (grup ai_assistant) lebih diutamakan,
 *   fallback ke config/services.php (env). API key tersimpan TERENKRIPSI.
 * - Mendukung function-calling ber-whitelist via AiContextService.
 * - Error upstream (timeout/401/429/5xx) dipetakan ke pesan generik aman;
 *   detail dicatat ke log, TIDAK dibocorkan ke user.
 */
class AiAssistantService
{
    private const MAX_TOOL_ROUNDS = 4;

    public function __construct(private readonly AiContextService $context) {}

    public function isEnabled(): bool
    {
        $enabled = Setting::getValue('ai_enabled', null);
        if ($enabled === null) {
            return (bool) config('services.ai.enabled', false);
        }

        return filter_var($enabled, FILTER_VALIDATE_BOOLEAN);
    }

    public function isConfigured(): bool
    {
        return $this->isEnabled() && $this->apiKey() !== '' && $this->baseUrl() !== '';
    }

    public function model(): string
    {
        return (string) (Setting::getValue('ai_model') ?: config('services.ai.model'));
    }

    /**
     * @param  array<int, array{role?: string, content?: string}>  $history
     */
    public function chat(string $userMessage, array $history = []): string
    {
        if (! $this->isEnabled()) {
            throw new RuntimeException('Fitur AI Assistant sedang dinonaktifkan. Aktifkan di Pengaturan → AI Assistant.', 503);
        }
        if ($this->apiKey() === '') {
            throw new RuntimeException('AI Assistant belum dikonfigurasi (API key kosong). Atur di Pengaturan → AI Assistant.', 503);
        }

        $messages = [['role' => 'system', 'content' => $this->systemPrompt()]];
        foreach ($history as $h) {
            $role = (($h['role'] ?? '') === 'assistant') ? 'assistant' : 'user';
            $content = (string) ($h['content'] ?? '');
            if ($content !== '') {
                $messages[] = ['role' => $role, 'content' => $content];
            }
        }
        $messages[] = ['role' => 'user', 'content' => $userMessage];

        $tools = $this->context->toolDefinitions();

        for ($round = 0; $round < self::MAX_TOOL_ROUNDS; $round++) {
            $message = $this->callLlm($messages, $tools);
            $toolCalls = $message['tool_calls'] ?? null;

            if (empty($toolCalls)) {
                return trim((string) ($message['content'] ?? ''));
            }

            // Umpankan kembali hasil tool ber-whitelist.
            $messages[] = $message;
            foreach ($toolCalls as $call) {
                $name = $call['function']['name'] ?? '';
                $decoded = json_decode($call['function']['arguments'] ?? '{}', true);
                $result = $this->context->execute($name, is_array($decoded) ? $decoded : []);
                $messages[] = [
                    'role' => 'tool',
                    'tool_call_id' => $call['id'] ?? '',
                    'content' => json_encode($result, JSON_UNESCAPED_UNICODE),
                ];
            }
        }

        // Batas ronde tool tercapai — minta jawaban final tanpa tool.
        $final = $this->callLlm($messages, []);

        return trim((string) ($final['content'] ?? 'Maaf, permintaan tidak dapat diselesaikan saat ini.'));
    }

    private function baseUrl(): string
    {
        return rtrim((string) (Setting::getValue('ai_base_url') ?: config('services.ai.base_url')), '/');
    }

    private function timeout(): int
    {
        return (int) config('services.ai.timeout', 30);
    }

    /**
     * Prompt sistem = instruksi dasar yang SELALU berlaku (anti-halusinasi,
     * gaya bahasa, pemakaian tool) + persona tambahan yang bisa diatur admin
     * lewat Settings. Bagian dasar tidak bisa ditimpa dari Settings.
     */
    private function systemPrompt(): string
    {
        $persona = trim((string) Setting::getValue('ai_system_prompt'));

        $base = <<<'PROMPT'
Kamu adalah asisten AI internal untuk Super Admin sistem ACMS — platform manajemen klinik akademik Fakultas Kedokteran UMS.

GAYA BAHASA:
- Jawab dalam Bahasa Indonesia yang natural, ramah, dan profesional — seperti rekan kerja yang membantu, bukan robot. Boleh hangat dan ringkas, hindari kalimat kaku atau template berulang.
- Sapa secukupnya, jangan bertele-tele. Langsung ke inti, tapi tetap enak dibaca.

DATA & KEJUJURAN (penting):
- Untuk pertanyaan apa pun soal data sistem (jumlah, daftar mahasiswa/pengguna/RS/stase/ujian, status insiden, rotasi, dsb), WAJIB memanggil tool yang tersedia untuk mengambil data nyata.
- DILARANG KERAS mengarang, menebak, atau "mengisi" nama, angka, email, atau fakta. Hanya gunakan data dari hasil tool.
- Jika tidak ada tool yang cocok dengan permintaan, katakan terus terang bahwa data itu belum dapat kamu akses — jangan dikarang.
- Jika hasil tool kosong, sampaikan "belum ada data" dengan jelas.

FORMAT JAWABAN:
- Rapikan dengan Markdown: gunakan bullet list ("- ") untuk daftar, dan **tebal** untuk angka/poin penting. JANGAN gunakan tabel Markdown (tidak ter-render).
- Jangan tampilkan ID/UUID teknis kecuali diminta khusus.
- Untuk tugas menulis (memo, pengumuman, laporan, surat), susun draf yang rapi, terstruktur, dan siap pakai dengan gaya formal institusional.
PROMPT;

        return $persona !== '' ? $base."\n\nCatatan tambahan dari admin:\n".$persona : $base;
    }

    /** API key didekripsi dari setting; fallback ke env/config bila kosong/invalid. */
    private function apiKey(): string
    {
        $raw = Setting::getValue('ai_api_key');
        if (! empty($raw)) {
            try {
                return Crypt::decryptString($raw);
            } catch (\Throwable) {
                // Bukan ciphertext valid — abaikan, pakai fallback env.
            }
        }

        return (string) config('services.ai.api_key', '');
    }

    /**
     * Satu panggilan ke endpoint /chat/completions (OpenAI-compatible).
     *
     * @param  array<int, mixed>  $messages
     * @param  array<int, mixed>  $tools
     * @return array<string, mixed> message dari choices[0]
     */
    private function callLlm(array $messages, array $tools): array
    {
        $payload = [
            'model' => $this->model(),
            'messages' => $messages,
            'temperature' => 0.6,
        ];
        if (! empty($tools)) {
            $payload['tools'] = $tools;
            $payload['tool_choice'] = 'auto';
        }

        try {
            $resp = Http::withToken($this->apiKey())
                ->timeout($this->timeout())
                ->acceptJson()
                ->asJson()
                ->post($this->baseUrl().'/chat/completions', $payload);
        } catch (ConnectionException $e) {
            Log::warning('AI Assistant: koneksi gagal/timeout', ['error' => $e->getMessage()]);
            throw new RuntimeException('Layanan AI tidak dapat dihubungi (timeout/koneksi). Coba lagi nanti.', 504);
        }

        if ($resp->failed()) {
            $status = $resp->status();
            Log::warning('AI Assistant: respons upstream gagal', ['status' => $status, 'body' => mb_substr($resp->body(), 0, 500)]);

            throw new RuntimeException(
                match (true) {
                    $status === 401 || $status === 403 => 'Kredensial AI tidak valid. Periksa API key di Pengaturan.',
                    $status === 429 => 'Layanan AI sedang sibuk (rate limit). Coba lagi sebentar lagi.',
                    default => 'Layanan AI mengembalikan kesalahan. Coba lagi nanti.',
                },
                ($status === 429) ? 429 : 502,
            );
        }

        $message = $resp->json('choices.0.message');
        if (! is_array($message)) {
            Log::warning('AI Assistant: bentuk respons tak terduga', ['body' => mb_substr($resp->body(), 0, 500)]);
            throw new RuntimeException('Respons AI tidak dapat diproses.', 502);
        }

        return $message;
    }
}
