"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";

/**
 * Singleton Laravel Echo untuk notifikasi realtime via Reverb.
 * AMAN & OPSIONAL: bila env Reverb tak diisi, getEcho() mengembalikan null →
 * pemanggil (NotificationBell) diam-diam melewati realtime dan tetap memakai
 * polling 60 dtk sebagai fallback. Tak ada error walau Reverb mati.
 */

type EchoInstance = InstanceType<typeof Echo>;

let echoInstance: EchoInstance | null | undefined;

const backendUrl = () =>
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export function getEcho(): EchoInstance | null {
  if (echoInstance !== undefined) return echoInstance;

  const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY;
  if (typeof window === "undefined" || !key) {
    echoInstance = null; // tak dikonfigurasi → fallback polling
    return null;
  }

  try {
    // laravel-echo v2 memerlukan Pusher global untuk broadcaster 'reverb'.
    (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

    echoInstance = new Echo({
      broadcaster: "reverb",
      key,
      wsHost: process.env.NEXT_PUBLIC_REVERB_HOST || window.location.hostname,
      wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
      wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 443),
      forceTLS: (process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http") === "https",
      enabledTransports: ["ws", "wss"],
      // Otorisasi channel privat lewat session Sanctum (cookie SPA).
      authEndpoint: `${backendUrl()}/broadcasting/auth`,
      withCredentials: true,
    });
  } catch (err) {
    console.warn("Echo/Reverb tidak aktif:", err);
    echoInstance = null;
  }

  return echoInstance;
}
