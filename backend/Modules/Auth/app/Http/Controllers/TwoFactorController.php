<?php

namespace Modules\Auth\Http\Controllers;

use App\Http\Controllers\Controller;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Writer\SvgWriter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

/**
 * Autentikasi Dua Faktor (TOTP) — aktivasi mandiri dari halaman profil:
 * enable (secret+QR+recovery codes) → confirm (kode 6 digit) → aktif.
 * Secret & recovery codes disimpan terenkripsi (Crypt), tidak pernah
 * ditampilkan ulang setelah setup.
 */
class TwoFactorController extends Controller
{
    public function __construct(private Google2FA $google2fa) {}

    /**
     * Mulai aktivasi: generate secret + QR (SVG, tanpa GD) + 8 recovery codes.
     * Belum aktif sampai dikonfirmasi dengan kode valid.
     */
    public function enable(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->two_factor_confirmed_at) {
            return response()->json(['message' => '2FA sudah aktif. Nonaktifkan dulu untuk setup ulang.'], 422);
        }

        $secret = $this->google2fa->generateSecretKey(32);
        $recoveryCodes = collect(range(1, 8))
            ->map(fn () => Str::upper(Str::random(5)).'-'.Str::upper(Str::random(5)))
            ->all();

        $user->forceFill([
            'two_factor_secret' => Crypt::encryptString($secret),
            'two_factor_recovery_codes' => Crypt::encryptString(json_encode($recoveryCodes)),
            'two_factor_confirmed_at' => null,
        ])->save();

        $otpauthUrl = $this->google2fa->getQRCodeUrl('ACMS FK UMS', $user->email, $secret);

        $qrDataUri = (new Builder(
            writer: new SvgWriter,
            data: $otpauthUrl,
            size: 200,
            margin: 8,
        ))->build()->getDataUri();

        return response()->json([
            'message' => 'Pindai QR dengan aplikasi authenticator, lalu konfirmasi dengan kode 6 digit.',
            'data' => [
                'qr_svg' => $qrDataUri,
                'secret' => $secret, // untuk input manual di authenticator
                'recovery_codes' => $recoveryCodes, // TAMPIL SEKALI — simpan baik-baik
            ],
        ]);
    }

    /**
     * Konfirmasi kode 6 digit → 2FA resmi aktif.
     */
    public function confirm(Request $request): JsonResponse
    {
        $request->validate(['code' => 'required|digits:6']);

        $user = $request->user();
        if (! $user->two_factor_secret) {
            return response()->json(['message' => 'Mulai aktivasi 2FA terlebih dahulu.'], 422);
        }

        $secret = Crypt::decryptString($user->two_factor_secret);

        if (! $this->google2fa->verifyKey($secret, $request->input('code'), 1)) {
            return response()->json(['message' => 'Kode salah atau kedaluwarsa. Coba lagi.'], 422);
        }

        $user->forceFill(['two_factor_confirmed_at' => now()])->save();

        return response()->json(['message' => 'Autentikasi dua faktor AKTIF. Login berikutnya akan meminta kode.']);
    }

    /**
     * Nonaktifkan 2FA (butuh password saat ini).
     */
    public function disable(Request $request): JsonResponse
    {
        $request->validate(['current_password' => 'required|current_password']);

        $request->user()->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        return response()->json(['message' => 'Autentikasi dua faktor dinonaktifkan.']);
    }
}
