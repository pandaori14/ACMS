<?php

namespace Modules\Incident\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class IncidentFormTemplate extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'incident_type',
        'name',
        'description',
        'header_title',
        'header_subtitle',
        'theme_color',
        'is_active',
        'version',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'version' => 'integer',
    ];

    public function sections(): HasMany
    {
        return $this->hasMany(IncidentFormSection::class, 'form_template_id')->orderBy('sort_order');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(IncidentFormResponse::class, 'form_template_id');
    }

    /**
     * Scope: hanya template aktif.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: template untuk jenis insiden tertentu.
     */
    public function scopeForType($query, string $incidentType)
    {
        return $query->where('incident_type', $incidentType);
    }
}
