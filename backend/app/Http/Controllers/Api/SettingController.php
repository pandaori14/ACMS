<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Modules\Academic\Models\Program;
use Modules\Academic\Models\Student;
use Modules\Clinical\Models\LogbookEntry;
use Modules\Rotation\Models\Hospital;

class SettingController extends Controller
{
    public function index()
    {
        $settings = Setting::all();

        // Return grouped or flat depending on frontend needs, flat is easier to map in frontend state
        return response()->json($settings);
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

            // Handle file upload if present
            if ($request->hasFile("settings.{$index}.value")) {
                $file = $request->file("settings.{$index}.value");
                $path = $file->store('settings', 'public');
                $value = '/storage/'.$path;
            }

            Setting::updateOrCreate(
                ['key' => $settingData['key']],
                [
                    'group' => $settingData['group'] ?? 'general',
                    'value' => $value,
                    'type' => $settingData['type'] ?? 'string',
                    'description' => $settingData['description'] ?? null,
                ]
            );
        }

        return response()->json([
            'message' => 'Pengaturan berhasil diperbarui.',
            'data' => Setting::all(),
        ]);
    }
}
