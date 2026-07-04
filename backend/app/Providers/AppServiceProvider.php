<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Super Admin lolos SEMUA cek permission/gate — termasuk permission
        // baru yang belum sempat di-sync ke rolenya. Return null (bukan false)
        // untuk peran lain agar pengecekan normal tetap berjalan.
        Gate::before(function ($user, string $ability) {
            return $user->hasRole('Super Admin') ? true : null;
        });
    }
}
