<?php

use Illuminate\Support\Facades\Route;
use Modules\Examination\Http\Controllers\CbtController;
use Modules\Examination\Http\Controllers\ExaminationController;
use Modules\Examination\Http\Controllers\QuestionBankController;
use Modules\Examination\Http\Controllers\UkmppdController;

Route::middleware('auth:sanctum')->prefix('v1/examinations')->group(function () {
    // Baca: peserta/penguji/admin (scoping per-peran di controller)
    Route::get('/', [ExaminationController::class, 'index']);

    // ── Route STATIS wajib sebelum wildcard {id} ──
    // UKMPPD milik sendiri (admin boleh ?student_id — dicek di controller)
    Route::get('/ukmppd/my', [UkmppdController::class, 'my']);

    // Bank soal reusable + tracking UKMPPD (admin ujian)
    Route::middleware('permission:manage-examinations')->group(function () {
        Route::get('/question-bank', [QuestionBankController::class, 'index']);
        Route::post('/question-bank', [QuestionBankController::class, 'store']);
        Route::get('/question-bank/import-template', [QuestionBankController::class, 'importTemplate']);
        Route::post('/question-bank/import', [QuestionBankController::class, 'import']);
        Route::put('/question-bank/{id}', [QuestionBankController::class, 'update']);
        Route::delete('/question-bank/{id}', [QuestionBankController::class, 'destroy']);

        Route::get('/ukmppd', [UkmppdController::class, 'index']);
        Route::post('/ukmppd', [UkmppdController::class, 'store']);
        Route::put('/ukmppd/{id}', [UkmppdController::class, 'update']);
        Route::delete('/ukmppd/{id}', [UkmppdController::class, 'destroy']);
    });

    Route::get('/{id}', [ExaminationController::class, 'show']);
    Route::get('/{id}/pdf', [ExaminationController::class, 'exportPdf']);

    // Nilai: otorisasi penguji dicek inline di controller (assessor ujian ybs)
    Route::post('/{id}/scores', [ExaminationController::class, 'storeScore']);

    // CBT attempt mahasiswa (guard peserta terdaftar di CbtService)
    Route::get('/{id}/attempt', [CbtController::class, 'attemptState']);
    Route::post('/{id}/attempt/start', [CbtController::class, 'startAttempt']);
    Route::post('/{id}/attempt/answer', [CbtController::class, 'saveAnswer']);
    Route::post('/{id}/attempt/submit', [CbtController::class, 'submitAttempt']);

    // Mutasi ujian = admin ujian (Aturan A)
    Route::middleware('permission:manage-examinations')->group(function () {
        Route::post('/', [ExaminationController::class, 'store']);
        Route::put('/{id}', [ExaminationController::class, 'update']);
        Route::delete('/{id}', [ExaminationController::class, 'destroy']);

        Route::post('/{id}/participants', [ExaminationController::class, 'assignParticipant']);
        Route::delete('/{id}/participants/{participantId}', [ExaminationController::class, 'removeParticipant']);
        Route::post('/{id}/assessors', [ExaminationController::class, 'assignAssessor']);
        Route::delete('/{id}/assessors/{assessorId}', [ExaminationController::class, 'removeAssessor']);
        Route::post('/{id}/stations', [ExaminationController::class, 'addStation']);
        Route::delete('/{id}/stations/{stationId}', [ExaminationController::class, 'removeStation']);
        Route::patch('/{id}/status', [ExaminationController::class, 'changeStatus']);

        // Bank soal CBT (per-ujian)
        Route::get('/{id}/questions', [CbtController::class, 'questions']);
        Route::post('/{id}/questions', [CbtController::class, 'storeQuestion']);
        Route::post('/{id}/questions/from-bank', [QuestionBankController::class, 'copyToExam']);
        Route::put('/{id}/questions/{questionId}', [CbtController::class, 'updateQuestion']);
        Route::delete('/{id}/questions/{questionId}', [CbtController::class, 'destroyQuestion']);
    });
});
