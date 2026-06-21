<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

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
