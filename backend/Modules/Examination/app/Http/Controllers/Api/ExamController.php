<?php

namespace Modules\Examination\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Examination\Models\Exam;

class ExamController extends Controller
{
    public function index(Request $request)
    {
        $query = Exam::with(['stase']);

        $user = $request->user();
        if ($user->hasRole('Mahasiswa')) {
            $query->whereHas('participants', function ($q) use ($user) {
                $q->where('student_id', $user->id);
            });
        } elseif ($user->hasRole('Dodiknis')) {
            $query->whereHas('assessors', function ($q) use ($user) {
                $q->where('assessor_id', $user->id);
            });
        }

        $exams = $query->orderBy('date', 'desc')->get();

        return response()->json($exams);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'type' => 'required|in:OSCE,CBT,WRITTEN',
            'stase_id' => 'required|exists:stases,id',
            'date' => 'required|date',
            'description' => 'nullable|string',
        ]);

        $exam = Exam::create($request->all());

        return response()->json($exam, 201);
    }

    public function show($id)
    {
        $exam = Exam::with(['stase', 'stations', 'participants.student', 'assessors.assessor', 'assessors.station'])->findOrFail($id);

        return response()->json($exam);
    }

    public function update(Request $request, $id)
    {
        $exam = Exam::findOrFail($id);
        $exam->update($request->all());

        return response()->json($exam);
    }

    public function destroy($id)
    {
        $exam = Exam::findOrFail($id);
        $exam->delete();

        return response()->json(null, 204);
    }

    public function addStation(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string',
            'description' => 'nullable|string',
            'order' => 'integer',
        ]);

        $exam = Exam::findOrFail($id);
        $station = $exam->stations()->create($request->all());

        return response()->json($station, 201);
    }

    public function addParticipant(Request $request, $id)
    {
        $request->validate([
            'student_id' => 'required|exists:users,id',
        ]);

        $exam = Exam::findOrFail($id);
        $participant = $exam->participants()->create([
            'student_id' => $request->student_id,
            'status' => 'REGISTERED',
        ]);

        return response()->json($participant, 201);
    }

    public function addAssessor(Request $request, $id)
    {
        $request->validate([
            'assessor_id' => 'required|exists:users,id',
            'exam_station_id' => 'nullable|exists:exam_stations,id',
        ]);

        $exam = Exam::findOrFail($id);
        $assessor = $exam->assessors()->create($request->all());

        return response()->json($assessor, 201);
    }
}
