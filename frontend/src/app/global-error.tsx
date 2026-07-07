"use client";

// Global error boundary App Router — melaporkan error render React ke Sentry
// (dorman bila DSN kosong). Menampilkan pesan minimal & tombol muat ulang.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          margin: 0,
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Terjadi kesalahan
          </h1>
          <p style={{ fontSize: 14, color: "#475569", marginBottom: 20 }}>
            Maaf, ada gangguan tak terduga. Coba muat ulang halaman.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: "#1e3a8a",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Muat Ulang
          </button>
        </div>
      </body>
    </html>
  );
}
