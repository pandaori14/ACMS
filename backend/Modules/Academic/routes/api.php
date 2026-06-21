<?php

use Illuminate\Support\Facades\Route;
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
*/
$registerAcademicRoutes = function () {
    Route::get('/faculties', [FacultyController::class, 'index']);
    Route::post('/faculties', [FacultyController::class, 'store']);

    Route::get('/programs', [ProgramController::class, 'index']);
    Route::post('/programs', [ProgramController::class, 'store']);

    Route::apiResource('stase', StaseController::class);
    Route::apiResource('competencies', CompetencyController::class);
    Route::get('students', [StudentController::class, 'index']);
};

// Kanonik (standar): /api/v1/academic/*
Route::middleware('auth:sanctum')->prefix('v1/academic')->group($registerAcademicRoutes);

// Alias deprecated (back-compat): /api/academic/* — jangan dipakai untuk kode baru.
Route::middleware('auth:sanctum')->prefix('academic')->group($registerAcademicRoutes);
