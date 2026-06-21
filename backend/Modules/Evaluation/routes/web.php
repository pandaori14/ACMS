<?php

use Illuminate\Support\Facades\Route;
use Modules\Evaluation\Http\Controllers\EvaluationController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('evaluations', EvaluationController::class)->names('evaluation');
});
