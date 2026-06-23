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

    /** Model yang sedang dipakai untuk panggilan ini (null = model utama; di-set saat fallback). */
    private ?string $activeModel = null;

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

    /** Model cadangan (opsional) untuk auto-fallback bila model utama gagal/sibuk. */
    public function fallbackModel(): string
    {
        return trim((string) Setting::getValue('ai_model_fallback'));
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

        try {
            return $this->converse($messages, $tools);
        } catch (RuntimeException $e) {
            // Auto-fallback: bila model utama gagal (sibuk/error upstream) dan ada
            // model cadangan terkonfigurasi, coba sekali lagi dengan model cadangan.
            $fallback = $this->fallbackModel();
            if ($fallback !== '' && $this->activeModel === null && in_array($e->getCode(), [429, 502, 504], true)) {
                Log::warning('AI Assistant: beralih ke model cadangan', ['fallback' => $fallback, 'code' => $e->getCode()]);
                $this->activeModel = $fallback;

                return $this->converse($messages, $tools);
            }
            throw $e;
        }
    }

    /**
     * Jalankan satu sesi percakapan (loop tool-calling) dengan model aktif.
     *
     * @param  array<int, mixed>  $messages
     * @param  array<int, mixed>  $tools
     */
    private function converse(array $messages, array $tools): string
    {
        for ($round = 0; $round < self::MAX_TOOL_ROUNDS; $round++) {
            $message = $this->callLlm($messages, $tools);
            $toolCalls = $message['tool_calls'] ?? null;

            // (A) Tool-call NATIVE (cara yang benar).
            if (! empty($toolCalls)) {
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

                continue;
            }

            $content = (string) ($message['content'] ?? '');

            // (B) FALLBACK: model lemah kadang menulis tool-call sebagai TEKS JSON
            // (mis. {"function":"...","parameters":{...}}). Tangkap, eksekusi, lalu
            // umpankan hasilnya agar model menjawab dalam prosa — JSON tak bocor ke user.
            $textCall = $this->extractTextToolCall($content);
            if ($textCall !== null) {
                $result = $this->context->execute($textCall['name'], $textCall['args']);
                $messages[] = ['role' => 'assistant', 'content' => $content];
                $messages[] = [
                    'role' => 'user',
                    'content' => 'DATA SISTEM ('.$textCall['name'].'): '.json_encode($result, JSON_UNESCAPED_UNICODE)
                        .'. Jawab permintaan saya sebelumnya HANYA berdasarkan data ini, dalam Bahasa Indonesia natural. Jangan tampilkan JSON atau nama fungsi.',
                ];

                continue;
            }

            // (C) Jawaban prosa biasa.
            return $this->sanitize($content);
        }

        // Batas ronde tool tercapai — minta jawaban final tanpa tool.
        $final = $this->callLlm($messages, []);

        return $this->sanitize((string) ($final['content'] ?? ''));
    }

    /**
     * Tangkap tool-call yang ditulis model sebagai teks JSON. Mengembalikan
     * ['name' => ..., 'args' => [...]] bila valid & ber-whitelist, atau null.
     *
     * @return array{name: string, args: array<string, mixed>}|null
     */
    private function extractTextToolCall(string $content): ?array
    {
        if (trim($content) === '' || ! str_contains($content, '{')) {
            return null;
        }

        $text = preg_replace('/```(?:json)?/i', '', $content) ?? $content;
        if (! preg_match('/\{.*\}/s', $text, $m)) {
            return null;
        }

        $decoded = json_decode($m[0], true);
        if (! is_array($decoded)) {
            return null;
        }

        $name = $decoded['function'] ?? $decoded['name'] ?? $decoded['tool'] ?? null;
        if (! is_string($name) || ! in_array($name, $this->context->allowed(), true)) {
            return null;
        }

        $args = $decoded['parameters'] ?? $decoded['arguments'] ?? $decoded['args'] ?? [];
        if (is_string($args)) {
            $args = json_decode($args, true) ?: [];
        }

        return ['name' => $name, 'args' => is_array($args) ? $args : []];
    }

    /**
     * Jaring pengaman terakhir: buang sisa JSON tool-call yang mungkin bocor ke
     * teks jawaban, agar pengguna tidak pernah melihat sintaks internal.
     */
    private function sanitize(string $content): string
    {
        $clean = preg_replace('/```(?:json)?\s*\{.*?\}\s*```/s', '', $content) ?? $content;
        $clean = preg_replace('/\{\s*"(?:function|name|tool)"\s*:.*?\}\s*\}?/s', '', $clean) ?? $clean;
        $clean = trim($clean);

        return $clean !== ''
            ? $clean
            : 'Maaf, saya belum bisa memproses permintaan itu dengan baik. Bisa coba diulang dengan kalimat lain?';
    }

    private function baseUrl(): string
    {
        return rtrim((string) (Setting::getValue('ai_base_url') ?: config('services.ai.base_url')), '/');
    }

    private function timeout(): int
    {
        return (int) config('services.ai.timeout', 30);
    }

    /** Batas token jawaban. Bisa di-override via Setting ai_max_tokens (mis. naikkan untuk model reasoning). */
    private function maxTokens(): int
    {
        $fromSetting = (int) Setting::getValue('ai_max_tokens', 0);

        return $fromSetting > 0 ? $fromSetting : (int) config('services.ai.max_tokens', 4096);
    }

    /**
     * Param tambahan khusus-model (JSON) dari Settings. Kosong/invalid = diabaikan.
     *
     * @return array<string, mixed>
     */
    private function extraParams(): array
    {
        $raw = trim((string) Setting::getValue('ai_extra_params'));
        if ($raw === '') {
            return [];
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
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

DATA & KEJUJURAN (sangat penting):
- Untuk pertanyaan soal data sistem (jumlah, daftar mahasiswa/pengguna/RS/stase/ujian/insiden, status, rotasi, dsb), WAJIB memanggil tool yang tersedia untuk mengambil data nyata.
- DILARANG KERAS mengarang, menebak, atau "mengisi" nama, angka, email, tanggal, atau fakta. Hanya gunakan data dari hasil tool.
- Jika tidak ada tool yang cocok, katakan terus terang: "Maaf, saya belum punya akses ke data itu." JANGAN dikarang. Contoh yang DI LUAR akses: data keuangan/honor/tagihan, nilai/transkrip individual, identitas pelapor insiden.
- Identitas pelapor insiden bersifat ANONIM — JANGAN pernah menyebut atau menebak nama pelapor.
- Tool hitungan (count_*) bersifat AKUMULATIF (total sepanjang waktu), BUKAN per tanggal. Jika ditanya "kemarin/hari ini/tanggal tertentu", jelaskan bahwa angka yang tersedia adalah total keseluruhan, bukan per tanggal — jangan mengarang angka harian.
- Jika hasil tool kosong, sampaikan "belum ada data" dengan jelas.

PERAN PENASIHAT (proaktif):
- Kamu bukan sekadar pelapor angka — kamu penasihat operasional. Setelah menyajikan data, beri interpretasi singkat dan, bila ada indikasi masalah, sampaikan REKOMENDASI tindakan yang konkret dan bisa dilakukan.
- Untuk pertanyaan umum seperti "ada masalah apa?" / "apa yang perlu ditindaklanjuti?", panggil get_system_health lalu soroti hal yang butuh perhatian (mis. banyak logbook menunggu verifikasi, insiden kritis terbuka, tagihan belum dibayar, presensi mencurigakan) beserta saran langkah.
- Saran harus realistis sesuai wewenang Super Admin (mis. ingatkan preceptor verifikasi logbook, tindak lanjuti insiden kritis, tagih pembayaran tertunda). Jangan menjanjikan tindakan otomatis yang sistem tidak lakukan.

FORMAT JAWABAN:
- JAWAB HANYA dalam bahasa manusia. JANGAN PERNAH menampilkan JSON, kode, nama fungsi, atau sintaks tool-call kepada pengguna — itu urusan internal sistem.
- Rapikan dengan Markdown: bullet list ("- ") untuk daftar, **tebal** untuk angka/poin penting. JANGAN gunakan tabel Markdown (tidak ter-render).
- Jangan tampilkan ID/UUID teknis kecuali diminta khusus.
- Untuk tugas menulis (memo, pengumuman, laporan, surat), susun draf yang rapi, terstruktur, siap pakai, gaya formal institusional.
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
            'model' => $this->activeModel ?? $this->model(),
            'messages' => $messages,
            'temperature' => 0.6,
            'max_tokens' => $this->maxTokens(),
        ];

        // Param tambahan khusus-model (opsional) dari Settings, mis. top_p,
        // chat_template_kwargs, reasoning_budget. Tak boleh mengganggu integritas
        // payload inti (model/messages/tools) atau mengaktifkan streaming.
        $extras = $this->extraParams();
        if (! empty($extras)) {
            unset($extras['messages'], $extras['model'], $extras['tools'], $extras['tool_choice'], $extras['stream']);
            $payload = array_merge($payload, $extras);
        }

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
