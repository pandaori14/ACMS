<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Preferensi notifikasi email per user per event matrix. Baris tidak ada =
 * email aktif (default). Event kritis (reset password, akun baru) tidak
 * pernah bisa dimatikan — lihat NotificationService::CRITICAL_EVENTS.
 */
class UserNotificationPreference extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'event_type',
        'email_enabled',
    ];

    protected $casts = [
        'email_enabled' => 'boolean',
    ];
}
