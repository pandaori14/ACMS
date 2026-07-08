<?php

namespace Modules\Incident\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Incident\Models\IncidentFormField;
use Modules\Incident\Services\IncidentFormService;

/**
 * CRUD form templates untuk Super Admin / Admin Prodi.
 * Dilindungi permission 'configure-incident-form'.
 */
class IncidentFormTemplateController extends Controller
{
    public function __construct(private readonly IncidentFormService $formService) {}

    /**
     * Daftar semua template.
     */
    public function index(Request $request): JsonResponse
    {
        $templates = $this->formService->listTemplates($request->query('incident_type'));

        return response()->json(['data' => $templates]);
    }

    /**
     * Detail template + sections + fields.
     */
    public function show(string $id): JsonResponse
    {
        $template = $this->formService->showTemplate($id);

        return response()->json(['data' => $template]);
    }

    /**
     * Buat template baru.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'incident_type' => 'required|string|exists:system_references,value,category,incident_types',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'header_title' => 'required|string|max:500',
            'header_subtitle' => 'nullable|string|max:500',
            'theme_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'sections' => 'nullable|array',
            'sections.*.title' => 'required|string|max:255',
            'sections.*.icon' => 'nullable|string|max:50',
            'sections.*.description' => 'nullable|string|max:500',
            'sections.*.is_visible' => 'boolean',
            'sections.*.fields' => 'nullable|array',
            'sections.*.fields.*.label' => 'required|string|max:255',
            'sections.*.fields.*.field_key' => 'nullable|string|max:100',
            'sections.*.fields.*.field_type' => 'required|string|in:'.implode(',', IncidentFormField::FIELD_TYPES),
            'sections.*.fields.*.placeholder' => 'nullable|string|max:500',
            'sections.*.fields.*.help_text' => 'nullable|string|max:500',
            'sections.*.fields.*.is_required' => 'boolean',
            'sections.*.fields.*.options' => 'nullable|array',
            'sections.*.fields.*.options.*.value' => 'required|string',
            'sections.*.fields.*.options.*.label' => 'required|string',
            'sections.*.fields.*.validation_rules' => 'nullable|array',
            'sections.*.fields.*.grid_cols' => 'nullable|integer|in:1,2',
        ]);

        $template = $this->formService->createTemplate($validated);

        return response()->json([
            'message' => 'Template form berhasil dibuat.',
            'data' => $template,
        ], 201);
    }

    /**
     * Update template (termasuk sections + fields).
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'header_title' => 'sometimes|string|max:500',
            'header_subtitle' => 'nullable|string|max:500',
            'theme_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'sections' => 'nullable|array',
            'sections.*.id' => 'nullable|uuid',
            'sections.*.title' => 'required|string|max:255',
            'sections.*.icon' => 'nullable|string|max:50',
            'sections.*.description' => 'nullable|string|max:500',
            'sections.*.is_visible' => 'boolean',
            'sections.*.conditional_field_id' => 'nullable|uuid',
            'sections.*.conditional_value' => 'nullable|string|max:255',
            'sections.*.fields' => 'nullable|array',
            'sections.*.fields.*.id' => 'nullable|uuid',
            'sections.*.fields.*.label' => 'required|string|max:255',
            'sections.*.fields.*.field_key' => 'nullable|string|max:100',
            'sections.*.fields.*.field_type' => 'required|string|in:'.implode(',', IncidentFormField::FIELD_TYPES),
            'sections.*.fields.*.placeholder' => 'nullable|string|max:500',
            'sections.*.fields.*.help_text' => 'nullable|string|max:500',
            'sections.*.fields.*.is_required' => 'boolean',
            'sections.*.fields.*.options' => 'nullable|array',
            'sections.*.fields.*.options.*.value' => 'required|string',
            'sections.*.fields.*.options.*.label' => 'required|string',
            'sections.*.fields.*.validation_rules' => 'nullable|array',
            'sections.*.fields.*.grid_cols' => 'nullable|integer|in:1,2',
        ]);

        $template = $this->formService->updateTemplate($id, $validated);

        return response()->json([
            'message' => 'Template form berhasil diperbarui.',
            'data' => $template,
        ]);
    }

    /**
     * Aktifkan template.
     */
    public function activate(string $id): JsonResponse
    {
        $template = $this->formService->activateTemplate($id);

        return response()->json([
            'message' => "Template \"{$template->name}\" telah diaktifkan untuk jenis insiden \"{$template->incident_type}\".",
            'data' => $template,
        ]);
    }

    /**
     * Nonaktifkan template.
     */
    public function deactivate(string $id): JsonResponse
    {
        $template = $this->formService->deactivateTemplate($id);

        return response()->json([
            'message' => "Template \"{$template->name}\" telah dinonaktifkan.",
            'data' => $template,
        ]);
    }

    /**
     * Duplikasi template.
     */
    public function clone(string $id): JsonResponse
    {
        $template = $this->formService->cloneTemplate($id);

        return response()->json([
            'message' => 'Template berhasil diduplikasi.',
            'data' => $template,
        ], 201);
    }

    /**
     * Hapus template (soft-delete).
     */
    public function destroy(string $id): JsonResponse
    {
        $this->formService->deleteTemplate($id);

        return response()->json(['message' => 'Template berhasil dihapus.']);
    }

    /**
     * Daftar tipe field yang didukung.
     */
    public function fieldTypes(): JsonResponse
    {
        $types = array_map(fn (string $type) => [
            'value' => $type,
            'label' => match ($type) {
                'text' => 'Teks Pendek',
                'textarea' => 'Teks Panjang',
                'select' => 'Dropdown',
                'multiselect' => 'Dropdown Multi-Pilihan',
                'checkbox' => 'Checkbox (Pilihan Ganda)',
                'radio' => 'Radio Button (Pilihan Tunggal)',
                'date' => 'Tanggal',
                'datetime' => 'Tanggal & Waktu',
                'email' => 'Email',
                'tel' => 'Nomor Telepon',
                'file' => 'Upload File',
                'statement' => 'Pernyataan (Checkbox Wajib)',
                default => ucfirst($type),
            },
        ], IncidentFormField::FIELD_TYPES);

        return response()->json(['data' => $types]);
    }
}
