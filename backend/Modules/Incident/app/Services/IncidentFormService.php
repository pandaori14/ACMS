<?php

namespace Modules\Incident\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Incident\Models\IncidentFormAnswer;
use Modules\Incident\Models\IncidentFormField;
use Modules\Incident\Models\IncidentFormResponse;
use Modules\Incident\Models\IncidentFormSection;
use Modules\Incident\Models\IncidentFormTemplate;
use Modules\Incident\Models\IncidentReport;

class IncidentFormService
{
    // ─────────────────────────────────────────────────
    //  TEMPLATE CRUD
    // ─────────────────────────────────────────────────

    /**
     * Daftar semua template (opsional filter incident_type).
     */
    public function listTemplates(?string $incidentType = null): array
    {
        $query = IncidentFormTemplate::withCount('sections')
            ->orderBy('incident_type')
            ->orderByDesc('is_active')
            ->orderByDesc('updated_at');

        if ($incidentType) {
            $query->where('incident_type', $incidentType);
        }

        return $query->get()->toArray();
    }

    /**
     * Detail template lengkap dengan sections + fields.
     */
    public function showTemplate(string $id): IncidentFormTemplate
    {
        return IncidentFormTemplate::with(['sections.fields'])->findOrFail($id);
    }

    /**
     * Ambil template aktif untuk jenis insiden tertentu (untuk form pelapor).
     */
    public function activeTemplateForType(string $incidentType): ?IncidentFormTemplate
    {
        return IncidentFormTemplate::with(['sections.fields'])
            ->active()
            ->forType($incidentType)
            ->first();
    }

    /**
     * Buat template baru.
     */
    public function createTemplate(array $data): IncidentFormTemplate
    {
        return DB::transaction(function () use ($data) {
            $template = IncidentFormTemplate::create([
                'incident_type' => $data['incident_type'],
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'header_title' => $data['header_title'],
                'header_subtitle' => $data['header_subtitle'] ?? null,
                'theme_color' => $data['theme_color'] ?? '#1E3A8A',
                'is_active' => false,
                'version' => 1,
            ]);

            if (! empty($data['sections'])) {
                $this->syncSections($template, $data['sections']);
            }

            return $template->load('sections.fields');
        });
    }

    /**
     * Update template (termasuk sections + fields — bulk upsert).
     */
    public function updateTemplate(string $id, array $data): IncidentFormTemplate
    {
        return DB::transaction(function () use ($id, $data) {
            $template = IncidentFormTemplate::findOrFail($id);

            $template->update(array_filter([
                'name' => $data['name'] ?? null,
                'description' => array_key_exists('description', $data) ? $data['description'] : null,
                'header_title' => $data['header_title'] ?? null,
                'header_subtitle' => array_key_exists('header_subtitle', $data) ? $data['header_subtitle'] : null,
                'theme_color' => $data['theme_color'] ?? null,
            ], fn ($v) => $v !== null));

            if (isset($data['sections'])) {
                $this->syncSections($template, $data['sections']);
            }

            // Naikkan versi setiap kali ada perubahan struktur
            $template->increment('version');

            return $template->load('sections.fields');
        });
    }

    /**
     * Aktifkan template (nonaktifkan template lain untuk incident_type yang sama).
     */
    public function activateTemplate(string $id): IncidentFormTemplate
    {
        return DB::transaction(function () use ($id) {
            $template = IncidentFormTemplate::findOrFail($id);

            // Nonaktifkan semua template lain untuk jenis insiden yang sama
            IncidentFormTemplate::where('incident_type', $template->incident_type)
                ->where('id', '!=', $template->id)
                ->update(['is_active' => false]);

            $template->update(['is_active' => true]);

            return $template;
        });
    }

    /**
     * Nonaktifkan template.
     */
    public function deactivateTemplate(string $id): IncidentFormTemplate
    {
        $template = IncidentFormTemplate::findOrFail($id);
        $template->update(['is_active' => false]);

        return $template;
    }

    /**
     * Duplikasi template.
     */
    public function cloneTemplate(string $id): IncidentFormTemplate
    {
        $original = IncidentFormTemplate::with(['sections.fields'])->findOrFail($id);

        return DB::transaction(function () use ($original) {
            $clone = $original->replicate();
            $clone->name = $original->name.' (Salinan)';
            $clone->is_active = false;
            $clone->version = 1;
            $clone->save();

            foreach ($original->sections as $section) {
                $newSection = $section->replicate();
                $newSection->form_template_id = $clone->id;
                $newSection->conditional_field_id = null; // Reset — akan di-remap nanti jika diperlukan
                $newSection->save();

                foreach ($section->fields as $field) {
                    $newField = $field->replicate();
                    $newField->section_id = $newSection->id;
                    $newField->save();
                }
            }

            return $clone->load('sections.fields');
        });
    }

    /**
     * Hapus template (soft-delete). Tolak jika ada respons.
     */
    public function deleteTemplate(string $id): void
    {
        $template = IncidentFormTemplate::findOrFail($id);

        if ($template->responses()->exists()) {
            abort(409, 'Template tidak bisa dihapus karena sudah ada laporan yang menggunakan template ini. Nonaktifkan saja.');
        }

        $template->delete();
    }

    // ─────────────────────────────────────────────────
    //  SYNC SECTIONS + FIELDS
    // ─────────────────────────────────────────────────

    /**
     * Sinkronisasi sections + fields.
     * Strategy: hapus sections yang tidak ada di payload, upsert yang ada.
     */
    private function syncSections(IncidentFormTemplate $template, array $sectionsData): void
    {
        $existingSectionIds = $template->sections()->pluck('id')->toArray();
        $incomingSectionIds = [];

        foreach ($sectionsData as $sortOrder => $sectionData) {
            $sectionId = $sectionData['id'] ?? null;

            if ($sectionId && in_array($sectionId, $existingSectionIds)) {
                // Update existing section
                $section = IncidentFormSection::find($sectionId);
                $section->update([
                    'title' => $sectionData['title'],
                    'icon' => $sectionData['icon'] ?? null,
                    'description' => $sectionData['description'] ?? null,
                    'sort_order' => $sortOrder,
                    'is_visible' => $sectionData['is_visible'] ?? true,
                    'conditional_field_id' => $sectionData['conditional_field_id'] ?? null,
                    'conditional_value' => $sectionData['conditional_value'] ?? null,
                ]);
                $incomingSectionIds[] = $sectionId;
            } else {
                // Create new section
                $section = $template->sections()->create([
                    'title' => $sectionData['title'],
                    'icon' => $sectionData['icon'] ?? null,
                    'description' => $sectionData['description'] ?? null,
                    'sort_order' => $sortOrder,
                    'is_visible' => $sectionData['is_visible'] ?? true,
                    'conditional_field_id' => $sectionData['conditional_field_id'] ?? null,
                    'conditional_value' => $sectionData['conditional_value'] ?? null,
                ]);
                $incomingSectionIds[] = $section->id;
            }

            // Sync fields within section
            if (isset($sectionData['fields'])) {
                $this->syncFields($section, $sectionData['fields']);
            }
        }

        // Hapus sections yang tidak ada di payload (cascade delete fields)
        $toDelete = array_diff($existingSectionIds, $incomingSectionIds);
        if (! empty($toDelete)) {
            // Cek apakah ada answer yang merujuk field di section yang akan dihapus
            $hasAnswers = IncidentFormAnswer::whereHas('field', function ($q) use ($toDelete) {
                $q->whereIn('section_id', $toDelete);
            })->exists();

            if ($hasAnswers) {
                abort(409, 'Tidak bisa menghapus section yang sudah memiliki jawaban dari pelapor. Sembunyikan saja via is_visible.');
            }

            IncidentFormSection::whereIn('id', $toDelete)->delete();
        }
    }

    /**
     * Sinkronisasi fields dalam section.
     */
    private function syncFields(IncidentFormSection $section, array $fieldsData): void
    {
        $existingFieldIds = $section->fields()->pluck('id')->toArray();
        $incomingFieldIds = [];

        foreach ($fieldsData as $sortOrder => $fieldData) {
            $fieldId = $fieldData['id'] ?? null;

            $attributes = [
                'label' => $fieldData['label'],
                'field_key' => $fieldData['field_key'] ?? Str::slug($fieldData['label'], '_'),
                'field_type' => $fieldData['field_type'],
                'placeholder' => $fieldData['placeholder'] ?? null,
                'help_text' => $fieldData['help_text'] ?? null,
                'is_required' => $fieldData['is_required'] ?? false,
                'sort_order' => $sortOrder,
                'options' => $fieldData['options'] ?? null,
                'validation_rules' => $fieldData['validation_rules'] ?? null,
                'grid_cols' => $fieldData['grid_cols'] ?? 1,
            ];

            if ($fieldId && in_array($fieldId, $existingFieldIds)) {
                $field = IncidentFormField::find($fieldId);
                $field->update($attributes);
                $incomingFieldIds[] = $fieldId;
            } else {
                $field = $section->fields()->create($attributes);
                $incomingFieldIds[] = $field->id;
            }
        }

        // Hapus fields yang tidak ada di payload
        $toDelete = array_diff($existingFieldIds, $incomingFieldIds);
        if (! empty($toDelete)) {
            $hasAnswers = IncidentFormAnswer::whereIn('form_field_id', $toDelete)->exists();
            if ($hasAnswers) {
                abort(409, 'Tidak bisa menghapus field yang sudah memiliki jawaban. Ganti saja is_required jadi false atau hapus dari tampilan section.');
            }
            IncidentFormField::whereIn('id', $toDelete)->delete();
        }
    }

    // ─────────────────────────────────────────────────
    //  FORM RESPONSE HANDLING (submit jawaban)
    // ─────────────────────────────────────────────────

    /**
     * Validasi dan simpan jawaban form dinamis.
     *
     * @param  array  $answers  ['field_key' => 'value', ...]
     * @param  array  $files    ['field_key' => UploadedFile, ...]
     */
    public function saveFormResponse(
        IncidentReport $report,
        IncidentFormTemplate $template,
        array $answers,
        array $files = []
    ): IncidentFormResponse {
        // Ambil semua fields dari template untuk validasi
        $fields = IncidentFormField::whereHas('section', function ($q) use ($template) {
            $q->where('form_template_id', $template->id);
        })->get()->keyBy('field_key');

        // Validasi required fields
        foreach ($fields as $key => $field) {
            if ($field->is_required && empty($answers[$key]) && empty($files[$key])) {
                abort(422, "Field \"{$field->label}\" wajib diisi.");
            }
        }

        // Simpan response
        $response = IncidentFormResponse::create([
            'incident_report_id' => $report->id,
            'form_template_id' => $template->id,
            'form_template_version' => $template->version,
            'submitted_at' => now(),
        ]);

        // Simpan answers
        foreach ($fields as $key => $field) {
            $value = $answers[$key] ?? null;
            $filePath = null;

            // Handle file upload
            if ($field->field_type === 'file' && isset($files[$key])) {
                $filePath = $files[$key]->store('incident-form-files', 'public');
                $value = $files[$key]->getClientOriginalName();
            }

            // Handle multi-value (checkbox, multiselect)
            if (is_array($value)) {
                $value = json_encode($value);
            }

            if ($value !== null || $filePath !== null) {
                $response->answers()->create([
                    'form_field_id' => $field->id,
                    'field_key' => $key,
                    'value' => $value,
                    'file_path' => $filePath,
                ]);
            }
        }

        return $response->load('answers');
    }

    /**
     * Ambil jawaban form yang sudah disubmit untuk laporan insiden tertentu.
     */
    public function getFormResponse(string $incidentReportId): ?IncidentFormResponse
    {
        return IncidentFormResponse::with(['answers.field', 'template'])
            ->where('incident_report_id', $incidentReportId)
            ->first();
    }

    /**
     * Ambil semua template aktif sebagai map [incident_type => template].
     */
    public function activeTemplatesMap(): array
    {
        $templates = IncidentFormTemplate::with(['sections.fields'])
            ->active()
            ->get();

        $map = [];
        foreach ($templates as $template) {
            $map[$template->incident_type] = $template;
        }

        return $map;
    }
}
