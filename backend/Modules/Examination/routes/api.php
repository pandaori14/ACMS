<?php

use Illuminate\Support\Facades\Route;
use Modules\Examination\Http\Controllers\ExaminationController;

Route::middleware('auth:sanctum')->prefix('v1/examinations')->group(function () {
    // Baca: peserta/penguji/admin (scoping per-peran di controller)
    Route::get('/', [ExaminationController::class, 'index']);
    Route::get('/{id}', [ExaminationController::class, 'show']);
    Route::get('/{id}/pdf', [ExaminationController::class, 'exportPdf']);

    // Nilai: otorisasi penguji dicek inline di controller (assessor ujian ybs)
    Route::post('/{id}/scores', [ExaminationController::class, 'storeScore']);

    // Mutasi ujian = admin ujian (Aturan A)
    Route::middleware('permission:manage-examinations')->group(function () {
        Route::post('/', [ExaminationController::class, 'store']);
        Route::put('/{id}', [ExaminationController::class, 'update']);
        Route::delete('/{id}', [ExaminationController::class, 'destroy']);

        Route::post('/{id}/participants', [ExaminationController::class, 'assignParticipant']);
        Route::delete('/{id}/participants/{participantId}', [ExaminationController::class, 'removeParticipant']);
        Route::post('/{id}/assessors', [ExaminationController::class, 'assignAssessor']);
        Route::delete('/{id}/assessors/{assessorId}', [ExaminationController::class, 'removeAssessor']);
        Route::post('/{id}/stations', [ExaminationController::class, 'addStation']);
        Route::delete('/{id}/stations/{stationId}', [ExaminationController::class, 'removeStation']);
        Route::patch('/{id}/status', [ExaminationController::class, 'changeStatus']);
    });
});
