<?php

namespace Modules\Rotation\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Hospital extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'type', // RS Pendidikan Utama, RS Jejaring, Puskesmas
        'address',
        'latitude',
        'longitude',
        'radius_tolerance_meters',
        'is_active',
    ];

    /**
     * Get the users (preceptors) associated with the hospital.
     */
    public function users()
    {
        return $this->belongsToMany(User::class);
    }
}
