<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AiAssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use RuntimeException;

/**
 * Endpoint AI Assistant — HANYA Super Admin (gate di route: role:Super Admin).
 */
class AiAssistantController extends Controller
{
    public function __construct(private readonly AiAssistantService $ai) {}

    /** Status konfigurasi untuk UI (tanpa membocorkan key). */
    public function status(): JsonResponse
    {
        return response()->json(['data' => [
            'enabled' => $this->ai->isEnabled(),
            'configured' => $this->ai->isConfigured(),
            'model' => $this->ai->model(),
        ]]);
    }

    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:4000',
            'history' => 'nullable|array|max:20',
            'history.*.role' => 'required_with:history|string|in:user,assistant',
            'history.*.content' => 'required_with:history|string|max:8000',
        ]);

        // Rate limit per user (controller-based; middleware throttle tak selalu menempel).
        $key = 'ai-chat:'.$request->user()->id;
        if (RateLimiter::tooManyAttempts($key, 20)) {
            $seconds = RateLimiter::availableIn($key);

            return response()->json(['message' => "Terlalu banyak permintaan. Coba lagi dalam {$seconds} detik."], 429);
        }
        RateLimiter::hit($key, 60);

        try {
            $reply = $this->ai->chat($validated['message'], $validated['history'] ?? []);
        } catch (RuntimeException $e) {
            $status = $e->getCode();
            $status = ($status >= 400 && $status < 600) ? $status : 500;

            return response()->json(['message' => $e->getMessage()], $status);
        } catch (\Throwable $e) {
            Log::error('AI Assistant: error tak terduga', ['error' => $e->getMessage()]);

            return response()->json(['message' => 'Terjadi kesalahan internal pada AI Assistant.'], 500);
        }

        return response()->json(['data' => ['reply' => $reply]]);
    }
}
