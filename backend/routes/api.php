<?php

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\Api\RolePermissionController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\SsoController;
use App\Http\Controllers\Api\SystemReferenceController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Modules\Auth\Http\Controllers\AuthController;

Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/sso/redirect', [SsoController::class, 'redirect']);
Route::get('/sso/callback', [SsoController::class, 'callback']);

Route::get('/public-settings', [SettingController::class, 'publicSettings']);

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->prefix('v1/notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index']);
    Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    Route::post('/{id}/read', [NotificationController::class, 'markAsRead']);
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

    // Exports
    Route::get('/export/transcript/{studentId}', [ExportController::class, 'exportTranscriptPdf']);
    Route::get('/export/billings', [ExportController::class, 'exportBillingExcel']);

    // Core
    Route::apiResource('users', UserController::class)->middleware('permission:manage-users');

    // Settings & Master Data (Protected by manage-settings)
    Route::middleware('permission:manage-settings')->group(function () {
        Route::apiResource('system-references', SystemReferenceController::class);
        Route::get('/settings', [SettingController::class, 'index']);
        Route::post('/settings', [SettingController::class, 'update']);
        Route::get('/role-permissions', [RolePermissionController::class, 'index']);
        Route::post('/role-permissions/{roleId}/sync', [RolePermissionController::class, 'sync']);
    });
});
