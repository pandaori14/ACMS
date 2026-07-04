<?php

namespace Modules\Finance\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Honorarium extends Model
{
    use HasUuids;

    protected $table = 'honorariums';

    protected $fillable = [
        'preceptor_id',
        'period',
        'amount',
        'status',
        'notes',
        'paid_at',
        'payment_method',
        'payment_reference',
    ];

    public function preceptor()
    {
        return $this->belongsTo(User::class, 'preceptor_id');
    }
}
