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

        // Scope: admins/oversight see everything; CIs see only students they precept.
        $isAdmin = $user->hasAnyRole(['Super Admin', 'Admin Prodi', 'Kaprodi']);
        if (! $isAdmin) {
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
}
