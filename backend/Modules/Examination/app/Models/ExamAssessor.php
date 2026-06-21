<?php

namespace Modules\Examination\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ExamAssessor extends Model
{
    use HasUuids;

    protected $fillable = [
        'exam_id',
        'exam_station_id',
        'assessor_id',
    ];

    public function exam()
    {
        return $this->belongsTo(Exam::class, 'exam_id');
    }

    public function examStation()
    {
        return $this->belongsTo(ExamStation::class, 'exam_station_id');
    }

    public function assessor()
    {
        return $this->belongsTo(User::class, 'assessor_id');
    }
}
