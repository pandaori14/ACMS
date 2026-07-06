<?php

namespace Modules\Academic\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Modules\Academic\Http\Requests\StoreStudentRequest;
use Modules\Academic\Http\Requests\UpdateStudentRequest;
use Modules\Academic\Imports\StudentRowsImport;
use Modules\Academic\Models\Student;
use Modules\Academic\Services\StudentService;
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

        if ($request->filled('program_id')) {
            $query->where('program_id', $request->program_id);
        }

        if ($request->filled('cohort_id')) {
            $query->where('cohort_id', $request->cohort_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
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

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function store(StoreStudentRequest $request, StudentService $service): JsonResponse
    {
        $student = $service->createStudent($request->validated());

        return response()->json([
            'message' => 'Mahasiswa berhasil ditambahkan.',
            'data' => $student,
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $student = Student::with(['user', 'cohort', 'program'])->findOrFail($id);

        return response()->json(['data' => $student]);
    }

    public function update(UpdateStudentRequest $request, string $id, StudentService $service): JsonResponse
    {
        $student = Student::with('user')->findOrFail($id);
        $student = $service->updateStudent($student, $request->validated());

        return response()->json([
            'message' => 'Data mahasiswa berhasil diperbarui.',
            'data' => $student,
        ]);
    }

    public function destroy(string $id, StudentService $service): JsonResponse
    {
        $student = Student::with('user')->findOrFail($id);

        if (RotationAssignment::where('student_id', $student->id)->exists()) {
            return response()->json([
                'message' => 'Mahasiswa memiliki riwayat rotasi dan tidak dapat dihapus. Ubah statusnya (mis. lulus/cuti) sebagai gantinya.',
            ], 422);
        }

        $service->deleteStudent($student);

        return response()->json([
            'message' => 'Mahasiswa berhasil dihapus dan akunnya dinonaktifkan.',
        ]);
    }

    /**
     * Transisi status siklus mahasiswa (aktif → cuti → lulus/DO) dengan alasan
     * wajib + jejak audit + notifikasi. Mahasiswa non-aktif otomatis ditolak
     * saat penempatan rotasi (guard di RotationSchedulerService).
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $student = Student::with('user')->findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|exists:system_references,value,category,student_statuses',
            'reason' => 'required|string|min:5|max:1000',
        ]);

        if ($validated['status'] === $student->status) {
            return response()->json(['message' => 'Status mahasiswa sudah bernilai tersebut.'], 422);
        }

        $oldStatus = $student->status;
        $student->update(['status' => $validated['status']]);

        AuditService::log(
            'student.status_changed',
            $student,
            ['status' => $oldStatus],
            ['status' => $validated['status']],
            ['reason' => $validated['reason']]
        );

        // Aturan C: kabari mahasiswa — siapa saja yang ikut menerima diatur
        // Super Admin lewat SMTP matrix (student_status_changed).
        if ($student->user?->email) {
            NotificationService::sendDynamicEmail(
                $student->user->email,
                'Perubahan Status Akademik Anda',
                'email_template_student_status_changed',
                'student_status_changed',
                [
                    'name' => $student->user->name,
                    'status' => $validated['status'],
                    'reason' => $validated['reason'],
                ],
                ['status' => $validated['status']]
            );
        }

        return response()->json([
            'message' => 'Status mahasiswa berhasil diubah.',
            'data' => $student->fresh(['user', 'cohort', 'program']),
        ]);
    }

    /**
     * Import massal mahasiswa dari file Excel/CSV (heading: nama, email, nim, password?).
     */
    public function import(Request $request, StudentService $service): JsonResponse
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv,txt|max:5120',
            'program_id' => 'required|uuid|exists:programs,id',
            'cohort_id' => 'required|uuid|exists:cohorts,id',
        ]);

        $import = new StudentRowsImport;
        Excel::import($import, $validated['file']);

        $result = $service->importRows($import->rows->all(), $validated['program_id'], $validated['cohort_id']);

        return response()->json([
            'message' => "Import selesai: {$result['created']} mahasiswa dibuat, ".count($result['skipped']).' baris dilewati.',
            'data' => $result,
        ]);
    }

    /**
     * Template import (CSV, dibuka langsung oleh Excel).
     */
    public function importTemplate()
    {
        $csv = "nama,email,nim,password\n".
            "Budi Santoso,budi@student.ums.ac.id,J500200001,\n".
            "Siti Rahma,siti@student.ums.ac.id,J500200002,\n";

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="template-import-mahasiswa.csv"',
        ]);
    }
}
