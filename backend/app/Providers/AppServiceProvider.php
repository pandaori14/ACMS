<?php

namespace App\Providers;

use App\Events\UserNotified;
use App\Models\User;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Support\Facades\Event;
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

        // Realtime: setiap notifikasi in-app (channel database) yang tersimpan
        // memicu UserNotified ke channel privat user → frontend refetch tanpa
        // tunggu polling. TIDAK menyentuh satu pun kelas notifikasi / call-site;
        // event queued sehingga status Reverb tak pernah memengaruhi request.
        Event::listen(function (NotificationSent $event) {
            if ($event->channel !== 'database' || ! $event->notifiable instanceof User) {
                return;
            }

            $data = is_array($event->response?->data ?? null) ? $event->response->data : [];

            UserNotified::dispatch((string) $event->notifiable->id, [
                'title' => $data['title'] ?? 'Notifikasi baru',
                'message' => $data['message'] ?? '',
            ]);
        });
    }
}
