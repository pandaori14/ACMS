<?php

namespace App\Notifications;

use App\Models\Setting;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/**
 * Pengumuman broadcast: selalu masuk lonceng in-app; email menyertai bila
 * Settings `enable_email_broadcasts` aktif. Queued agar kiriman massal
 * tidak memblokir request.
 */
class BroadcastAnnouncement extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $subject,
        public string $body
    ) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if (Setting::getValue('enable_email_broadcasts', 'true') === 'true' && ! empty($notifiable->email)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject($this->subject)
            ->greeting('Halo '.($notifiable->name ?? ''))
            ->line($this->body)
            ->salutation('— Sistem ACMS FK UMS');
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->subject,
            'message' => Str::limit($this->body, 200),
            'url' => '/dashboard/notifications',
            'type' => 'info',
        ];
    }
}
