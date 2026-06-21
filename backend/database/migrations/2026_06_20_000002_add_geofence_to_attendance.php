<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Smart Attendance enhancement (Develop/SMART_ATTENDANCE_SYSTEM.md §3.2 & §3.3):
 *  - Per-hospital configurable geofence radius (replaces the hardcoded 100m constant).
 *  - GPS spoofing flag + reason + recorded distances for admin review.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hospitals', function (Blueprint $table) {
            // NULL = fall back to system default (Setting attendance_default_radius / 100m)
            $table->unsignedInteger('radius_tolerance_meters')->nullable()->after('longitude');
        });

        Schema::table('attendance_records', function (Blueprint $table) {
            $table->boolean('is_flagged')->default(false)->after('status');
            $table->string('flag_reason')->nullable()->after('is_flagged');
            $table->decimal('check_in_distance', 8, 2)->nullable()->after('check_in_lng');
            $table->decimal('check_out_distance', 8, 2)->nullable()->after('check_out_lng');
        });
    }

    public function down(): void
    {
        Schema::table('hospitals', function (Blueprint $table) {
            $table->dropColumn('radius_tolerance_meters');
        });

        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropColumn(['is_flagged', 'flag_reason', 'check_in_distance', 'check_out_distance']);
        });
    }
};
