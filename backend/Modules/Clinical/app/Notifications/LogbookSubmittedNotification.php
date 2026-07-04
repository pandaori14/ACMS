<?php

namespace Modules\Clinical\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Modules\Clinical\Models\LogbookEntry;

class LogbookSubmittedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $logbook;

    /**
     * Create a new notification instance.
     */
    public function __construct(LogbookEntry $logbook)
    {
        $this->logbook = $logbook;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database']; // Can add 'mail' later
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        // LogbookEntry tidak punya relasi stase langsung — lewat rotationAssignment
        $studentName = $this->logbook->student?->user?->name ?? 'Mahasiswa';
        $staseName = $this->logbook->rotationAssignment?->stase?->name ?? 'stase';

        return [
            'title' => 'Logbook Baru Menunggu Verifikasi',
            'message' => "{$studentName} mengajukan logbook baru pada {$staseName}.",
            'url' => '/dashboard/clinical/verification',
            'type' => 'logbook_submitted',
            'logbook_id' => $this->logbook->id,
        ];
    }
}
