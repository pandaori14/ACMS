<?php

namespace Modules\Examination\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ExamScore extends Model
{
    use HasUuids;

    protected $fillable = [
        'exam_participant_id',
        'exam_station_id',
        'assessor_id',
        'score',
        'feedback',
    ];

    public function participant()
    {
        return $this->belongsTo(ExamParticipant::class, 'exam_participant_id');
    }

    public function examStation()
    {
        return $this->belongsTo(ExamStation::class, 'exam_station_id');
    }

    public function assessor()
    {
        return $this->belongsTo(User::class, 'assessor_id');
    }

    public function details()
    {
        return $this->hasMany(ExamScoreDetail::class, 'exam_score_id');
    }
}
