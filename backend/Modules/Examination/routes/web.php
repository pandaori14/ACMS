<?php

use Illuminate\Support\Facades\Route;
use Modules\Examination\Http\Controllers\ExaminationController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('examinations', ExaminationController::class)->names('examination');
});
