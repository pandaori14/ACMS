<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckMaintenanceMode
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $isMaintenance = Setting::getValue('maintenance_mode', false);

        if ($isMaintenance) {
            // Allow if user is Super Admin
            $user = Auth::guard('sanctum')->user();
            if ($user && $user->hasRole('Super Admin')) {
                return $next($request);
            }

            // Also allow endpoints needed to login or fetch settings
            if ($request->is('api/login') || $request->is('api/settings') || $request->is('api/public-settings') || $request->is('api/user')) {
                return $next($request);
            }

            return response()->json([
                'error' => [
                    'code' => 'MAINTENANCE_MODE',
                    'message' => 'Sistem sedang dalam Mode Perawatan (Maintenance). Silakan coba lagi nanti.',
                ],
            ], 503);
        }

        return $next($request);
    }
}
