<?php

use Illuminate\Support\Facades\Route;
use Modules\Examination\Http\Controllers\ExaminationController;

Route::middleware('auth:sanctum')->prefix('v1/examinations')->group(function () {
    Route::get('/', [ExaminationController::class, 'index']);
    Route::post('/', [ExaminationController::class, 'store']);
    Route::get('/{id}', [ExaminationController::class, 'show']);

    Route::post('/{id}/participants', [ExaminationController::class, 'assignParticipant']);
    Route::post('/{id}/assessors', [ExaminationController::class, 'assignAssessor']);
    Route::post('/{id}/scores', [ExaminationController::class, 'storeScore']);
    Route::patch('/{id}/status', [ExaminationController::class, 'changeStatus']);
    Route::get('/{id}/pdf', [ExaminationController::class, 'exportPdf']);
});
