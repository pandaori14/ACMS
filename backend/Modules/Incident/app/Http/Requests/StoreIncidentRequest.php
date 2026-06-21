<?php

namespace Modules\Incident\Http\Requests;

use App\Models\Setting;
use Illuminate\Foundation\Http\FormRequest;

class StoreIncidentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $maxMb = (int) Setting::getValue('incident_max_attachment_size_mb', 10);
        $maxKb = $maxMb * 1024;
        $allowedTypes = Setting::getValue('incident_allowed_attachment_types', 'jpg,jpeg,png,pdf,doc,docx');

        return [
            'incident_type' => 'required|string|exists:system_references,value,category,incident_types',
            'incident_date' => 'required|date|before_or_equal:today',
            'location' => 'required|string|max:255',
            'description' => 'required|string|min:20',
            'involved_parties' => 'nullable|string|max:500',
            'is_anonymous' => 'boolean',
            'severity' => 'nullable|string|exists:system_references,value,category,incident_severities',
            'attachment' => "nullable|file|mimes:{$allowedTypes}|max:{$maxKb}",
        ];
    }

    public function messages(): array
    {
        return [
            'incident_type.exists' => 'Tipe insiden tidak valid atau tidak aktif di dalam referensi sistem.',
            'severity.exists' => 'Tingkat keparahan tidak valid atau tidak aktif di dalam referensi sistem.',
            'description.min' => 'Deskripsi minimal 20 karakter.',
            'incident_date.before_or_equal' => 'Tanggal kejadian tidak boleh di masa mendatang.',
        ];
    }
}
