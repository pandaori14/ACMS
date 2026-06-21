<?php

namespace Modules\Incident\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateIncidentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => 'required|string|in:submitted,investigating,resolved',
            'resolution_notes' => 'nullable|required_if:status,resolved|string|max:2000',
        ];
    }

    public function messages(): array
    {
        return [
            'resolution_notes.required_if' => 'Catatan resolusi wajib diisi saat status diubah menjadi "Selesai".',
        ];
    }
}
