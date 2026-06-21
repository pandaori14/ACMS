<?php

namespace Modules\Incident\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RespondConsultationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'response' => 'required|string|min:5|max:3000',
            'status' => 'required|string|in:in_progress,responded,closed',
        ];
    }
}
