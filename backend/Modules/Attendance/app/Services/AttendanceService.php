<?php

namespace Modules\Attendance\Services;

use App\Models\Setting;
use Modules\Rotation\Models\Hospital;

/**
 * Geolocation logic for the Smart Attendance system.
 *
 * Per Develop/DEVELOPMENT_AGENTS.md §3.3, the Haversine distance computation lives
 * HERE in the Service layer, never in the Controller.
 */
class AttendanceService
{
    private const EARTH_RADIUS_METERS = 6_371_000;

    private const DEFAULT_RADIUS_METERS = 100;

    private const DEFAULT_MAX_SPEED_KMH = 90;

    private const SPOOF_MIN_DISTANCE_METERS = 500; // ignore GPS jitter below this

    /**
     * Great-circle distance between two coordinates in meters.
     */
    public function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;

        return self::EARTH_RADIUS_METERS * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /**
     * Effective geofence radius for a hospital:
     * per-hospital override -> system setting -> hardcoded default.
     */
    public function radiusFor(Hospital $hospital): int
    {
        if (! empty($hospital->radius_tolerance_meters)) {
            return (int) $hospital->radius_tolerance_meters;
        }

        return (int) Setting::getValue('attendance_default_radius', self::DEFAULT_RADIUS_METERS);
    }

    /**
     * Evaluate whether a coordinate is inside the hospital geofence.
     *
     * @return array{distance: float, radius: int, within: bool}
     */
    public function evaluateGeofence(Hospital $hospital, float $lat, float $lng): array
    {
        $distance = $this->haversine($lat, $lng, (float) $hospital->latitude, (float) $hospital->longitude);
        $radius = $this->radiusFor($hospital);

        return [
            'distance' => round($distance, 2),
            'radius' => $radius,
            'within' => $distance <= $radius,
        ];
    }

    /**
     * Detect impossible travel between two timestamped coordinates (GPS spoofing /
     * "titip absen"). Returns a human-readable reason, or null if plausible.
     *
     * @param  string  $time1  'H:i:s'
     * @param  string  $time2  'H:i:s'
     */
    public function detectImpossibleTravel(
        float $lat1,
        float $lon1,
        string $time1,
        float $lat2,
        float $lon2,
        string $time2
    ): ?string {
        $distanceM = $this->haversine($lat1, $lon1, $lat2, $lon2);
        if ($distanceM < self::SPOOF_MIN_DISTANCE_METERS) {
            return null;
        }

        $seconds = abs(strtotime($time2) - strtotime($time1));
        if ($seconds <= 0) {
            return sprintf('Perpindahan %.0f m tanpa selisih waktu (kemungkinan GPS palsu).', $distanceM);
        }

        $speedKmh = ($distanceM / 1000) / ($seconds / 3600);
        $maxSpeed = (int) Setting::getValue('attendance_max_speed_kmh', self::DEFAULT_MAX_SPEED_KMH);

        if ($speedKmh > $maxSpeed) {
            return sprintf(
                'Kecepatan tidak wajar: %.0f km/jam (%.0f m dalam %d detik).',
                $speedKmh,
                $distanceM,
                $seconds
            );
        }

        return null;
    }
}
