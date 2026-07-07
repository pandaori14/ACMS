<?php

namespace Modules\Rotation\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Academic\Models\Student;
use Modules\Rotation\Models\RotationAssignment;
use Modules\Rotation\Services\RotationSchedulerService;

class RotationAssignmentController extends Controller
{
    public function __construct(private RotationSchedulerService $scheduler) {}

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
        } elseif ($user && $user->hasRole('Admin RS') && ! $user->hasAnyRole(['Super Admin', 'Admin Prodi', 'Kaprodi'])) {
            // Admin RS hanya melihat penempatan di rumah sakitnya sendiri
            $query->whereIn('hospital_id', $user->linkedHospitalIds());
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

        if ($reason = $this->scheduler->assignmentConflict($validated)) {
            return response()->json(['message' => $reason], 409);
        }

        $assignment = RotationAssignment::create($validated);
        $this->scheduler->notifyStudentAssigned($assignment);

        return response()->json([
            'data' => $assignment->load(['student.user', 'stase', 'hospital']),
            'message' => 'Rotation Assignment created successfully',
        ], 201);
    }

    /**
     * Penempatan massal: banyak mahasiswa sekaligus ke stase+RS+periode.
     * Tiap mahasiswa dicek konflik & kapasitas — yang gagal dilaporkan, bukan
     * menggagalkan seluruh batch.
     */
    public function storeBulk(Request $request)
    {
        $validated = $request->validate([
            'rotation_period_id' => 'required|uuid|exists:rotation_periods,id',
            'stase_id' => 'required|uuid|exists:stases,id',
            'hospital_id' => 'required|uuid|exists:hospitals,id',
            'status' => 'required|string|in:pending,confirmed,in_progress,completed,remedial',
            'student_ids' => 'required|array|min:1|max:200',
            'student_ids.*' => 'uuid|exists:students,id',
        ]);

        $created = 0;
        $skipped = [];

        foreach (array_unique($validated['student_ids']) as $studentId) {
            $data = [
                'rotation_period_id' => $validated['rotation_period_id'],
                'student_id' => $studentId,
                'stase_id' => $validated['stase_id'],
                'hospital_id' => $validated['hospital_id'],
                'status' => $validated['status'],
            ];

            if ($reason = $this->scheduler->assignmentConflict($data)) {
                $student = Student::with('user')->find($studentId);
                $skipped[] = [
                    'student_id' => $studentId,
                    'name' => $student?->user?->name,
                    'reason' => $reason,
                ];

                continue;
            }

            $assignment = RotationAssignment::create($data);
            $this->scheduler->notifyStudentAssigned($assignment);
            $created++;
        }

        return response()->json([
            'message' => "Penempatan selesai: {$created} mahasiswa ditempatkan, ".count($skipped).' dilewati.',
            'data' => ['created' => $created, 'skipped' => $skipped],
        ]);
    }

    /**
     * AUTO-SCHEDULING: preview distribusi round-robin (dry-run, tanpa menulis DB).
     */
    public function schedulePreview(Request $request)
    {
        $validated = $request->validate([
            'rotation_period_id' => 'required|uuid|exists:rotation_periods,id',
            'cohort_id' => 'nullable|uuid|exists:cohorts,id',
        ]);

        $result = $this->scheduler->preview(
            $validated['rotation_period_id'],
            $validated['cohort_id'] ?? null
        );

        return response()->json([
            'message' => "Preview: {$result['summary']['placed']} dari {$result['summary']['candidates']} mahasiswa dapat ditempatkan.",
            'data' => $result,
        ]);
    }

    /**
     * AUTO-SCHEDULING: terapkan hasil preview (dengan re-cek konflik/kuota).
     */
    public function scheduleCommit(Request $request)
    {
        $validated = $request->validate([
            'rotation_period_id' => 'required|uuid|exists:rotation_periods,id',
            'placements' => 'required|array|min:1|max:500',
            'placements.*.student_id' => 'required|uuid|exists:students,id',
            'placements.*.stase_id' => 'required|uuid|exists:stases,id',
            'placements.*.hospital_id' => 'required|uuid|exists:hospitals,id',
        ]);

        $result = $this->scheduler->commit($validated['rotation_period_id'], $validated['placements']);

        return response()->json([
            'message' => "Jadwal diterapkan: {$result['created']} penempatan dibuat, ".count($result['skipped']).' dilewati.',
            'data' => $result,
        ]);
    }

    /**
     * Matriks jadwal untuk tampilan timeline: baris = mahasiswa satu
     * angkatan, kolom = periode rotasi (urut tanggal), sel = stase@RS.
     */
    public function scheduleMatrix(Request $request)
    {
        $validated = $request->validate(['cohort_id' => 'required|uuid|exists:cohorts,id']);

        $students = Student::with('user:id,name,identity_number')
            ->where('cohort_id', $validated['cohort_id'])
            ->get();

        $assignments = RotationAssignment::with(['stase:id,name,color_code', 'hospital:id,name', 'rotationPeriod:id,name,start_date,end_date'])
            ->whereIn('student_id', $students->pluck('id'))
            ->get();

        $periods = $assignments->pluck('rotationPeriod')
            ->filter()
            ->unique('id')
            ->sortBy('start_date')
            ->values()
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'start_date' => $p->start_date,
                'end_date' => $p->end_date,
            ]);

        $byStudent = $assignments->groupBy('student_id');

        $rows = $students->map(function (Student $s) use ($byStudent) {
            $cells = [];
            foreach ($byStudent->get($s->id, collect()) as $a) {
                $cells[$a->rotation_period_id] = [
                    'assignment_id' => $a->id,
                    'stase' => $a->stase?->name,
                    'hospital' => $a->hospital?->name,
                    'color' => $a->stase?->color_code,
                    'status' => $a->status,
                    'attempt_number' => $a->attempt_number,
                ];
            }

            return [
                'student_id' => $s->id,
                'name' => $s->user?->name,
                'identity_number' => $s->user?->identity_number,
                'cells' => $cells,
            ];
        })->sortBy('name')->values();

        return response()->json([
            'data' => ['periods' => $periods, 'rows' => $rows],
        ]);
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

        // Pindah RS/stase → cek kapasitas tujuan (abaikan slot dirinya sendiri)
        $movesSlot = $validated['hospital_id'] !== $assignment->hospital_id
            || $validated['stase_id'] !== $assignment->stase_id;
        if ($movesSlot) {
            $reason = $this->scheduler->capacityFull(
                $validated['hospital_id'],
                $validated['stase_id'],
                $assignment->rotation_period_id
            );
            if ($reason) {
                return response()->json(['message' => $reason], 409);
            }
        }

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
