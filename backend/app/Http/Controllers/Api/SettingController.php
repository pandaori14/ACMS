<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Student;
use Modules\Clinical\Models\LogbookEntry;
use Modules\Rotation\Models\Hospital;

class SettingController extends Controller
{
    /** Placeholder yang dikirim ke frontend untuk setting bertipe `secret` yang sudah terisi. */
    private const SECRET_PLACEHOLDER = '__SECRET_SET__';

    public function index()
    {
        // Redaksi nilai bertipe `secret` (mis. API key AI) — jangan pernah kirim plaintext ke frontend.
        return response()->json($this->redactSecrets(Setting::all()));
    }

    /**
     * Retrieve public settings for landing page and unauthenticated views.
     */
    public function publicSettings()
    {
        $settings = Setting::whereIn('group', ['general', 'landing', 'guide'])
            ->orWhere('key', 'enable_google_sso')
            ->get();

        return response()->json($settings);
    }

    /**
     * Statistik agregat publik untuk landing page (hanya hitungan, tanpa PII).
     * Di-cache 1 jam agar tidak membebani DB dari endpoint tak terotentikasi.
     */
    public function publicStats()
    {
        $stats = Cache::remember('public_stats', 3600, function () {
            return [
                'hospitals' => Hospital::count(),
                'logbook_entries' => LogbookEntry::count(),
                'students' => Student::count(),
                'programs' => Program::count(),
            ];
        });

        return response()->json(['data' => $stats]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.group' => 'nullable|string',
            'settings.*.value' => 'nullable',
            'settings.*.type' => 'nullable|string',
            'settings.*.description' => 'nullable|string',
        ]);

        foreach ($data['settings'] as $index => $settingData) {
            $value = $settingData['value'];
            $type = $settingData['type'] ?? 'string';

            // Handle file upload if present
            if ($request->hasFile("settings.{$index}.value")) {
                $file = $request->file("settings.{$index}.value");
                $path = $file->store('settings', 'public');
                $value = '/storage/'.$path;
            }

            // Setting bertipe `secret` (mis. API key): jangan timpa bila kosong atau masih
            // placeholder (artinya user tidak mengubahnya); selain itu simpan terenkripsi.
            if ($type === 'secret') {
                if (empty($value) || $value === self::SECRET_PLACEHOLDER) {
                    continue;
                }
                $value = Crypt::encryptString($value);
            }

            Setting::updateOrCreate(
                ['key' => $settingData['key']],
                [
                    'group' => $settingData['group'] ?? 'general',
                    'value' => $value,
                    'type' => $type,
                    'description' => $settingData['description'] ?? null,
                ]
            );
        }

        Setting::clearCache();

        return response()->json([
            'message' => 'Pengaturan berhasil diperbarui.',
            'data' => $this->redactSecrets(Setting::all()),
        ]);
    }

    /**
     * Ganti nilai setting bertipe `secret` dengan placeholder sebelum dikirim ke frontend,
     * sehingga API key tidak pernah bocor ke klien (hanya indikator "tersimpan").
     *
     * @param  Collection<int, Setting>  $settings
     */
    private function redactSecrets($settings)
    {
        return $settings->map(fn (Setting $s) => [
            'key' => $s->key,
            'group' => $s->group,
            'value' => $s->type === 'secret'
                ? (! empty($s->value) ? self::SECRET_PLACEHOLDER : '')
                : $s->value,
            'type' => $s->type,
            'description' => $s->description,
        ]);
    }
}
