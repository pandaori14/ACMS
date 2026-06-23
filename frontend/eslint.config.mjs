import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    // Burn-down `any` SELESAI (0 tersisa). Rule dinaikkan ke ERROR agar `any`
    // eksplisit baru gagal di CI. Tipe domain bersama: src/lib/types.ts;
    // util error/settings: src/lib/api-helpers.ts.
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // Binding catch tak-terpakai diabaikan (umum di TS: error sering di-narrow ulang);
      // argumen/var berawalan _ sengaja dibiarkan (konvensi "intentionally unused").
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrors: "none",
      }],
      // Semua <img> di proyek ini adalah logo/gambar UNGGAHAN dinamis dari backend
      // (host runtime bervariasi + rasio tak tetap) sehingga next/image kurang cocok
      // (butuh remotePatterns per-host + dimensi tetap). Rule dimatikan secara sadar.
      "@next/next/no-img-element": "off",
    },
  },
  {
    // File Cypress sah memakai augmentasi `namespace Cypress` untuk custom command.
    files: ["cypress/**/*.{ts,js}", "cypress.config.ts"],
    rules: {
      "@typescript-eslint/no-namespace": "off",
    },
  },
];

export default eslintConfig;
