<?php

namespace Modules\Incident\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreIncidentNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'note' => 'required|string|min:5|max:2000',
            'is_internal' => 'boolean',
        ];
    }
}
