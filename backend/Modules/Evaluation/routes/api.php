<?php

use Illuminate\Support\Facades\Route;
use Modules\Evaluation\Http\Controllers\EvaluationController;

Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::apiResource('evaluations', EvaluationController::class)->names('evaluation');
});

Route::middleware('auth:sanctum')->prefix('v1/clinical')->group(function () {
    Route::get('evaluations/questions', [EvaluationController::class, 'questions']);
    Route::post('evaluations/submit', [EvaluationController::class, 'submit']);
    Route::get('evaluations/status/{assignment_id}', [EvaluationController::class, 'status']);
});
