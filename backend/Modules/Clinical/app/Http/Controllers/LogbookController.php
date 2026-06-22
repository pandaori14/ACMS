<?php

namespace Modules\Clinical\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\Academic\Models\Student;
use Modules\Clinical\Models\LogbookEntry;
use Modules\Clinical\Notifications\LogbookSubmittedNotification;
use Modules\Clinical\Notifications\LogbookVerifiedNotification;

class LogbookController extends Controller
{
    /**
     * List logbook entries.
     * - Students see only their own entries.
     * - Dodiknis sees entries of students assigned to them.
     * - Admin sees all entries.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = LogbookEntry::with([
            'student.user',
            'rotationAssignment.hospital',
            'rotationAssignment.stase',
            'diagnosis',
            'procedure',
            'preceptor',
        ]);

        // Filter by student if student_id param is provided
        if ($request->has('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($user && $user->hasRole('Dodiknis')) {
            // Dodiknis sees entries associated with assignments in their hospitals
            $hospitalIds = DB::table('hospital_user')->where('user_id', $user->id)->pluck('hospital_id');
            $query->whereHas('rotationAssignment', function ($q) use ($hospitalIds) {
                $q->whereIn('hospital_id', $hospitalIds);
            });
        } elseif ($user && $user->hasRole('Mahasiswa')) {
            // Mahasiswa only sees their own entries
            $student = DB::table('students')->where('user_id', $user->id)->first();
            if ($student) {
                $query->where('student_id', $student->id);
            }
        }

        // Filter by rotation assignment
        if ($request->has('rotation_assignment_id')) {
            $query->where('rotation_assignment_id', $request->rotation_assignment_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by preceptor (for Dodiknis verification view)
        if ($request->has('preceptor_id')) {
            $query->where('preceptor_id', $request->preceptor_id);
        }

        // Filter entries pending verification (for Dodiknis)
        if ($request->has('pending_verification') && $request->pending_verification === 'true') {
            $query->where('status', 'submitted');
        }

        // Filter by search query
        if ($request->has('search') && ! empty($request->search)) {
            $search = strtolower($request->search);
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(description) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(patient_initials) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(medical_record_no) LIKE ?', ["%{$search}%"])
                    ->orWhereHas('student.user', function ($q2) use ($search) {
                        $q2->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"]);
                    })
                    ->orWhereHas('diagnosis', function ($q2) use ($search) {
                        $q2->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"]);
                    })
                    ->orWhereHas('procedure', function ($q2) use ($search) {
                        $q2->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"]);
                    });
            });
        }

        $entries = $query->orderBy('activity_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'data' => $entries->items(),
            'meta' => [
                'current_page' => $entries->currentPage(),
                'last_page' => $entries->lastPage(),
                'per_page' => $entries->perPage(),
                'total' => $entries->total(),
            ],
        ]);
    }

    /**
     * Store a new logbook entry (student submits).
     */
    public function store(Request $request): JsonResponse
    {
        $maxKb = (int) Setting::getValue('max_upload_size_mb', 5) * 1024;

        $validated = $request->validate([
            'rotation_assignment_id' => 'required|uuid|exists:rotation_assignments,id',
            'preceptor_id' => 'nullable|uuid|exists:users,id',
            'activity_date' => 'required|date',
            'activity_type' => 'required|in:case,procedure,duty',
            'description' => 'required|string|max:2000',
            'patient_initials' => 'nullable|string|max:10',
            'medical_record_no' => 'nullable|string|max:50',
            'diagnosis_id' => 'nullable|uuid|exists:diagnoses,id',
            'procedure_id' => 'nullable|uuid|exists:procedures,id',
            'competency_level' => 'nullable|in:1,2,3,4',
            'status' => 'nullable|in:draft,submitted',
            'attachment' => "nullable|file|mimes:jpg,jpeg,png,pdf|max:{$maxKb}",
        ]);

        // Handle file upload
        if ($request->hasFile('attachment')) {
            $path = $request->file('attachment')->store('logbook-attachments', 'public');
            $validated['attachment_path'] = $path;
        }
        unset($validated['attachment']);

        // Enforce logbook_cutoff_days
        $cutoffDays = Setting::getValue('logbook_cutoff_days', 7);
        $activityDate = Carbon::parse($validated['activity_date']);
        if ($activityDate->diffInDays(now(), false) > $cutoffDays) {
            return response()->json([
                'message' => "Batas waktu pengisian logbook ($cutoffDays hari) telah lewat.",
            ], 403);
        }

        // Set timestamps based on status
        if (($validated['status'] ?? 'draft') === 'submitted') {
            $validated['submitted_at'] = now();
        }

        $student = Student::where('user_id', $request->user()->id)->first();
        if (! $student) {
            return response()->json(['message' => 'Hanya mahasiswa yang dapat membuat logbook.'], 403);
        }
        $validated['student_id'] = $student->id;

        $entry = LogbookEntry::create($validated);

        if ($entry->status === 'submitted' && $entry->preceptor_id) {
            $preceptor = User::find($entry->preceptor_id);
            if ($preceptor) {
                $preceptor->notify(new LogbookSubmittedNotification($entry));
            }
        }

        return response()->json([
            'message' => 'Logbook entry created successfully',
            'data' => $entry->load([
                'student.user',
                'rotationAssignment.hospital',
                'rotationAssignment.stase',
                'diagnosis',
                'procedure',
            ]),
        ], 201);
    }

    /**
     * Show a single logbook entry.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $entry = LogbookEntry::with([
            'student.user',
            'rotationAssignment.hospital',
            'rotationAssignment.stase',
            'diagnosis',
            'procedure',
            'preceptor',
        ])->findOrFail($id);

        // RBAC Check
        if ($user->hasRole('Mahasiswa')) {
            $student = DB::table('students')->where('user_id', $user->id)->first();
            if (! $student || $entry->student_id !== $student->id) {
                return response()->json(['message' => 'Unauthorized. This is not your logbook.'], 403);
            }
        } elseif ($user->hasRole('Dodiknis')) {
            $hospitalIds = DB::table('hospital_user')->where('user_id', $user->id)->pluck('hospital_id');
            $assignment = DB::table('rotation_assignments')->where('id', $entry->rotation_assignment_id)->first();
            if (! $assignment || ! $hospitalIds->contains($assignment->hospital_id)) {
                return response()->json(['message' => 'Unauthorized. Student is not assigned to your hospital.'], 403);
            }
        }

        return response()->json([
            'data' => $entry,
        ]);
    }

    /**
     * Update a logbook entry (only if status is 'draft' or 'rejected').
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $entry = LogbookEntry::findOrFail($id);

        $user = $request->user();
        if ($user->hasRole('Mahasiswa')) {
            $student = DB::table('students')->where('user_id', $user->id)->first();
            if (! $student || $entry->student_id !== $student->id) {
                return response()->json(['message' => 'Unauthorized. Cannot edit someone else\'s logbook.'], 403);
            }
        }

        if (! in_array($entry->status, ['draft', 'rejected'])) {
            return response()->json([
                'message' => 'Logbook hanya bisa diedit saat berstatus Draft atau Ditolak.',
            ], 422);
        }

        $maxKb = (int) Setting::getValue('max_upload_size_mb', 5) * 1024;

        $validated = $request->validate([
            'activity_date' => 'sometimes|date',
            'activity_type' => 'sometimes|in:case,procedure,duty',
            'description' => 'sometimes|string|max:2000',
            'patient_initials' => 'nullable|string|max:10',
            'medical_record_no' => 'nullable|string|max:50',
            'diagnosis_id' => 'nullable|uuid|exists:diagnoses,id',
            'procedure_id' => 'nullable|uuid|exists:procedures,id',
            'competency_level' => 'nullable|in:1,2,3,4',
            'status' => 'nullable|in:draft,submitted',
            'attachment' => "nullable|file|mimes:jpg,jpeg,png,pdf|max:{$maxKb}",
        ]);

        if (isset($validated['activity_date'])) {
            $cutoffDays = Setting::getValue('logbook_cutoff_days', 7);
            $activityDate = Carbon::parse($validated['activity_date']);
            if ($activityDate->diffInDays(now(), false) > $cutoffDays) {
                return response()->json([
                    'message' => "Batas waktu pengisian logbook ($cutoffDays hari) telah lewat.",
                ], 403);
            }
        }

        // Handle file upload replacement
        if ($request->hasFile('attachment')) {
            // Delete old file if exists
            if ($entry->attachment_path) {
                Storage::disk('public')->delete($entry->attachment_path);
            }
            $path = $request->file('attachment')->store('logbook-attachments', 'public');
            $validated['attachment_path'] = $path;
        }
        unset($validated['attachment']);

        // Set submitted_at if status changed to submitted
        if (($validated['status'] ?? null) === 'submitted' && ! $entry->submitted_at) {
            $validated['submitted_at'] = now();
        }

        $entry->update($validated);

        // Notify preceptor if newly submitted
        if (($validated['status'] ?? null) === 'submitted' && $entry->preceptor_id) {
            $preceptor = User::find($entry->preceptor_id);
            if ($preceptor) {
                $preceptor->notify(new LogbookSubmittedNotification($entry));
            }
        }

        return response()->json([
            'message' => 'Logbook entry updated successfully',
            'data' => $entry->fresh()->load([
                'student.user',
                'rotationAssignment.hospital',
                'rotationAssignment.stase',
                'diagnosis',
                'procedure',
            ]),
        ]);
    }

    /**
     * Verify (approve) a logbook entry — only for Dodiknis/Preceptor.
     */
    public function verify(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $entry = LogbookEntry::findOrFail($id);

        if (! $user->hasRole(['Super Admin', 'Dodiknis'])) {
            return response()->json(['message' => 'Unauthorized. Only Preceptors can verify logbooks.'], 403);
        }

        // Row-Level check for Dodiknis
        if ($user->hasRole('Dodiknis')) {
            $hospitalIds = DB::table('hospital_user')->where('user_id', $user->id)->pluck('hospital_id');
            $assignment = DB::table('rotation_assignments')->where('id', $entry->rotation_assignment_id)->first();
            if (! $assignment || ! $hospitalIds->contains($assignment->hospital_id)) {
                return response()->json(['message' => 'Unauthorized. Student is not assigned to your hospital.'], 403);
            }
        }

        if ($entry->status !== 'submitted') {
            return response()->json([
                'message' => 'Hanya logbook berstatus Submitted yang bisa diverifikasi.',
            ], 422);
        }

        $validated = $request->validate([
            'preceptor_feedback' => 'nullable|string|max:1000',
        ]);

        $entry->update([
            'status' => 'verified',
            'preceptor_feedback' => $validated['preceptor_feedback'] ?? null,
            'preceptor_id' => $request->user()->id,
            'verified_at' => now(),
        ]);

        // Notify student
        if ($entry->student && $entry->student->user) {
            $entry->student->user->notify(new LogbookVerifiedNotification($entry));

            // Dynamic SMTP Engine
            NotificationService::sendDynamicEmail(
                $entry->student->user->email,
                'Status Logbook Diverifikasi',
                'email_template_logbook_verified',
                'logbook_verified',
                [
                    'name' => $entry->student->user->name,
                    'stase' => $entry->rotationAssignment->stase->name ?? 'Stase',
                    'date' => $entry->activity_date,
                    'status' => 'Verified',
                ]
            );
        }

        return response()->json([
            'message' => 'Logbook berhasil diverifikasi.',
            'data' => $entry->fresh()->load(['student.user', 'preceptor']),
        ]);
    }

    /**
     * Reject a logbook entry — only for Dodiknis/Preceptor.
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $entry = LogbookEntry::findOrFail($id);

        if (! $user->hasRole(['Super Admin', 'Dodiknis'])) {
            return response()->json(['message' => 'Unauthorized. Only Preceptors can reject logbooks.'], 403);
        }

        // Row-Level check for Dodiknis
        if ($user->hasRole('Dodiknis')) {
            $hospitalIds = DB::table('hospital_user')->where('user_id', $user->id)->pluck('hospital_id');
            $assignment = DB::table('rotation_assignments')->where('id', $entry->rotation_assignment_id)->first();
            if (! $assignment || ! $hospitalIds->contains($assignment->hospital_id)) {
                return response()->json(['message' => 'Unauthorized. Student is not assigned to your hospital.'], 403);
            }
        }

        if ($entry->status !== 'submitted') {
            return response()->json([
                'message' => 'Hanya logbook berstatus Submitted yang bisa ditolak.',
            ], 422);
        }

        $validated = $request->validate([
            'preceptor_feedback' => 'required|string|max:1000',
        ]);

        $entry->update([
            'status' => 'rejected',
            'preceptor_feedback' => $validated['preceptor_feedback'],
            'preceptor_id' => $request->user()->id,
        ]);

        // Notify student
        if ($entry->student && $entry->student->user) {
            $entry->student->user->notify(new LogbookVerifiedNotification($entry));
        }

        return response()->json([
            'message' => 'Logbook ditolak. Mahasiswa dapat mengedit dan mengirim ulang.',
            'data' => $entry->fresh()->load(['student.user', 'preceptor']),
        ]);
    }

    /**
     * Delete a logbook entry (only if draft).
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $entry = LogbookEntry::findOrFail($id);

        $user = $request->user();
        if ($user->hasRole('Mahasiswa')) {
            $student = DB::table('students')->where('user_id', $user->id)->first();
            if (! $student || $entry->student_id !== $student->id) {
                return response()->json(['message' => 'Unauthorized. Cannot delete someone else\'s logbook.'], 403);
            }
        }

        if ($entry->status !== 'draft') {
            return response()->json([
                'message' => 'Hanya logbook berstatus Draft yang bisa dihapus.',
            ], 422);
        }

        // Delete attachment if exists
        if ($entry->attachment_path) {
            Storage::disk('public')->delete($entry->attachment_path);
        }

        $entry->delete();

        return response()->json([
            'message' => 'Logbook entry deleted successfully',
        ]);
    }
}
