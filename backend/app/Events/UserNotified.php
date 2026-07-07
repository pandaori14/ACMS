<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Sinyal realtime "ada notifikasi baru" ke channel privat milik user.
 * ShouldBroadcast (QUEUED) — enqueue di request tanpa menyentuh Reverb, jadi
 * status Reverb TIDAK PERNAH memblokir/merusak aksi pengguna. Worker yang
 * mengirim ke Reverb; bila Reverb mati → failed_jobs (terisolasi). Frontend
 * memakainya sebagai pemicu refetch; polling 60 dtk tetap jadi fallback.
 */
class UserNotified implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public string $userId,
        public array $payload = []
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('App.Models.User.'.$this->userId);
    }

    /** Echo mendengarkan `.notification`. */
    public function broadcastAs(): string
    {
        return 'notification';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
