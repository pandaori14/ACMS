<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

/**
 * Notifikasi in-app saat ada laporan insiden baru.
 *
 * Channel: database saja (sinkron, tanpa queue) agar langsung tampil di
 * NotificationBell / halaman Notifikasi meskipun worker queue tidak berjalan.
 */
class NewIncidentNotification extends Notification
{
    public function __construct(private readonly array $payload) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->payload['title'] ?? 'Laporan Insiden Baru',
            'message' => $this->payload['message'] ?? 'Ada laporan insiden baru yang perlu ditindaklanjuti.',
            'url' => $this->payload['url'] ?? '/dashboard/incidents',
            'type' => $this->payload['type'] ?? 'warning',
        ];
    }
}
