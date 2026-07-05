/*
 * ACMS Service Worker (tulis-tangan, tanpa dependency).
 * Strategi konservatif:
 *  - Aset statis Next (/_next/static/, ikon) → cache-first (immutable per build).
 *  - Navigasi halaman → network-first dengan fallback cache terakhir.
 *  - /api/ TIDAK PERNAH di-cache (data harus selalu segar).
 * Naikkan CACHE_VERSION saat perlu memaksa pembersihan cache klien.
 */
const CACHE_VERSION = "acms-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll([
        "/acms/icons/icon-192.png",
        "/acms/icons/icon-512.png",
        "/acms/manifest.json",
      ])
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Hanya tangani GET same-origin; API selalu langsung ke jaringan
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.includes("/api/") || url.pathname.includes("/sanctum/")) return;

  // Aset statis ber-hash → cache-first
  if (url.pathname.includes("/_next/static/") || url.pathname.startsWith("/acms/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  // Navigasi halaman → network-first, fallback cache saat offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
