<?php

namespace Modules\Incident\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IncidentFormSection extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'form_template_id',
        'title',
        'icon',
        'description',
        'sort_order',
        'is_visible',
        'conditional_field_id',
        'conditional_value',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_visible' => 'boolean',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(IncidentFormTemplate::class, 'form_template_id');
    }

    public function fields(): HasMany
    {
        return $this->hasMany(IncidentFormField::class, 'section_id')->orderBy('sort_order');
    }

    /**
     * Field yang menentukan apakah section ini ditampilkan (opsional).
     */
    public function conditionalField(): BelongsTo
    {
        return $this->belongsTo(IncidentFormField::class, 'conditional_field_id');
    }
}
