<?php

namespace Modules\Finance\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Modules\Rotation\Models\Hospital;

class Billing extends Model
{
    use HasUuids;

    protected $fillable = [
        'hospital_id',
        'period',
        'amount',
        'status',
        'notes',
        'invoice_number',
        'paid_at',
        'payment_method',
        'payment_reference',
    ];

    public function hospital()
    {
        return $this->belongsTo(Hospital::class, 'hospital_id');
    }
}
