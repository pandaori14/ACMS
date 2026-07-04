<?php

use Illuminate\Support\Facades\Route;
use Modules\Attendance\Http\Controllers\AttendanceController;

Route::middleware('auth:sanctum')->prefix('v1/clinical')->group(function () {
    Route::get('attendance/status', [AttendanceController::class, 'status']);
    Route::post('attendance/check-in', [AttendanceController::class, 'checkIn']);
    Route::post('attendance/check-out', [AttendanceController::class, 'checkOut']);

    // Pengajuan izin/sakit oleh mahasiswa (otorisasi kepemilikan di controller)
    Route::post('attendance/leave', [AttendanceController::class, 'submitLeave']);
});

// Rekap + koreksi kehadiran untuk Dodiknis / Admin (Aturan A)
Route::middleware(['auth:sanctum', 'permission:view-attendance-recap'])
    ->prefix('v1/clinical')
    ->group(function () {
        Route::get('attendance/recap', [AttendanceController::class, 'recap']);
        Route::put('attendance/{id}/correct', [AttendanceController::class, 'correct']);
    });
