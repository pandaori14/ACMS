<?php

use Illuminate\Support\Facades\Route;
use Modules\Academic\Http\Controllers\AcademicCalendarController;
use Modules\Academic\Http\Controllers\CohortController;
use Modules\Academic\Http\Controllers\CompetencyController;
use Modules\Academic\Http\Controllers\FacultyController;
use Modules\Academic\Http\Controllers\ProgramController;
use Modules\Academic\Http\Controllers\StaseController;
use Modules\Academic\Http\Controllers\StudentController;

/*
|--------------------------------------------------------------------------
| Academic API Routes
|--------------------------------------------------------------------------
| Konvensi: modul domain berada di bawah prefix /api/v1/{modul}.
| Academic sebelumnya memakai /api/academic (tanpa versi) — kini distandarkan
| ke /api/v1/academic. Prefix lama dipertahankan sebagai ALIAS DEPRECATED agar
| pemanggil yang belum migrasi tetap berjalan; hapus setelah semua klien pindah.
|
| RBAC: endpoint baca dipakai lintas peran (rotasi, nilai, logbook) — cukup
| auth:sanctum. Semua MUTASI data master digating permission
| manage-academic-master (Aturan A CLAUDE.md).
*/
$registerAcademicRoutes = function () {
    // --- Baca (lintas peran) ---
    Route::get('/faculties', [FacultyController::class, 'index']);
    Route::get('/programs', [ProgramController::class, 'index']);
    Route::get('/cohorts', [CohortController::class, 'index']);
    Route::get('stase', [StaseController::class, 'index']);
    Route::get('stase/{stase}', [StaseController::class, 'show']);
    Route::get('competencies', [CompetencyController::class, 'index']);
    Route::get('competencies/{competency}', [CompetencyController::class, 'show']);
    Route::get('students', [StudentController::class, 'index']);
    Route::get('calendar', [AcademicCalendarController::class, 'index']);

    // --- Mutasi data master (admin akademik) ---
    Route::middleware('permission:manage-academic-master')->group(function () {
        Route::post('calendar', [AcademicCalendarController::class, 'store']);
        Route::put('calendar/{id}', [AcademicCalendarController::class, 'update']);
        Route::delete('calendar/{id}', [AcademicCalendarController::class, 'destroy']);
        Route::post('/faculties', [FacultyController::class, 'store']);
        Route::put('/faculties/{id}', [FacultyController::class, 'update']);
        Route::delete('/faculties/{id}', [FacultyController::class, 'destroy']);

        Route::post('/programs', [ProgramController::class, 'store']);
        Route::put('/programs/{id}', [ProgramController::class, 'update']);
        Route::delete('/programs/{id}', [ProgramController::class, 'destroy']);

        Route::post('/cohorts', [CohortController::class, 'store']);
        Route::get('/cohorts/{id}', [CohortController::class, 'show']);
        Route::put('/cohorts/{id}', [CohortController::class, 'update']);
        Route::delete('/cohorts/{id}', [CohortController::class, 'destroy']);

        Route::post('competencies', [CompetencyController::class, 'store']);
        Route::match(['put', 'patch'], 'competencies/{competency}', [CompetencyController::class, 'update']);
        Route::delete('competencies/{competency}', [CompetencyController::class, 'destroy']);

        Route::post('students', [StudentController::class, 'store']);
        Route::get('students/import-template', [StudentController::class, 'importTemplate']);
        Route::post('students/import', [StudentController::class, 'import']);
        Route::get('students/{id}', [StudentController::class, 'show']);
        Route::put('students/{id}', [StudentController::class, 'update']);
        Route::post('students/{id}/status', [StudentController::class, 'updateStatus']);
        Route::delete('students/{id}', [StudentController::class, 'destroy']);
    });

    // Mutasi stase punya permission sendiri (sesuai menu "Manajemen Stase").
    Route::middleware('permission:manage-stase')->group(function () {
        Route::post('stase', [StaseController::class, 'store']);
        Route::match(['put', 'patch'], 'stase/{stase}', [StaseController::class, 'update']);
        Route::delete('stase/{stase}', [StaseController::class, 'destroy']);
    });
};

// Kanonik (standar): /api/v1/academic/*
Route::middleware('auth:sanctum')->prefix('v1/academic')->group($registerAcademicRoutes);

// Alias deprecated (back-compat): /api/academic/* — jangan dipakai untuk kode baru.
Route::middleware('auth:sanctum')->prefix('academic')->group($registerAcademicRoutes);
