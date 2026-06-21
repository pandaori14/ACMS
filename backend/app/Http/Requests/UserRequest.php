<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class UserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $userId = $this->route('user') ? $this->route('user')->id : null;

        $rules = [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,'.$userId,
            'password' => 'nullable|string|min:8',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'identity_number' => 'nullable|string|max:50',
            'status' => 'required|in:active,inactive',
            'program_id' => 'nullable|exists:programs,id',
            'roles' => 'required|array',
            'roles.*' => 'exists:roles,name',
            'hospital_ids' => 'nullable|array',
            'hospital_ids.*' => 'exists:hospitals,id',
        ];

        if ($this->isMethod('post')) {
            $rules['password'] = 'required|string|min:8';
        }

        return $rules;
    }

    protected function failedValidation(Validator $validator)
    {
        \Log::error('Validation failed for UserRequest:', $validator->errors()->toArray());
        parent::failedValidation($validator);
    }
}
