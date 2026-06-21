<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewAssessmentNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $assessmentData;

    /**
     * Create a new notification instance.
     */
    public function __construct(array $assessmentData)
    {
        $this->assessmentData = $assessmentData;
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
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->line('The introduction to the notification.')
            ->action('Notification Action', url('/'))
            ->line('Thank you for using our application!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->assessmentData['title'] ?? 'Assessment Baru',
            'message' => $this->assessmentData['message'] ?? 'Anda memiliki jadwal assessment baru.',
            'url' => $this->assessmentData['url'] ?? '/dashboard/clinical/assessments',
            'type' => $this->assessmentData['type'] ?? 'info', // info, warning, success
        ];
    }
}
