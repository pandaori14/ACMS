<?php

namespace Modules\Attendance\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Modules\Attendance\Models\AttendanceRecord;
use Modules\Attendance\Services\AttendanceService;
use Modules\Rotation\Models\RotationAssignment;

class AttendanceController extends Controller
{
    public function __construct(private AttendanceService $attendance) {}

    /**
     * Today's attendance status for the authenticated student.
     */
    public function status(Request $request)
    {
        $user = Auth::user();
        $studentId = $user->student ? $user->student->id : $user->id;

        $activeAssignment = RotationAssignment::where('student_id', $studentId)
            ->whereHas('rotationPeriod', function ($q) {
                $q->where('start_date', '<=', now())
                    ->where('end_date', '>=', now());
            })
            ->with('hospital')
            ->first();

        if (! $activeAssignment) {
            return response()->json([
                'status' => 'No active rotation',
                'can_check_in' => false,
            ]);
        }

        $record = AttendanceRecord::where('student_id', $studentId)
            ->where('rotation_assignment_id', $activeAssignment->id)
            ->whereDate('date', today())
            ->first();

        $hospital = $activeAssignment->hospital;

        return response()->json([
            'rotation' => [
                'id' => $activeAssignment->id,
                'hospital' => [
                    'name' => $hospital->name,
                    'latitude' => $hospital->latitude,
                    'longitude' => $hospital->longitude,
                    'radius' => $this->attendance->radiusFor($hospital),
                ],
            ],
            'attendance' => $record,
            'can_check_in' => ! $record || ! $record->check_in_time,
            'can_check_out' => $record && $record->check_in_time && ! $record->check_out_time,
        ]);
    }

    /**
     * Check-in (with optional geofence enforcement).
     */
    public function checkIn(Request $request)
    {
        $requireLocation = filter_var(
            Setting::getValue('require_location_clockin', false),
            FILTER_VALIDATE_BOOLEAN
        );

        $request->validate([
            'latitude' => $requireLocation ? 'required|numeric' : 'nullable|numeric',
            'longitude' => $requireLocation ? 'required|numeric' : 'nullable|numeric',
            'rotation_assignment_id' => 'required|uuid|exists:rotation_assignments,id',
        ]);

        $user = Auth::user();
        $studentId = $user->student ? $user->student->id : $user->id;
        $assignment = RotationAssignment::with('hospital')->findOrFail($request->rotation_assignment_id);

        $distance = null;

        if ($requireLocation) {
            if (! $assignment->hospital->latitude || ! $assignment->hospital->longitude) {
                return response()->json(['message' => 'Koordinat Rumah Sakit belum diatur oleh admin.'], 400);
            }

            $geo = $this->attendance->evaluateGeofence($assignment->hospital, (float) $request->latitude, (float) $request->longitude);
            $distance = $geo['distance'];

            if (! $geo['within']) {
                return response()->json([
                    'message' => 'Anda berada di luar radius Rumah Sakit.',
                    'distance_meters' => round($geo['distance']),
                    'radius_meters' => $geo['radius'],
                ], 403);
            }
        }

        $record = AttendanceRecord::where('student_id', $studentId)
            ->where('rotation_assignment_id', $assignment->id)
            ->whereDate('date', today())
            ->first();

        if ($record && $record->check_in_time) {
            return response()->json(['message' => 'Anda sudah melakukan check-in hari ini.'], 400);
        }

        // Mark LATE when checking in after the configured cutoff time (HH:MM).
        $status = 'PRESENT';
        $lateThreshold = Setting::getValue('attendance_late_threshold');
        if (! empty($lateThreshold) && now()->format('H:i') > substr((string) $lateThreshold, 0, 5)) {
            $status = 'LATE';
        }

        $payload = [
            'student_id' => $studentId,
            'rotation_assignment_id' => $assignment->id,
            'date' => today(),
            'check_in_time' => now()->format('H:i:s'),
            'check_in_lat' => $request->latitude,
            'check_in_lng' => $request->longitude,
            'check_in_distance' => $distance,
            'status' => $status,
        ];

        $record = $record
            ? tap($record)->update($payload)
            : AttendanceRecord::create($payload);

        return response()->json([
            'message' => 'Check-in berhasil!',
            'data' => $record,
        ]);
    }

    /**
     * Check-out (geofence + GPS spoofing review flag).
     */
    public function checkOut(Request $request)
    {
        $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'rotation_assignment_id' => 'required|uuid|exists:rotation_assignments,id',
        ]);

        $user = Auth::user();
        $studentId = $user->student ? $user->student->id : $user->id;

        $record = AttendanceRecord::where('student_id', $studentId)
            ->where('rotation_assignment_id', $request->rotation_assignment_id)
            ->whereDate('date', today())
            ->first();

        if (! $record || ! $record->check_in_time) {
            return response()->json(['message' => 'Anda belum melakukan check-in.'], 400);
        }
        if ($record->check_out_time) {
            return response()->json(['message' => 'Anda sudah melakukan check-out.'], 400);
        }

        $assignment = RotationAssignment::with('hospital')->findOrFail($request->rotation_assignment_id);
        $geo = $this->attendance->evaluateGeofence($assignment->hospital, (float) $request->latitude, (float) $request->longitude);

        if (! $geo['within']) {
            return response()->json([
                'message' => 'Anda berada di luar radius Rumah Sakit untuk Check-out.',
                'distance_meters' => round($geo['distance']),
                'radius_meters' => $geo['radius'],
            ], 403);
        }

        $checkOutTime = now()->format('H:i:s');

        // GPS spoofing review: impossible travel between check-in and check-out.
        $flagReason = null;
        if ($record->check_in_lat && $record->check_in_lng) {
            $flagReason = $this->attendance->detectImpossibleTravel(
                (float) $record->check_in_lat,
                (float) $record->check_in_lng,
                (string) $record->check_in_time,
                (float) $request->latitude,
                (float) $request->longitude,
                $checkOutTime
            );
        }

        $record->update([
            'check_out_time' => $checkOutTime,
            'check_out_lat' => $request->latitude,
            'check_out_lng' => $request->longitude,
            'check_out_distance' => $geo['distance'],
            'is_flagged' => $flagReason !== null,
            'flag_reason' => $flagReason,
        ]);

        return response()->json([
            'message' => 'Check-out berhasil!',
            'data' => $record,
            'flagged' => $flagReason !== null,
        ]);
    }

    /**
     * Attendance recap for Clinical Instructors / Admins.
     * Route is protected by permission:view-attendance-recap.
     */
    public function recap(Request $request)
    {
        $user = $request->user();

        $query = AttendanceRecord::with([
            'rotationAssignment.student.user:id,name,identity_number',
            'rotationAssignment.hospital:id,name',
            'rotationAssignment.stase:id,name',
        ])->latest('date');

        // Scope: admins/oversight see everything; Admin RS sees their hospital(s);
        // CIs (Dodiknis) see only students they precept.
        $isAdmin = $user->hasAnyRole(['Super Admin', 'Admin Prodi', 'Kaprodi']);
        if (! $isAdmin && $user->hasRole('Admin RS')) {
            $hospitalIds = $user->linkedHospitalIds();
            $query->whereHas('rotationAssignment', fn ($q) => $q->whereIn('hospital_id', $hospitalIds));
        } elseif (! $isAdmin) {
            $query->whereHas('rotationAssignment', fn ($q) => $q->where('preceptor_id', $user->id));
        }

        if ($request->boolean('flagged_only')) {
            $query->where('is_flagged', true);
        }
        if ($request->filled('date')) {
            $query->whereDate('date', $request->date('date'));
        }
        if ($request->filled('rotation_assignment_id')) {
            $query->where('rotation_assignment_id', $request->input('rotation_assignment_id'));
        }

        $perPage = (int) Setting::getValue('items_per_page', 20);
        $paginator = $query->paginate($perPage > 0 ? $perPage : 20);

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

    /**
     * Pengajuan izin/sakit oleh mahasiswa untuk tanggal tertentu.
     * Membuat record SICK/LEAVE ber-flag agar terlihat di rekap untuk direview.
     */
    public function submitLeave(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'type' => 'required|in:SICK,LEAVE',
            'notes' => 'required|string|min:5|max:500',
        ]);

        $user = Auth::user();
        if (! $user->student) {
            return response()->json(['message' => 'Hanya mahasiswa yang dapat mengajukan izin/sakit.'], 403);
        }
        $studentId = $user->student->id;

        $assignment = RotationAssignment::where('student_id', $studentId)
            ->whereHas('rotationPeriod', function ($q) use ($validated) {
                $q->where('start_date', '<=', $validated['date'])
                    ->where('end_date', '>=', $validated['date']);
            })
            ->first();

        if (! $assignment) {
            return response()->json(['message' => 'Tidak ada penempatan rotasi aktif pada tanggal tersebut.'], 422);
        }

        $existing = AttendanceRecord::where('student_id', $studentId)
            ->where('rotation_assignment_id', $assignment->id)
            ->whereDate('date', $validated['date'])
            ->first();

        if ($existing && $existing->check_in_time) {
            return response()->json(['message' => 'Anda sudah check-in pada tanggal tersebut — izin tidak dapat diajukan.'], 422);
        }
        if ($existing && in_array($existing->status, ['SICK', 'LEAVE'], true)) {
            return response()->json(['message' => 'Pengajuan izin/sakit untuk tanggal tersebut sudah ada.'], 422);
        }

        $payload = [
            'student_id' => $studentId,
            'rotation_assignment_id' => $assignment->id,
            'date' => $validated['date'],
            'status' => $validated['type'],
            'notes' => $validated['notes'],
            'is_flagged' => true,
            'flag_reason' => 'Pengajuan '.($validated['type'] === 'SICK' ? 'sakit' : 'izin').' — menunggu review',
        ];

        $record = $existing
            ? tap($existing)->update($payload)
            : AttendanceRecord::create($payload);

        return response()->json([
            'message' => 'Pengajuan berhasil dikirim dan menunggu review pembimbing/admin.',
            'data' => $record,
        ], 201);
    }

    /**
     * Koreksi kehadiran oleh Dodiknis (mahasiswa bimbingannya) atau admin:
     * ubah status/catatan dan selesaikan flag review.
     */
    public function correct(Request $request, string $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:PRESENT,LATE,ABSENT,SICK,LEAVE',
            'notes' => 'nullable|string|max:500',
        ]);

        $record = AttendanceRecord::with('rotationAssignment')->findOrFail($id);
        $user = $request->user();

        // Dodiknis hanya mahasiswa bimbingannya; Admin RS hanya di RS-nya
        $isAdmin = $user->hasAnyRole(['Super Admin', 'Admin Prodi', 'Kaprodi']);
        if (! $isAdmin) {
            $isMyStudent = $record->rotationAssignment?->preceptor_id === $user->id;
            $atMyHospital = $user->hasRole('Admin RS')
                && $user->linkedHospitalIds()->contains($record->rotationAssignment?->hospital_id);

            if (! $isMyStudent && ! $atMyHospital) {
                return response()->json(['message' => 'Anda hanya dapat mengoreksi kehadiran mahasiswa bimbingan Anda / di RS Anda.'], 403);
            }
        }

        $record->update([
            'status' => $validated['status'],
            'notes' => $validated['notes'] ?? $record->notes,
            'is_flagged' => false,
            'flag_reason' => "Dikoreksi oleh {$user->name} (".now()->format('d/m/Y H:i').')',
        ]);

        return response()->json([
            'message' => 'Kehadiran berhasil dikoreksi.',
            'data' => $record->fresh(),
        ]);
    }
}
