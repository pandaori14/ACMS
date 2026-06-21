<?php

namespace Modules\Rotation\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Rotation\Models\RotationAssignment;

class RotationAssignmentController extends Controller
{
    public function index(Request $request)
    {
        $query = RotationAssignment::with(['rotationPeriod', 'student.user', 'stase', 'hospital', 'preceptor']);

        if ($request->has('rotation_period_id')) {
            $query->where('rotation_period_id', $request->rotation_period_id);
        }

        if ($request->has('stase_id')) {
            $query->where('stase_id', $request->stase_id);
        }

        $user = $request->user();
        if ($user && $user->hasRole('Dodiknis')) {
            // Dodiknis only sees assignments for hospitals they are linked to
            $hospitalIds = DB::table('hospital_user')->where('user_id', $user->id)->pluck('hospital_id');
            $query->whereIn('hospital_id', $hospitalIds);
        } elseif ($user && $user->hasRole('Mahasiswa')) {
            // Student only sees their own assignments
            $student = DB::table('students')->where('user_id', $user->id)->first();
            if ($student) {
                $query->where('student_id', $student->id);
            }
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'rotation_period_id' => 'required|uuid|exists:rotation_periods,id',
            'student_id' => 'required|uuid|exists:students,id',
            'stase_id' => 'required|uuid|exists:stases,id',
            'hospital_id' => 'required|uuid|exists:hospitals,id',
            'status' => 'required|string|in:pending,confirmed,in_progress,completed,remedial',
        ]);

        // Basic conflict detection: A student can't be assigned to multiple stases in the same period
        $exists = RotationAssignment::where('rotation_period_id', $validated['rotation_period_id'])
            ->where('student_id', $validated['student_id'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Conflict detected: Student is already assigned in this period.',
            ], 409);
        }

        $assignment = RotationAssignment::create($validated);

        return response()->json([
            'data' => $assignment->load(['student.user', 'stase', 'hospital']),
            'message' => 'Rotation Assignment created successfully',
        ], 201);
    }

    public function show($id)
    {
        $assignment = RotationAssignment::with(['rotationPeriod', 'student.user', 'stase', 'hospital', 'preceptor'])->findOrFail($id);

        return response()->json(['data' => $assignment]);
    }

    public function update(Request $request, $id)
    {
        $assignment = RotationAssignment::findOrFail($id);

        $validated = $request->validate([
            'hospital_id' => 'required|uuid|exists:hospitals,id',
            'stase_id' => 'required|uuid|exists:stases,id',
            'status' => 'required|string|in:pending,confirmed,in_progress,completed,remedial',
        ]);

        $assignment->update($validated);

        return response()->json([
            'data' => $assignment->load(['student.user', 'stase', 'hospital']),
            'message' => 'Rotation Assignment updated successfully',
        ]);
    }

    public function destroy($id)
    {
        $assignment = RotationAssignment::findOrFail($id);
        $assignment->delete();

        return response()->json(['message' => 'Rotation Assignment deleted successfully']);
    }
}
