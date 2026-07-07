// Inisialisasi Sentry sisi server (Node runtime). DORMAN bila DSN kosong:
// `enabled` false → SDK tak mengirim apa pun & tak memengaruhi runtime.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  sendDefaultPii: false,
});
