<?php

use Illuminate\Support\Facades\Route;
use Modules\Rotation\Http\Controllers\HospitalController;
use Modules\Rotation\Http\Controllers\RotationAssignmentController;
use Modules\Rotation\Http\Controllers\RotationPeriodController;

Route::middleware(['auth:sanctum'])->prefix('v1/rotation')->group(function () {
    Route::apiResource('hospitals', HospitalController::class);
    Route::apiResource('periods', RotationPeriodController::class);
    Route::apiResource('assignments', RotationAssignmentController::class);
});
