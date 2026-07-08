<?php

namespace Modules\Incident\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IncidentFormResponse extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'incident_report_id',
        'form_template_id',
        'form_template_version',
        'submitted_at',
    ];

    protected $casts = [
        'form_template_version' => 'integer',
        'submitted_at' => 'datetime',
    ];

    public function incidentReport(): BelongsTo
    {
        return $this->belongsTo(IncidentReport::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(IncidentFormTemplate::class, 'form_template_id');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(IncidentFormAnswer::class, 'response_id');
    }
}
