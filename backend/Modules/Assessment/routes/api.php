<?php

use Illuminate\Support\Facades\Route;
use Modules\Assessment\Http\Controllers\AssessmentController;
use Modules\Assessment\Http\Controllers\GradeController;
use Modules\Assessment\Http\Controllers\YudisiumController;

Route::prefix('v1/assessments')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/templates', [AssessmentController::class, 'getTemplates']);

    // Mutasi template rubrik = data master (Aturan A)
    Route::middleware('permission:manage-academic-master')->group(function () {
        Route::post('/templates', [AssessmentController::class, 'storeTemplate']);
        Route::put('/templates/{id}', [AssessmentController::class, 'updateTemplate']);
        Route::delete('/templates/{id}', [AssessmentController::class, 'destroyTemplate']);
    });

    Route::get('/', [AssessmentController::class, 'index']);
    Route::post('/', [AssessmentController::class, 'store']);
    Route::get('/{id}', [AssessmentController::class, 'show']);
    Route::put('/{id}', [AssessmentController::class, 'update']);
    Route::delete('/{id}', [AssessmentController::class, 'destroy']);
    Route::patch('/{id}/acknowledge', [AssessmentController::class, 'acknowledge']);
});

// Dokumen resmi Yudisium (rate-limit generate di controller)
Route::prefix('v1/yudisium')->middleware(['auth:sanctum'])->group(function () {
    Route::post('/generate', [YudisiumController::class, 'generate']);
    Route::get('/my-documents', [YudisiumController::class, 'myDocuments']);
    Route::get('/documents/{id}/download', [YudisiumController::class, 'download']);
});

Route::prefix('v1/grades')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/export', [GradeController::class, 'export']);
    Route::get('/transcript/{student_id}', [GradeController::class, 'getTranscript']);
    Route::get('/', [GradeController::class, 'index']);
    Route::post('/calculate/{assignment_id}', [GradeController::class, 'calculate']);
    Route::patch('/{id}/approve', [GradeController::class, 'approve']);
    Route::patch('/{id}/publish', [GradeController::class, 'publish']);
});
