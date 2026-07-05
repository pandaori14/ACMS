<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class SsoController extends Controller
{
    private function checkSsoEnabled()
    {
        $enabled = Setting::getValue('enable_google_sso');
        if ($enabled === 'false' || $enabled === false || $enabled === '0' || $enabled === 0) {
            abort(403, 'SSO login is currently disabled by administrator.');
        }
    }

    private function validateDomain($email)
    {
        $allowedDomainsStr = Setting::getValue('sso_allowed_domains');
        if (! empty(trim($allowedDomainsStr))) {
            $allowedDomains = array_map('trim', explode(',', strtolower($allowedDomainsStr)));
            $emailDomain = strtolower(substr(strrchr($email, '@'), 1));

            if (! in_array($emailDomain, $allowedDomains)) {
                abort(403, "Login denied: Domain @{$emailDomain} is not permitted. Allowed domains: ".implode(', ', $allowedDomains));
            }
        }
    }

    /**
     * Redirect the user to the provider authentication page.
     */
    public function redirect(Request $request)
    {
        $this->checkSsoEnabled();

        $provider = $request->query('provider', 'google');

        // Anti-CSRF OAuth: state acak diikat ke SESSION pemanggil (XHR SPA
        // same-origin membawa cookie session di redirect maupun callback).
        if (! $request->hasSession()) {
            return response()->json(['message' => 'Sesi tidak tersedia. Muat ulang halaman login lalu coba lagi.'], 400);
        }
        $state = Str::random(40);
        $request->session()->put('sso_state', $state);

        $url = Socialite::driver($provider)
            ->stateless()
            ->with(['state' => $state])
            ->redirect()
            ->getTargetUrl();

        return response()->json(['url' => $url]);
    }

    /**
     * Obtain the user information from the provider.
     */
    public function callback(Request $request)
    {
        $this->checkSsoEnabled();

        $provider = $request->query('provider', 'google');

        // Verifikasi state (CSRF OAuth): harus sama dengan yang disimpan
        // di session saat redirect. pull() = sekali pakai.
        $expectedState = $request->hasSession() ? $request->session()->pull('sso_state') : null;
        $returnedState = (string) $request->query('state', '');
        if (! $expectedState || ! hash_equals($expectedState, $returnedState)) {
            return response()->json([
                'message' => 'Sesi SSO tidak valid atau kedaluwarsa. Silakan ulangi login.',
            ], 403);
        }

        try {
            // Frontend meneruskan code+state ke endpoint ini; pertukaran code
            // tetap stateless (state sudah kita verifikasi manual di atas).
            $socialUser = Socialite::driver($provider)->stateless()->user();

            $this->validateDomain($socialUser->getEmail());

            // Find or create user
            $user = User::where('email', $socialUser->getEmail())->first();

            if (! $user) {
                // If user doesn't exist, create them
                $user = clone new User; // clone to avoid weird static issues
                $user->name = $socialUser->getName() ?? 'SSO User';
                $user->email = $socialUser->getEmail();
                // Random password since they use SSO
                $user->password = Hash::make(Str::random(24));
                $user->provider_name = $provider;
                $user->provider_id = $socialUser->getId();
                $user->save();

                // Assign default role (e.g., Mahasiswa)
                $user->assignRole('Mahasiswa');
            } else {
                // Update their provider details if they just linked it
                if (! $user->provider_name) {
                    $user->provider_name = $provider;
                    $user->provider_id = $socialUser->getId();
                    $user->save();
                }
            }

            // Login berbasis SESSION — konsisten dgn login password (SPA
            // axios hanya membawa cookie; Bearer token lama tak pernah dipakai).
            Auth::login($user);
            $request->session()->regenerate();

            return response()->json([
                'message' => 'Login successful',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->getRoleNames(),
                    'permissions' => $user->getAllPermissions()->pluck('name'),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Authentication failed',
            ], 401);
        }
    }
}
