<?php

use Illuminate\Support\Facades\Route;
use Modules\Clinical\Http\Controllers\CatalogController;
use Modules\Clinical\Http\Controllers\CompetencyProgressController;
use Modules\Clinical\Http\Controllers\LogbookController;
use Modules\Clinical\Http\Controllers\PreceptorController;
use Modules\Clinical\Http\Controllers\SkillChecklistController;

Route::middleware('auth:sanctum')->prefix('v1/clinical')->group(function () {
    // Logbook CRUD — route statis WAJIB sebelum wildcard {id}
    Route::get('/logbooks', [LogbookController::class, 'index']);
    Route::post('/logbooks', [LogbookController::class, 'store']);
    Route::get('/logbooks/export', [LogbookController::class, 'export']);
    Route::post('/logbooks/batch-verify', [LogbookController::class, 'batchVerify']);
    Route::get('/logbooks/{id}', [LogbookController::class, 'show']);
    Route::post('/logbooks/{id}', [LogbookController::class, 'update']); // POST for multipart/form-data
    Route::delete('/logbooks/{id}', [LogbookController::class, 'destroy']);

    // Verification actions (Dodiknis)
    Route::patch('/logbooks/{id}/verify', [LogbookController::class, 'verify']);
    Route::patch('/logbooks/{id}/reject', [LogbookController::class, 'reject']);

    // Reference catalogs
    Route::get('/procedures', [CatalogController::class, 'procedures']);
    Route::get('/diagnoses', [CatalogController::class, 'diagnoses']);

    // Preceptor Dashboard
    Route::get('/preceptor/dashboard-stats', [PreceptorController::class, 'dashboardStats']);

    // Progres kompetensi (target vs capaian; scoping per-peran di controller)
    Route::get('/competency-progress', [CompetencyProgressController::class, 'index']);

    // Skill checklist per stase
    Route::get('/skills/items', [SkillChecklistController::class, 'items']);
    Route::get('/skills/progress', [SkillChecklistController::class, 'progress']);

    // Template item = data master stase
    Route::middleware('permission:manage-stase')->group(function () {
        Route::post('/skills/items', [SkillChecklistController::class, 'storeItem']);
        Route::put('/skills/items/{id}', [SkillChecklistController::class, 'updateItem']);
        Route::delete('/skills/items/{id}', [SkillChecklistController::class, 'destroyItem']);
    });

    // Observasi skill oleh Dodiknis (scoping RS di controller) / admin penilai
    Route::middleware('permission:create-assessments')->group(function () {
        Route::post('/skills/assess', [SkillChecklistController::class, 'assess']);
    });
});
