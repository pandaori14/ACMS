<?php

use Illuminate\Support\Facades\Route;
use Modules\Incident\Http\Controllers\ConsultationController;
use Modules\Incident\Http\Controllers\IncidentConfigController;
use Modules\Incident\Http\Controllers\IncidentReportController;

Route::middleware(['auth:sanctum'])->prefix('v1/incidents')->name('api.v1.incidents.')->group(function () {
    // Daftar & statistik: di-scope oleh service (manager = semua, pelapor = miliknya sendiri)
    Route::get('/', [IncidentReportController::class, 'index'])->name('index');
    Route::get('/form-options', [IncidentReportController::class, 'formOptions'])->name('formOptions');
    Route::get('/statistics', [IncidentReportController::class, 'statistics'])->name('statistics');
    // Ekspor PDF hanya utk pengelola (statistik JSON pelapor tetap ter-scope)
    Route::middleware('permission:manage-incidents')
        ->get('/statistics/export', [IncidentReportController::class, 'statisticsExport'])->name('statistics.export');
    Route::post('/report', [IncidentReportController::class, 'store'])->name('store');

    // Konfigurasi form insiden (CONFIGURE) — didaftarkan sebelum /{id} agar tidak tertangkap wildcard
    Route::middleware('permission:configure-incident-form')->group(function () {
        Route::get('/config', [IncidentConfigController::class, 'show'])->name('config.show');
        Route::put('/config', [IncidentConfigController::class, 'update'])->name('config.update');
    });

    Route::get('/{id}', [IncidentReportController::class, 'show'])->name('show');
    Route::get('/{id}/attachment', [IncidentReportController::class, 'downloadAttachment'])->name('attachment');

    // Aksi & data investigasi: khusus pengelola insiden
    Route::middleware('permission:manage-incidents')->group(function () {
        Route::patch('/{id}/status', [IncidentReportController::class, 'updateStatus'])->name('updateStatus');
        Route::get('/{id}/notes', [IncidentReportController::class, 'notes'])->name('notes');
        Route::post('/{id}/notes', [IncidentReportController::class, 'addNote'])->name('addNote');
    });
});

Route::middleware(['auth:sanctum'])->prefix('v1/consultations')->name('api.v1.consultations.')->group(function () {
    // Daftar di-scope oleh service (manager = semua, pengaju = miliknya sendiri)
    Route::get('/', [ConsultationController::class, 'index'])->name('index');
    Route::get('/form-options', [ConsultationController::class, 'formOptions'])->name('formOptions');
    Route::middleware('permission:submit-consultation')->post('/', [ConsultationController::class, 'store'])->name('store');
    Route::get('/{id}', [ConsultationController::class, 'show'])->name('show');
    Route::middleware('permission:manage-consultations')
        ->patch('/{id}/respond', [ConsultationController::class, 'respond'])->name('respond');
});
