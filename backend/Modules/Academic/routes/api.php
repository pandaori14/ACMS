<?php

use Illuminate\Support\Facades\Route;
use Modules\Academic\Http\Controllers\CompetencyController;
use Modules\Academic\Http\Controllers\FacultyController;
use Modules\Academic\Http\Controllers\ProgramController;
use Modules\Academic\Http\Controllers\StaseController;
use Modules\Academic\Http\Controllers\StudentController;

Route::middleware('auth:sanctum')->prefix('academic')->group(function () {
    Route::get('/faculties', [FacultyController::class, 'index']);
    Route::post('/faculties', [FacultyController::class, 'store']);

    Route::get('/programs', [ProgramController::class, 'index']);
    Route::post('/programs', [ProgramController::class, 'store']);

    Route::apiResource('stase', StaseController::class);
    Route::apiResource('competencies', CompetencyController::class);
    Route::get('students', [StudentController::class, 'index']);
});
