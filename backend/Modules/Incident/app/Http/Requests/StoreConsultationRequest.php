<?php

namespace Modules\Incident\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreConsultationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category' => 'required|string|exists:system_references,value,category,consultation_categories',
            'topic' => 'required|string|max:255',
            'message' => 'required|string|min:20|max:3000',
            'is_anonymous' => 'boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'category.exists' => 'Kategori konsultasi tidak valid atau tidak aktif.',
            'message.min' => 'Pesan konsultasi minimal 20 karakter.',
        ];
    }
}
