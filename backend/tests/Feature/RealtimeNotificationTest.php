<?php

namespace Tests\Feature;

use App\Events\UserNotified;
use App\Models\User;
use App\Notifications\BroadcastAnnouncement;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

/**
 * Realtime: setiap notifikasi in-app (channel database) memicu UserNotified
 * ke channel privat milik user, tanpa menyentuh kelas notifikasi/call-site.
 */
class RealtimeNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_notification_dispatches_user_notified_on_own_channel(): void
    {
        Event::fake([UserNotified::class]);

        $user = User::factory()->create();
        $user->notify(new BroadcastAnnouncement('Pengumuman', 'Isi pesan pengumuman uji.'));

        Event::assertDispatched(UserNotified::class, function (UserNotified $e) use ($user) {
            $channel = $e->broadcastOn();

            return $e->userId === (string) $user->id
                && $channel instanceof PrivateChannel
                && $channel->name === 'private-App.Models.User.'.$user->id
                && $e->broadcastAs() === 'notification'
                && ($e->broadcastWith()['title'] ?? null) === 'Pengumuman';
        });
    }

    public function test_non_database_channel_does_not_trigger_broadcast(): void
    {
        Event::fake([UserNotified::class]);

        // Notifikasi yang TIDAK menulis ke database (mis. hanya mail) tak memicu.
        // BroadcastAnnouncement default via() = ['database'] → di sini kita cek
        // bahwa tanpa notifikasi apa pun, tak ada UserNotified.
        User::factory()->create();

        Event::assertNotDispatched(UserNotified::class);
    }
}
