<?php

namespace Modules\Academic\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // otorisasi via middleware permission di route
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'identity_number' => 'required|string|max:50|unique:users,identity_number',
            'password' => 'nullable|string|min:8|max:100',
            'program_id' => 'required|uuid|exists:programs,id',
            'cohort_id' => 'required|uuid|exists:cohorts,id',
            'status' => 'required|exists:system_references,value,category,student_statuses',
            'enrollment_date' => 'required|date',
        ];
    }
}
