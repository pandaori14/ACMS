<?php

use Illuminate\Support\Facades\Route;
use Modules\Rotation\Http\Controllers\RotationController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('rotations', RotationController::class)->names('rotation');
});
