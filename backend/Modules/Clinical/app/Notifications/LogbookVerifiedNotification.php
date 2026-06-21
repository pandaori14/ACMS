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
        $statusText = $this->logbook->status === 'verified' ? 'verified' : 'rejected';

        return [
            'title' => 'Logbook '.ucfirst($statusText),
            'message' => "Your logbook for {$this->logbook->stase->name} has been {$statusText} by your preceptor.",
            'url' => '/dashboard/clinical/logbooks',
            'type' => 'logbook_'.$statusText,
            'logbook_id' => $this->logbook->id,
        ];
    }
}
