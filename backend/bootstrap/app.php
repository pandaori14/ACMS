<?php

use App\Http\Middleware\CheckMaintenanceMode;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->append(SecurityHeaders::class);
        $middleware->api(append: [
            CheckMaintenanceMode::class,
        ]);

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'throttle' => ThrottleRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Sentry menangkap unhandled exception (Laravel 12 tak lagi auto-capture).
        // DORMAN bila SENTRY_LARAVEL_DSN kosong — captureException jadi no-op,
        // tak ada trafik keluar & tak merusak boot. Aktif begitu DSN diisi.
        \Sentry\Laravel\Integration::handles($exceptions);

        // Semua error pada route API dikembalikan sebagai JSON terstandar
        // ({message} atau {message, errors}) — bukan HTML/redirect — apa pun
        // header Accept klien. Di produksi (APP_DEBUG=false) detail internal 500
        // otomatis disembunyikan oleh Laravel.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson()
        );
    })->create();
