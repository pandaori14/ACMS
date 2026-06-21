<?php

use Illuminate\Support\Facades\Route;
use Modules\Incident\Http\Controllers\IncidentController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('incidents', IncidentController::class)->names('incident');
});
