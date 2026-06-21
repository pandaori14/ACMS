<?php

use Illuminate\Support\Facades\Route;
use Modules\Attendance\Http\Controllers\AttendanceController;

Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::apiResource('attendances', AttendanceController::class)->names('attendance');
});

Route::middleware('auth:sanctum')->prefix('v1/clinical')->group(function () {
    Route::get('attendance/status', [AttendanceController::class, 'status']);
    Route::post('attendance/check-in', [AttendanceController::class, 'checkIn']);
    Route::post('attendance/check-out', [AttendanceController::class, 'checkOut']);
});

// Attendance recap for Clinical Instructors / Admins
Route::middleware(['auth:sanctum', 'permission:view-attendance-recap'])
    ->prefix('v1/clinical')
    ->group(function () {
        Route::get('attendance/recap', [AttendanceController::class, 'recap']);
    });
