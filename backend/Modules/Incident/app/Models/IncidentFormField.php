<?php

namespace Modules\Incident\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IncidentFormField extends Model
{
    use HasFactory, HasUuids;

    /** Tipe field yang didukung oleh form builder. */
    public const FIELD_TYPES = [
        'text',
        'textarea',
        'select',
        'multiselect',
        'checkbox',
        'radio',
        'date',
        'datetime',
        'email',
        'tel',
        'file',
        'statement',
    ];

    protected $fillable = [
        'section_id',
        'label',
        'field_key',
        'field_type',
        'placeholder',
        'help_text',
        'is_required',
        'sort_order',
        'options',
        'validation_rules',
        'grid_cols',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'sort_order' => 'integer',
        'options' => 'array',
        'validation_rules' => 'array',
        'grid_cols' => 'integer',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(IncidentFormSection::class, 'section_id');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(IncidentFormAnswer::class, 'form_field_id');
    }
}
