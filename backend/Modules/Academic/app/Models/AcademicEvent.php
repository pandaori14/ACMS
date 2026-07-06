<?php

namespace Modules\Academic\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Event kalender akademik: hari libur, periode blackout, periode ujian, dst.
 * Event dengan blocks_rotation=true menolak penempatan rotasi yang tumpang tindih.
 */
class AcademicEvent extends Model
{
    use HasUuids;

    protected $fillable = [
        'title',
        'event_type',
        'start_date',
        'end_date',
        'description',
        'blocks_rotation',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'blocks_rotation' => 'boolean',
    ];
}
