<?php

namespace Modules\Incident\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncidentFormAnswer extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'response_id',
        'form_field_id',
        'field_key',
        'value',
        'file_path',
    ];

    public function response(): BelongsTo
    {
        return $this->belongsTo(IncidentFormResponse::class, 'response_id');
    }

    public function field(): BelongsTo
    {
        return $this->belongsTo(IncidentFormField::class, 'form_field_id');
    }
}
