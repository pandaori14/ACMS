<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Academic\Models\Student;
use Modules\Rotation\Models\RotationAssignment;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $query = Student::with(['user', 'cohort', 'program']);

        if ($request->has('unassigned_in_period')) {
            $periodId = $request->unassigned_in_period;
            $assignedStudentIds = RotationAssignment::where('rotation_period_id', $periodId)
                ->pluck('student_id')
                ->toArray();

            $query->whereNotIn('id', $assignedStudentIds);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('identity_number', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 15);
        $paginator = $query->paginate($perPage);

        return response()->json($paginator);
    }
}
