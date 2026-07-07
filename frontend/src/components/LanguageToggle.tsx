"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LOCALES = [
  { code: "id", labelKey: "indonesian" as const },
  { code: "en", labelKey: "english" as const },
];

/**
 * Pengganti bahasa: menulis cookie NEXT_LOCALE lalu refresh (Server Components
 * membaca ulang locale dari cookie — tanpa mengubah URL). Lihat i18n/request.ts.
 */
export function LanguageToggle() {
  const t = useTranslations("header");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const setLocale = (code: string) => {
    if (code === locale) return;
    // Cookie non-HttpOnly agar bisa di-set dari klien; berlaku 1 tahun, seluruh /acms.
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("language")}
        disabled={isPending}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "outline-none")}
      >
        <Languages className="h-4 w-4" />
        <span className="ml-1 text-xs font-medium uppercase">{locale}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLocale(l.code)}
            className={l.code === locale ? "font-semibold text-primary" : ""}
          >
            {t(l.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
