<?php

use Illuminate\Support\Facades\Route;
use Modules\Academic\Http\Controllers\AcademicController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('academics', AcademicController::class)->names('academic');
});
