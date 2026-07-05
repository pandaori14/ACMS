<?php

namespace Modules\Assessment\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Modules\Assessment\Models\GeneratedDocument;

class DocumentReadyNotification extends Notification
{
    use Queueable;

    public function __construct(protected GeneratedDocument $document) {}

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
            'title' => 'Dokumen Resmi Siap Diunduh',
            'message' => 'Transkrip resmi Anda telah selesai dibuat dan siap diunduh.',
            'url' => '/dashboard/documents',
            'type' => 'success',
        ];
    }
}
