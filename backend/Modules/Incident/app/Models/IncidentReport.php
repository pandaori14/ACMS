<?php

namespace Modules\Incident\Models;

use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class IncidentReport extends Model
{
    use Auditable, HasFactory, HasUuids, SoftDeletes;

    /** Prefix aksi audit (mis. incident.report.updated saat status berubah). */
    protected string $auditActionPrefix = 'incident.report';

    protected $fillable = [
        'reporter_id',
        'incident_type',
        'incident_date',
        'location',
        'description',
        'involved_parties',
        'is_anonymous',
        'status',
        'severity',
        'resolution_notes',
        'attachment_path',
        'anonymized_at',
    ];

    protected $casts = [
        'incident_date' => 'date',
        'is_anonymous' => 'boolean',
        'anonymized_at' => 'datetime',
    ];

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function notes(): HasMany
    {
        return $this->hasMany(IncidentNote::class);
    }
}
