<?php

namespace Modules\Examination\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Examination\Models\ExamParticipant;
use Modules\Examination\Models\ExamScore;

class ExamScoreController extends Controller
{
    public function store(Request $request, $examId, $participantId)
    {
        $request->validate([
            'exam_station_id' => 'nullable|exists:exam_stations,id',
            'score' => 'required|numeric|min:0|max:100',
            'feedback' => 'nullable|string',
        ]);

        $participant = ExamParticipant::where('exam_id', $examId)
            ->findOrFail($participantId);

        $score = ExamScore::updateOrCreate(
            [
                'exam_participant_id' => $participant->id,
                'exam_station_id' => $request->exam_station_id,
                'assessor_id' => $request->user()->id,
            ],
            [
                'score' => $request->score,
                'feedback' => $request->feedback,
            ]
        );

        // Optional: Recalculate average final score
        $allScores = ExamScore::where('exam_participant_id', $participant->id)->avg('score');
        $participant->update(['final_score' => $allScores, 'status' => 'ATTENDED']);

        return response()->json($score, 201);
    }

    public function getParticipantScores($examId, $participantId)
    {
        $participant = ExamParticipant::with(['scores.station', 'scores.assessor'])->where('exam_id', $examId)->findOrFail($participantId);

        return response()->json($participant);
    }
}
