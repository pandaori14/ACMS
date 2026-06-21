<?php

use Illuminate\Support\Facades\Route;
use Modules\Finance\Http\Controllers\Api\BillingController;
use Modules\Finance\Http\Controllers\Api\HonorariumController;

Route::middleware('auth:sanctum')->prefix('v1/finance')->group(function () {
    Route::get('/billings', [BillingController::class, 'index']);
    Route::get('/billings/export', [BillingController::class, 'export']);
    Route::post('/billings/generate', [BillingController::class, 'generateForPeriod']);
    Route::put('/billings/{id}/status', [BillingController::class, 'updateStatus']);

    Route::get('/honorariums', [HonorariumController::class, 'index']);
    Route::post('/honorariums/generate', [HonorariumController::class, 'generateForPeriod']);
    Route::put('/honorariums/{id}/status', [HonorariumController::class, 'updateStatus']);
});
