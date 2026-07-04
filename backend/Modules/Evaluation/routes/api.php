<?php

use Illuminate\Support\Facades\Route;
use Modules\Evaluation\Http\Controllers\EvaluationController;

Route::middleware('auth:sanctum')->prefix('v1/clinical')->group(function () {
    Route::get('evaluations/questions', [EvaluationController::class, 'questions']);
    Route::post('evaluations/submit', [EvaluationController::class, 'submit']);
    Route::get('evaluations/status/{assignment_id}', [EvaluationController::class, 'status']);

    // Laporan agregat ANONIM (Aturan A: hanya pemegang view-analytics)
    Route::middleware('permission:view-analytics')->group(function () {
        Route::get('evaluations/report', [EvaluationController::class, 'report']);
    });

    // Bank pertanyaan evaluasi (data master)
    Route::middleware('permission:manage-academic-master')->group(function () {
        Route::get('evaluations/questions/all', [EvaluationController::class, 'allQuestions']);
        Route::post('evaluations/questions', [EvaluationController::class, 'storeQuestion']);
        Route::put('evaluations/questions/{id}', [EvaluationController::class, 'updateQuestion']);
        Route::delete('evaluations/questions/{id}', [EvaluationController::class, 'destroyQuestion']);
    });
});
