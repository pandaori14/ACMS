<?php

namespace Modules\Auth\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

class AuthController extends Controller
{
    /**
     * Maksimal percobaan login gagal sebelum dikunci sementara (anti brute-force).
     */
    private const MAX_LOGIN_ATTEMPTS = 6;

    /**
     * Handle an authentication attempt.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        // Rate limiting anti brute-force (per email + IP). Pola gold-standard
        // Laravel — diterapkan di controller agar andal lintas konfigurasi modul.
        $throttleKey = Str::lower($request->input('email')).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, self::MAX_LOGIN_ATTEMPTS)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            return response()->json([
                'message' => "Terlalu banyak percobaan login. Silakan coba lagi dalam {$seconds} detik.",
            ], 429);
        }

        if (Auth::attempt($credentials)) {
            RateLimiter::clear($throttleKey);

            /** @var User $user */
            $user = Auth::user();

            // Gerbang 2FA: kredensial valid TAPI login ditunda sampai kode benar
            if ($user->two_factor_confirmed_at) {
                Auth::logout();
                $request->session()->put('two_factor_user_id', $user->id);
                $request->session()->regenerate();

                return response()->json([
                    'two_factor_required' => true,
                    'message' => 'Masukkan kode dari aplikasi authenticator Anda.',
                ]);
            }

            $request->session()->regenerate();

            return response()->json([
                'message' => 'Login successful',
                'user' => $this->userPayload($user),
            ]);
        }

        RateLimiter::hit($throttleKey, 60);

        throw ValidationException::withMessages([
            'email' => __('auth.failed'),
        ]);
    }

    /**
     * Log the user out of the application.
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logout successful',
        ]);
    }

    /**
     * Get the authenticated User.
     */
    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'user' => $this->userPayload($user),
        ]);
    }

    /**
     * Payload user seragam untuk login/me (+status 2FA & kewajiban lunak).
     */
    private function userPayload(User $user): array
    {
        // enforce_2fa MODE LUNAK: peran admin diminta (bukan diblokir)
        // mengaktifkan 2FA — frontend menampilkan banner peringatan.
        $enforce = Setting::getValue('enforce_2fa');
        $enforceOn = in_array($enforce, ['true', '1', 1, true], true);
        $isPrivileged = $user->hasAnyRole(['Super Admin', 'Admin Prodi', 'Kaprodi', 'Keuangan']);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'two_factor_enabled' => (bool) $user->two_factor_confirmed_at,
            'must_enable_2fa' => $enforceOn && $isPrivileged && ! $user->two_factor_confirmed_at,
        ];
    }

    /**
     * Langkah 2 login: verifikasi kode TOTP atau recovery code (sekali pakai).
     */
    public function twoFactorChallenge(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'nullable|digits:6',
            'recovery_code' => 'nullable|string|max:20',
        ]);

        // Rate-limit: 5 percobaan/menit per session+IP
        $throttleKey = 'twofactor|'.$request->session()->getId().'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            return response()->json(['message' => 'Terlalu banyak percobaan. Tunggu sebentar.'], 429);
        }
        RateLimiter::hit($throttleKey, 60);

        $userId = $request->session()->get('two_factor_user_id');
        $user = $userId ? User::find($userId) : null;

        if (! $user || ! $user->two_factor_confirmed_at) {
            return response()->json(['message' => 'Sesi login tidak valid. Silakan login ulang.'], 422);
        }

        $verified = false;

        if ($request->filled('code')) {
            $secret = Crypt::decryptString($user->two_factor_secret);
            $verified = app(Google2FA::class)
                ->verifyKey($secret, $request->input('code'), 1);
        } elseif ($request->filled('recovery_code')) {
            $codes = json_decode(
                Crypt::decryptString($user->two_factor_recovery_codes ?? ''),
                true
            ) ?: [];
            $input = strtoupper(trim($request->input('recovery_code')));

            if (in_array($input, $codes, true)) {
                $verified = true;
                // Sekali pakai — buang dari daftar
                $remaining = array_values(array_diff($codes, [$input]));
                $user->forceFill([
                    'two_factor_recovery_codes' => Crypt::encryptString(json_encode($remaining)),
                ])->save();
            }
        }

        if (! $verified) {
            return response()->json(['message' => 'Kode tidak valid.'], 422);
        }

        RateLimiter::clear($throttleKey);
        $request->session()->forget('two_factor_user_id');
        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Login successful',
            'user' => $this->userPayload($user),
        ]);
    }

    /**
     * Kirim tautan reset password (self-service).
     * Respons SELALU generik 200 — jangan bocorkan email terdaftar/tidak.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        // Rate limit ketat: 3 permintaan / 10 menit per email+IP (via
        // RateLimiter controller — throttle middleware tak menempel di modul).
        $throttleKey = 'forgot|'.Str::lower($request->input('email')).'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($throttleKey, 3)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            return response()->json([
                'message' => "Terlalu banyak permintaan. Coba lagi dalam {$seconds} detik.",
            ], 429);
        }
        RateLimiter::hit($throttleKey, 600);

        $user = User::where('email', Str::lower($request->input('email')))->first();

        if ($user) {
            $token = Password::broker()->createToken($user);
            $link = url('/reset-password?token='.$token.'&email='.urlencode($user->email));

            NotificationService::sendDynamicEmail(
                $user->email,
                'Reset Password Akun ACMS',
                'email_template_reset',
                'reset_password',
                [
                    'name' => $user->name,
                    'link' => $link,
                ]
            );
        }

        return response()->json([
            'message' => 'Jika email terdaftar, tautan reset password telah dikirim. Silakan cek kotak masuk Anda.',
        ]);
    }

    /**
     * Setel password baru memakai token dari email.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.',
            ], 422);
        }

        return response()->json([
            'message' => 'Password berhasil diubah. Silakan login dengan password baru Anda.',
        ]);
    }

    /**
     * Ganti password sendiri (user sudah login).
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $request->user()->update([
            'password' => Hash::make($request->input('password')),
        ]);

        return response()->json([
            'message' => 'Password berhasil diganti.',
        ]);
    }

    /**
     * Perbarui profil sendiri (saat ini: nama).
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $user->update($validated);

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
            ],
        ]);
    }
}
