import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  basePath: '/acms',
  // Output ramping untuk container (hanya file yang dibutuhkan runtime).
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/acms',
        basePath: false,
        permanent: false,
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

// Sentry membungkus config untuk instrumentasi runtime. Tanpa authToken/org,
// upload source map DILEWATI (dorman) — build tetap bersih; SDK aktif hanya
// saat DSN diisi (lihat sentry.*.config.ts & instrumentation*.ts).
export default withSentryConfig(nextConfig, {
  silent: true,
  // org/project/authToken sengaja dikosongkan → tak ada upload source map.
});
