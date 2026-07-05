"use client";

import { useEffect } from "react";

/**
 * Registrasi service worker PWA — hanya di produksi (HTTPS) agar
 * pengembangan lokal tidak terganggu cache.
 */
export function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    navigator.serviceWorker
      .register("/acms/sw.js", { scope: "/acms/" })
      .catch((err) => console.warn("SW registration failed:", err));
  }, []);

  return null;
}
