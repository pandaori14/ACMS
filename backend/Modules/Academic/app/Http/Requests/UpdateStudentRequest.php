<?php

namespace Modules\Academic\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Academic\Models\Student;

class UpdateStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // otorisasi via middleware permission di route
    }

    public function rules(): array
    {
        /** @var Student|null $student */
        $student = $this->route('student') instanceof Student
            ? $this->route('student')
            : Student::find($this->route('student'));
        $userId = $student?->user_id;

        return [
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'identity_number' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('users', 'identity_number')->ignore($userId)],
            'password' => 'nullable|string|min:8|max:100',
            'program_id' => 'sometimes|required|uuid|exists:programs,id',
            'cohort_id' => 'sometimes|required|uuid|exists:cohorts,id',
            'status' => 'sometimes|required|exists:system_references,value,category,student_statuses',
            'enrollment_date' => 'sometimes|required|date',
        ];
    }
}
