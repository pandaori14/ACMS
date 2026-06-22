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
