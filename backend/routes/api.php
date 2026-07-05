<?php

use App\Http\Controllers\Api\AiAssistantController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExecutiveAnalyticsController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\Api\RolePermissionController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\SsoController;
use App\Http\Controllers\Api\SystemReferenceController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Modules\Assessment\Http\Controllers\YudisiumController;
use Modules\Auth\Http\Controllers\AuthController;

Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/sso/redirect', [SsoController::class, 'redirect']);
Route::get('/sso/callback', [SsoController::class, 'callback']);

Route::get('/public-settings', [SettingController::class, 'publicSettings']);
Route::get('/public-stats', [SettingController::class, 'publicStats']);

// Verifikasi keaslian dokumen resmi (dipindai dari QR — TANPA login)
Route::get('/public/verify-document/{code}', [YudisiumController::class, 'verify']);

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->prefix('v1/notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index']);
    Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    Route::post('/{id}/read', [NotificationController::class, 'markAsRead']);
});

// AI Assistant — HANYA Super Admin (LLM OpenAI-compatible + tool-calling ber-whitelist)
Route::middleware(['auth:sanctum', 'role:Super Admin'])->prefix('ai-assistant')->group(function () {
    Route::get('/status', [AiAssistantController::class, 'status']);
    Route::post('/chat', [AiAssistantController::class, 'chat']);
});

// Audit Trail (read-only) — Super Admin global, Kaprodi scoped to own program
Route::middleware(['auth:sanctum', 'permission:view-audit-logs'])
    ->prefix('v1/audit-logs')
    ->group(function () {
        Route::get('/', [AuditLogController::class, 'index']);
        Route::get('/{auditLog}', [AuditLogController::class, 'show']);
    });

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Dashboard Stats
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    // Analytics
    Route::get('/analytics', [AnalyticsController::class, 'index']);

    // Dashboard Eksekutif (4 pilar KPI) — Aturan A
    Route::get('/v1/analytics/executive', [ExecutiveAnalyticsController::class, 'index'])
        ->middleware('permission:view-executive-analytics');

    // Exports — path kanonik v1 (dipakai frontend) + alias lama
    Route::get('/v1/export/transcript/{studentId}', [ExportController::class, 'exportTranscriptPdf'])
        ->middleware('permission:view-transcripts');
    Route::get('/export/transcript/{studentId}', [ExportController::class, 'exportTranscriptPdf'])
        ->middleware('permission:view-transcripts');
    Route::get('/export/billings', [ExportController::class, 'exportBillingExcel'])
        ->middleware('permission:manage-finance');

    // Core
    Route::middleware('permission:manage-users')->group(function () {
        Route::get('users/import-template', [UserController::class, 'importTemplate']);
        Route::post('users/import', [UserController::class, 'import']);
        Route::get('users-roles', [UserController::class, 'roles']);
    });
    Route::apiResource('users', UserController::class)->middleware('permission:manage-users');

    // Referensi aktif per kategori (read-only, semua user login) — untuk dropdown form
    Route::get('/references/{category}', [SystemReferenceController::class, 'byCategory']);

    // Settings & Master Data (Protected by manage-settings)
    Route::middleware('permission:manage-settings')->group(function () {
        Route::apiResource('system-references', SystemReferenceController::class);
        Route::get('/settings', [SettingController::class, 'index']);
        Route::post('/settings', [SettingController::class, 'update']);
        Route::get('/role-permissions', [RolePermissionController::class, 'index']);
        Route::post('/role-permissions/{roleId}/sync', [RolePermissionController::class, 'sync']);
    });
});
