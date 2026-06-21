<?php

namespace App\Providers;

use App\Models\Setting;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class DynamicConfigServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        try {
            if (Schema::hasTable('settings')) {
                // Apply timezone (affects now(), Carbon, timestamps display)
                $timezone = Setting::getValue('app_timezone');
                if ($timezone) {
                    Config::set('app.timezone', $timezone);
                    date_default_timezone_set($timezone);
                }

                // Apply session lifetime (makes session_timeout_minutes live)
                $sessionTimeout = Setting::getValue('session_timeout_minutes');
                if ($sessionTimeout) {
                    Config::set('session.lifetime', (int) $sessionTimeout);
                }

                // Apply SMTP Settings
                $smtpHost = Setting::getValue('smtp_host');
                if ($smtpHost) {
                    Config::set('mail.mailers.smtp.host', $smtpHost);
                    Config::set('mail.mailers.smtp.port', Setting::getValue('smtp_port', 2525));
                    Config::set('mail.mailers.smtp.encryption', Setting::getValue('smtp_encryption', 'tls'));
                    Config::set('mail.mailers.smtp.username', Setting::getValue('smtp_username'));
                    Config::set('mail.mailers.smtp.password', Setting::getValue('smtp_password'));

                    Config::set('mail.from.address', Setting::getValue('smtp_from_address', 'no-reply@acms.edu'));
                    Config::set('mail.from.name', Setting::getValue('smtp_from_name', 'ACMS System'));
                }

                // Apply OAuth (Google) Settings
                $googleClientId = Setting::getValue('google_client_id');
                if ($googleClientId) {
                    Config::set('services.google.client_id', $googleClientId);
                    Config::set('services.google.client_secret', Setting::getValue('google_client_secret'));
                    Config::set('services.google.redirect', Setting::getValue('google_redirect_url'));
                }
            }
        } catch (\Exception $e) {
            // Ignore during setup/migrations when settings table doesn't exist yet
        }
    }
}
