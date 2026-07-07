<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Riwayat broadcast pesan massal (target: all/role/cohort/hospital). */
class Broadcast extends Model
{
    use HasUuids;

    protected $fillable = [
        'sender_id',
        'subject',
        'body',
        'target_type',
        'target_id',
        'recipients_count',
    ];

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
