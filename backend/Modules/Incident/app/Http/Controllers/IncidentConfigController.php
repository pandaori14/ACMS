<?php

namespace Modules\Incident\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\SystemReference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Konfigurasi form pelaporan insiden untuk role dengan kapabilitas
 * 'configure-incident-form' (Super Admin, Admin Prodi).
 *
 * Self-contained: tidak bergantung pada permission 'manage-settings'
 * sehingga Admin Prodi yang tidak punya akses Pengaturan Sistem global
 * tetap bisa mengelola form insiden lewat endpoint ini.
 */
class IncidentConfigController extends Controller
{
    /**
     * Daftar key setting insiden yang dikelola lewat konfigurator,
     * lengkap dengan tipe & nilai default-nya.
     */
    private const SETTING_KEYS = [
        'incident_max_attachment_size_mb' => ['type' => 'integer', 'default' => 10],
        'incident_allowed_attachment_types' => ['type' => 'string',  'default' => 'jpg,jpeg,png,pdf,doc,docx'],
        'incident_response_deadline_hours' => ['type' => 'integer', 'default' => 48],
        'incident_auto_notify_critical' => ['type' => 'boolean', 'default' => true],
    ];

    public function show(): JsonResponse
    {
        return response()->json([
            'data' => [
                'incident_types' => $this->references('incident_types'),
                'incident_severities' => $this->references('incident_severities'),
                'settings' => $this->settings(),
                // Read-only: penerima notifikasi dikelola terpusat di matrix SMTP.
                'notification' => $this->notificationConfig(),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'incident_types' => 'array',
            'incident_types.*.value' => 'required|string|max:100',
            'incident_types.*.name' => 'required|string|max:150',
            'incident_types.*.is_active' => 'boolean',
            'incident_severities' => 'array',
            'incident_severities.*.value' => 'required|string|max:100',
            'incident_severities.*.name' => 'required|string|max:150',
            'incident_severities.*.is_active' => 'boolean',
            'settings' => 'array',
            'settings.incident_max_attachment_size_mb' => 'nullable|integer|min:1|max:100',
            'settings.incident_allowed_attachment_types' => 'nullable|string|max:255',
            'settings.incident_response_deadline_hours' => 'nullable|integer|min:1|max:720',
            'settings.incident_auto_notify_critical' => 'nullable|boolean',
        ]);

        DB::transaction(function () use ($validated) {
            $this->syncReferences('incident_types', $validated['incident_types'] ?? []);
            $this->syncReferences('incident_severities', $validated['incident_severities'] ?? []);
            $this->syncSettings($validated['settings'] ?? []);
        });

        Setting::clearCache();

        return response()->json([
            'message' => 'Konfigurasi form insiden berhasil disimpan.',
            'data' => [
                'incident_types' => $this->references('incident_types'),
                'incident_severities' => $this->references('incident_severities'),
                'settings' => $this->settings(),
                'notification' => $this->notificationConfig(),
            ],
        ]);
    }

    private function references(string $category): array
    {
        return SystemReference::where('category', $category)
            ->orderBy('created_at')
            ->get(['id', 'value', 'name', 'is_active'])
            ->toArray();
    }

    private function settings(): array
    {
        $out = [];
        foreach (self::SETTING_KEYS as $key => $meta) {
            $out[$key] = Setting::getValue($key, $meta['default']);
        }

        return $out;
    }

    /**
     * Upsert item referensi berdasarkan (category, value).
     * Tidak menghapus item lama — penonaktifan dilakukan via is_active
     * agar laporan lama yang mereferensikan value tetap konsisten.
     */
    private function syncReferences(string $category, array $items): void
    {
        foreach ($items as $item) {
            SystemReference::updateOrCreate(
                ['category' => $category, 'value' => $item['value']],
                [
                    'name' => $item['name'],
                    'is_active' => $item['is_active'] ?? true,
                ]
            );
        }
    }

    private function syncSettings(array $settings): void
    {
        foreach (self::SETTING_KEYS as $key => $meta) {
            if (! array_key_exists($key, $settings) || $settings[$key] === null) {
                continue;
            }

            $value = $settings[$key];
            if ($meta['type'] === 'boolean') {
                $value = $value ? 'true' : 'false';
            }

            Setting::updateOrCreate(
                ['key' => $key],
                [
                    'value' => (string) $value,
                    'group' => 'incident',
                    'type' => $meta['type'],
                ]
            );
        }
    }

    /**
     * Penerima notifikasi pelaporan insiden — dibaca dari node 'incident_reported'
     * pada matrix SMTP (sumber tunggal yang juga dipakai mesin email).
     */
    private function notificationConfig(): array
    {
        $matrix = $this->matrix();
        $node = $matrix['incident_reported'] ?? [];

        return [
            'notify_roles' => $node['notify_roles'] ?? [],
            'cc_emails' => $node['cc_emails'] ?? '',
        ];
    }

    private function matrix(): array
    {
        $raw = Setting::getValue('smtp_notification_matrix');
        $decoded = $raw ? json_decode($raw, true) : [];

        return is_array($decoded) ? $decoded : [];
    }
}
