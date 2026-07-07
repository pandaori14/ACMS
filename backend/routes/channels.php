<?php

use Illuminate\Support\Facades\Broadcast;

// ID user = UUID (string). JANGAN cast (int) — semua UUID jadi 0 → otorisasi
// bocor (siapa pun bisa mendengar channel siapa pun). Bandingkan sebagai string.
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (string) $user->id === (string) $id;
});
