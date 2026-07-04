<?php

use Illuminate\Support\Facades\Route;
use Modules\Finance\Http\Controllers\Api\BillingController;
use Modules\Finance\Http\Controllers\Api\HonorariumController;

Route::middleware('auth:sanctum')->prefix('v1/finance')->group(function () {
    // Honorarium: Dodiknis boleh melihat MILIKNYA sendiri (scoping di controller)
    Route::get('/honorariums', [HonorariumController::class, 'index']);

    // Semua tagihan RS + mutasi keuangan = permission manage-finance (Aturan A)
    Route::middleware('permission:manage-finance')->group(function () {
        Route::get('/billings', [BillingController::class, 'index']);
        Route::get('/billings/export', [BillingController::class, 'export']);
        Route::post('/billings/generate', [BillingController::class, 'generateForPeriod']);
        Route::put('/billings/{id}/status', [BillingController::class, 'updateStatus']);
        Route::post('/billings/{id}/payment', [BillingController::class, 'recordPayment']);
        Route::get('/billings/{id}/invoice', [BillingController::class, 'invoice']);

        Route::post('/honorariums/generate', [HonorariumController::class, 'generateForPeriod']);
        Route::put('/honorariums/{id}/status', [HonorariumController::class, 'updateStatus']);
        Route::post('/honorariums/{id}/payment', [HonorariumController::class, 'recordPayment']);
    });
});
