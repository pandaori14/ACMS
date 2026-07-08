import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export const SUPPORTED_LOCALES = ["id", "en"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "id";
export const LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * Katalog i18n dipecah agar konversi bisa paralel & terkelola:
 *  - `messages/<locale>.json`      : chrome bersama (common, header, auth, nav, dll) + halaman umum.
 *  - `messages/<locale>/<domain>.json` : namespace per-domain (academic, clinical, ...).
 * Semua digabung di sini menjadi satu objek messages (namespace top-level unik per file).
 */
const DOMAIN_FILES = [
  "academic",
  "clinical",
  "assessment",
  "examination",
  "rotation",
  "yudisium",
  "finance",
  "incident",
  "analytics",
  "settings",
] as const;

/**
 * i18n tanpa prefix URL: locale ditentukan cookie NEXT_LOCALE (default 'id'),
 * sehingga route /acms/... tetap sama untuk kedua bahasa.
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale: AppLocale = SUPPORTED_LOCALES.includes(cookieLocale as AppLocale)
    ? (cookieLocale as AppLocale)
    : DEFAULT_LOCALE;

  const base = (await import(`../messages/${locale}.json`)).default;
  const domainMessages = await Promise.all(
    DOMAIN_FILES.map((domain) =>
      import(`../messages/${locale}/${domain}.json`)
        .then((mod) => mod.default as Record<string, unknown>)
        .catch(() => ({}) as Record<string, unknown>)
    )
  );

  return {
    locale,
    messages: Object.assign({}, base, ...domainMessages),
  };
});
