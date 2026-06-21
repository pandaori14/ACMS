<?php

use Illuminate\Support\Facades\Route;
use Modules\Assessment\Http\Controllers\AssessmentController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('assessments', AssessmentController::class)->names('assessment');
});
