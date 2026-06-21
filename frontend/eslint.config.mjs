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
    // Utang teknis pre-existing: `any` eksplisit tersebar di file lama.
    // Sementara dijadikan WARNING (bukan error) agar CI dapat gate pada tsc + build
    // + error lain, sambil burn-down `any` bertahap per-modul. Kode baru tetap hindari `any`.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
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
