<?php

use Illuminate\Support\Facades\Route;
use Modules\Clinical\Http\Controllers\CatalogController;
use Modules\Clinical\Http\Controllers\LogbookController;
use Modules\Clinical\Http\Controllers\PreceptorController;

Route::middleware('auth:sanctum')->prefix('v1/clinical')->group(function () {
    // Logbook CRUD
    Route::get('/logbooks', [LogbookController::class, 'index']);
    Route::post('/logbooks', [LogbookController::class, 'store']);
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
});
