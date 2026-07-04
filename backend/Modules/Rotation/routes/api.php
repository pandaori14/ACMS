<?php

use Illuminate\Support\Facades\Route;
use Modules\Rotation\Http\Controllers\HospitalCapacityController;
use Modules\Rotation\Http\Controllers\HospitalController;
use Modules\Rotation\Http\Controllers\RotationAssignmentController;
use Modules\Rotation\Http\Controllers\RotationPeriodController;

Route::middleware(['auth:sanctum'])->prefix('v1/rotation')->group(function () {
    // Baca terbuka lintas peran (scoping per-peran di controller);
    // mutasi digating permission (Aturan A).
    Route::apiResource('hospitals', HospitalController::class)
        ->only(['index', 'show']);
    Route::apiResource('hospitals', HospitalController::class)
        ->only(['store', 'update', 'destroy'])
        ->middleware('permission:manage-hospitals');

    Route::apiResource('periods', RotationPeriodController::class)
        ->only(['index', 'show']);
    Route::apiResource('periods', RotationPeriodController::class)
        ->only(['store', 'update', 'destroy'])
        ->middleware('permission:manage-rotations');

    // Kuota kapasitas RS per stase (baca: peran rotasi; mutasi: manage-rotations)
    Route::get('capacities', [HospitalCapacityController::class, 'index']);
    Route::middleware('permission:manage-rotations')->group(function () {
        Route::post('capacities', [HospitalCapacityController::class, 'store']);
        Route::delete('capacities/{id}', [HospitalCapacityController::class, 'destroy']);
    });

    Route::apiResource('assignments', RotationAssignmentController::class)
        ->only(['index', 'show']);
    Route::middleware('permission:manage-rotations')->group(function () {
        // Auto-scheduling: distribusi round-robin satu angkatan (preview → commit)
        Route::post('schedule/preview', [RotationAssignmentController::class, 'schedulePreview']);
        Route::post('schedule/commit', [RotationAssignmentController::class, 'scheduleCommit']);

        Route::post('assignments/bulk', [RotationAssignmentController::class, 'storeBulk']);
        Route::post('assignments', [RotationAssignmentController::class, 'store']);
        Route::match(['put', 'patch'], 'assignments/{assignment}', [RotationAssignmentController::class, 'update']);
        Route::delete('assignments/{assignment}', [RotationAssignmentController::class, 'destroy']);
    });
});
