<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID', 'dummy_google_client_id'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET', 'dummy_google_client_secret'),
        'redirect' => env('GOOGLE_REDIRECT_URI', 'http://localhost:3000/sso-callback'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // AI Assistant (Super Admin) — endpoint OpenAI-compatible (NVIDIA NIM / Ollama).
    // Dipakai sebagai fallback bila setting di DB (grup ai_assistant) kosong.
    'ai' => [
        'enabled' => env('AI_ENABLED', false),
        'base_url' => env('AI_BASE_URL', 'https://integrate.api.nvidia.com/v1'),
        'model' => env('AI_MODEL', 'meta/llama-3.1-8b-instruct'),
        'api_key' => env('AI_API_KEY'),
        'timeout' => (int) env('AI_TIMEOUT', 60),
        'max_tokens' => (int) env('AI_MAX_TOKENS', 4096),
    ],

];
