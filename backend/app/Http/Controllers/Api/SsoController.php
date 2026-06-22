<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
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

        // Return the URL so the frontend can redirect the user
        // Using stateless() because API is stateless and doesn't use session cookies for state
        $url = Socialite::driver($provider)->stateless()->redirect()->getTargetUrl();

        return response()->json(['url' => $url]);
    }

    /**
     * Obtain the user information from the provider.
     */
    public function callback(Request $request)
    {
        $this->checkSsoEnabled();

        $provider = $request->query('provider', 'google');

        try {
            // Because frontend handles the redirect back, we get the code and hit this API endpoint
            // We use stateless() to ignore session state verification
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

            // Generate token
            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'Login successful',
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->roles->pluck('name'),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Authentication failed',
            ], 401);
        }
    }
}
