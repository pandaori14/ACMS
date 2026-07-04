<?php

namespace Modules\Clinical\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Modules\Clinical\Models\LogbookEntry;

class LogbookVerifiedNotification extends Notification implements ShouldQueue
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
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $isVerified = $this->logbook->status === 'verified';
        // LogbookEntry tidak punya relasi stase langsung — lewat rotationAssignment
        $staseName = $this->logbook->rotationAssignment?->stase?->name ?? 'stase Anda';

        return [
            'title' => $isVerified ? 'Logbook Diverifikasi' : 'Logbook Ditolak',
            'message' => $isVerified
                ? "Logbook Anda pada {$staseName} telah diverifikasi oleh pembimbing."
                : "Logbook Anda pada {$staseName} ditolak — silakan perbaiki dan ajukan ulang.",
            'url' => '/dashboard/clinical/logbooks',
            'type' => 'logbook_'.($isVerified ? 'verified' : 'rejected'),
            'logbook_id' => $this->logbook->id,
        ];
    }
}
