<?php

namespace Modules\Rotation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Modules\Academic\Models\Student;
use Modules\Rotation\Models\HospitalCapacity;
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

        if ($reason = $this->assignmentConflict($validated)) {
            return response()->json(['message' => $reason], 409);
        }

        $assignment = RotationAssignment::create($validated);
        $this->notifyStudentAssigned($assignment);

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

            if ($reason = $this->assignmentConflict($data)) {
                $student = Student::with('user')->find($studentId);
                $skipped[] = [
                    'student_id' => $studentId,
                    'name' => $student?->user?->name,
                    'reason' => $reason,
                ];

                continue;
            }

            $assignment = RotationAssignment::create($data);
            $this->notifyStudentAssigned($assignment);
            $created++;
        }

        return response()->json([
            'message' => "Penempatan selesai: {$created} mahasiswa ditempatkan, ".count($skipped).' dilewati.',
            'data' => ['created' => $created, 'skipped' => $skipped],
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
            $reason = $this->capacityFull(
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

    /**
     * Cek konflik penempatan: mahasiswa dobel di periode yg sama, atau kuota penuh.
     * Mengembalikan pesan alasan, atau null bila aman.
     */
    private function assignmentConflict(array $data): ?string
    {
        $exists = RotationAssignment::where('rotation_period_id', $data['rotation_period_id'])
            ->where('student_id', $data['student_id'])
            ->exists();

        if ($exists) {
            return 'Mahasiswa sudah memiliki penempatan pada periode ini.';
        }

        return $this->capacityFull($data['hospital_id'], $data['stase_id'], $data['rotation_period_id']);
    }

    /**
     * Guard kapasitas RS per stase (hospital_capacities). Aturan pencocokan:
     * baris kapasitas spesifik-periode menang atas baris umum (period null).
     * Tanpa baris kapasitas = tidak dibatasi.
     */
    private function capacityFull(string $hospitalId, string $staseId, string $periodId): ?string
    {
        $capacity = HospitalCapacity::where('hospital_id', $hospitalId)
            ->where('stase_id', $staseId)
            ->where(function ($q) use ($periodId) {
                $q->where('rotation_period_id', $periodId)->orWhereNull('rotation_period_id');
            })
            ->orderByRaw('rotation_period_id IS NULL') // spesifik periode dulu
            ->first();

        if (! $capacity) {
            return null;
        }

        $occupied = RotationAssignment::where('hospital_id', $hospitalId)
            ->where('stase_id', $staseId)
            ->where('rotation_period_id', $periodId)
            ->count();

        if ($occupied >= $capacity->max_students) {
            return "Kuota penuh: RS ini hanya menampung {$capacity->max_students} mahasiswa untuk stase tersebut pada periode ini.";
        }

        return null;
    }

    /**
     * Notifikasi penempatan ke mahasiswa (Aturan C — via SMTP matrix).
     */
    private function notifyStudentAssigned(RotationAssignment $assignment): void
    {
        $assignment->loadMissing(['student.user', 'stase', 'hospital', 'rotationPeriod']);
        $email = $assignment->student?->user?->email;

        if (! $email) {
            return;
        }

        NotificationService::sendDynamicEmail(
            $email,
            'Penempatan Rotasi Klinik Anda',
            'email_template_rotation_assigned',
            'rotation_assigned',
            [
                'name' => $assignment->student->user->name,
                'stase' => $assignment->stase?->name ?? '-',
                'hospital' => $assignment->hospital?->name ?? '-',
                'period' => $assignment->rotationPeriod?->name ?? '-',
            ]
        );
    }
}
